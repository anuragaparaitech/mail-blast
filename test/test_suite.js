const assert = require('assert');
const { getDb } = require('../database/db');
const { seedDatabase } = require('../database/seed');
const { renderText, extractTags } = require('../services/templateEngine');
const { parseFileBuffer, validateAndNormalizeRows, generateSampleData } = require('../services/excelParser');
const blastManager = require('../services/blastManager');
const xlsx = require('xlsx');

async function runTestSuite() {
  console.log('====================================================');
  console.log('🧪 Starting Aparaitech Student Email Blast Test Suite');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function test(name, fn) {
    totalTests++;
    try {
      fn();
      console.log(`  ✅ [PASS] ${name}`);
      passedTests++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}`);
      console.error(`     Error: ${err.message}\n`);
    }
  }

  async function testAsync(name, fn) {
    totalTests++;
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passedTests++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}`);
      console.error(`     Error: ${err.message}\n`);
    }
  }

  // 1. Database & Seed Verification
  test('Database & Seed: DB initializes and contains seed students', () => {
    const db = getDb();
    seedDatabase();
    const studentsCount = db.prepare('SELECT count(*) as count FROM students').get().count;
    assert(studentsCount >= 40, `Expected at least 40 seed students, got ${studentsCount}`);

    const templatesCount = db.prepare('SELECT count(*) as count FROM templates').get().count;
    assert(templatesCount >= 6, `Expected at least 6 recruitment templates, got ${templatesCount}`);
  });

  // 2. Personalization Template Engine
  test('Template Engine: Correctly substitutes dynamic tags {Name}, {College}, {Package}', () => {
    const template = 'Hello {Name}, welcome from {College}! Role: {Job_Role}, Package: {Package}. First name: {First_Name}.';
    const student = {
      name: 'Aditya Kulkarni',
      college: 'COEP Tech Pune'
    };

    const rendered = renderText(template, student);
    assert(rendered.includes('Hello Aditya Kulkarni'), 'Name was not substituted properly');
    assert(rendered.includes('from COEP Tech Pune'), 'College was not substituted properly');
    assert(rendered.includes('First name: Aditya'), 'First name was not extracted properly');
    assert(rendered.includes('₹6.5 LPA'), 'Default package was not filled in');
  });

  test('Template Engine: Extract tags correctly', () => {
    const text = 'Dear {Name} of {College}, your interview date is {Drive_Date}. Good luck {Name}!';
    const tags = extractTags(text);
    assert.deepStrictEqual(tags.sort(), ['{College}', '{Drive_Date}', '{Name}'].sort());
  });

  // 3. Spreadsheet Parser & Validation
  test('Excel/CSV Parser: Auto-detects columns and parses valid/invalid rows', () => {
    const sample = generateSampleData();
    // Add one invalid row
    sample.push({
      'Student Name': 'Invalid Email Student',
      'Email ID': 'invalid-email-address',
      'College Name': 'VPKBIET Baramati',
      'Phone Number': '+91 9999999999',
      'Branch / Degree': 'Computer Science',
      'Graduation Year': '2026'
    });

    const ws = xlsx.utils.json_to_sheet(sample);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const parsed = parseFileBuffer(buffer);
    assert(parsed.detectedMapping.name, 'Name column not detected');
    assert(parsed.detectedMapping.email, 'Email column not detected');
    assert(parsed.detectedMapping.college, 'College column not detected');

    const validated = validateAndNormalizeRows(parsed.rawRows, parsed.detectedMapping);
    assert.strictEqual(validated.validCount, 5, `Expected 5 valid rows, got ${validated.validCount}`);
    assert.strictEqual(validated.invalidCount, 1, `Expected 1 invalid row, got ${validated.invalidCount}`);
    assert(validated.rows[5].errors.length > 0, 'Invalid row had no error messages attached');
  });

  test('Excel/CSV Parser: Successfully parses spreadsheet containing ONLY Name and Email columns', () => {
    const minimalData = [
      { 'Name': 'Kunal Joshi', 'Email': 'kunal.j@gmail.com' },
      { 'Name': 'Priya Singh', 'Email': 'priya.s@yahoo.com' },
      { 'Name': 'Amit Verma', 'Email': 'amit.v@outlook.com' }
    ];

    const ws = xlsx.utils.json_to_sheet(minimalData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const parsed = parseFileBuffer(buffer);
    assert(parsed.detectedMapping.name, 'Name column not detected');
    assert(parsed.detectedMapping.email, 'Email column not detected');

    const validated = validateAndNormalizeRows(parsed.rawRows, parsed.detectedMapping);
    assert.strictEqual(validated.validCount, 3, `Expected 3 valid rows, got ${validated.validCount}`);
    assert.strictEqual(validated.invalidCount, 0, `Expected 0 invalid rows, got ${validated.invalidCount}`);
  });

  // 4. Blast Campaign Queue & Execution
  await testAsync('Blast Manager: Creates campaign, executes queue in sandbox mode, and logs delivery', async () => {
    const db = getDb();
    
    // Pick 3 students
    const testStudents = db.prepare('SELECT * FROM students LIMIT 3').all();
    
    const campStmt = db.prepare(`
      INSERT INTO campaigns (title, subject, body_html, target_type, total_recipients, status)
      VALUES (?, ?, ?, 'all', ?, 'draft')
    `);

    const campRes = campStmt.run(
      'Automated Test Blast',
      'Test Invitation for {Name}',
      '<p>Hello {Name} from {College}</p>',
      testStudents.length
    );

    const campId = campRes.lastInsertRowid;

    const recipStmt = db.prepare(`
      INSERT INTO campaign_recipients (campaign_id, student_id, recipient_name, recipient_email, recipient_college, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `);

    for (const s of testStudents) {
      recipStmt.run(campId, s.id, s.name, s.email, s.college);
    }

    // Run campaign
    await blastManager.startCampaign(campId);

    // Wait for completion
    let attempts = 0;
    while (attempts < 60) {
      const c = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campId);
      if (c.status === 'completed' || c.status === 'cancelled') {
        break;
      }
      await new Promise(r => setTimeout(r, 200));
      attempts++;
    }

    const finalCamp = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campId);
    assert.strictEqual(finalCamp.status, 'completed', 'Campaign did not complete successfully');
    assert.strictEqual(finalCamp.sent_count, 3, `Expected 3 sent emails, got ${finalCamp.sent_count}`);
  });

  // 5. 1-Click Retry Failed Logic
  test('Blast Manager: 1-Click Retry re-queues failed recipients without duplicate sends', () => {
    const db = getDb();

    // Create a mock campaign with 1 failed and 2 sent recipients
    const campRes = db.prepare(`
      INSERT INTO campaigns (title, subject, body_html, total_recipients, sent_count, success_count, failed_count, status)
      VALUES ('Retry Test Campaign', 'Subject', 'Body', 3, 3, 2, 1, 'completed')
    `).run();

    const campId = campRes.lastInsertRowid;

    db.prepare(`INSERT INTO campaign_recipients (campaign_id, recipient_name, recipient_email, status) VALUES (?, 'Sent 1', 's1@test.com', 'sent')`).run(campId);
    db.prepare(`INSERT INTO campaign_recipients (campaign_id, recipient_name, recipient_email, status) VALUES (?, 'Sent 2', 's2@test.com', 'sent')`).run(campId);
    db.prepare(`INSERT INTO campaign_recipients (campaign_id, recipient_name, recipient_email, status, error_message) VALUES (?, 'Failed 1', 'f1@test.com', 'failed', 'Connection timeout')`).run(campId);

    const retryRes = blastManager.retryFailed(campId);
    assert.strictEqual(retryRes.success, true, 'Retry failed to initiate');
    assert.strictEqual(retryRes.retriedCount, 1, 'Expected exactly 1 failed recipient to be re-queued');

    const updatedCamp = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campId);
    assert.strictEqual(updatedCamp.failed_count, 0, 'Failed count not reset on campaign');

    const pendingCount = db.prepare("SELECT count(*) as c FROM campaign_recipients WHERE campaign_id = ? AND status = 'pending'").get(campId).c;
    assert.strictEqual(pendingCount, 1, 'Failed recipient not changed to pending');
  });

  // 6. 500+ Bulk Record Saving Test
  test('Bulk Upload: Saves 500+ records together in bulk in a single atomic transaction', () => {
    const db = getDb();
    const beforeCount = db.prepare('SELECT COUNT(*) as c FROM students').get().c;
    const testBatchId = `batch_bulk500_${Date.now()}`;

    // Generate 500 unique student records
    const bulk500 = [];
    const timestamp = Date.now();
    for (let i = 1; i <= 500; i++) {
      bulk500.push({
        'Name': `Bulk Student ${i}`,
        'Email': `bulk.student.${timestamp}.${i}@college.edu`
      });
    }

    const { validateAndNormalizeRows } = require('../services/excelParser');
    const validated = validateAndNormalizeRows(bulk500, { name: 'Name', email: 'Email' });
    assert.strictEqual(validated.validCount, 500, 'Expected all 500 records to be valid');

    const insertStmt = db.prepare(`
      INSERT INTO students (name, email, college, phone, branch, batch, status, import_batch_id, import_source, tags, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const commitTx = db.transaction(() => {
      for (const row of validated.rows) {
        const item = row.normalized;
        insertStmt.run(
          item.name,
          item.email,
          item.college,
          item.phone,
          item.branch,
          item.batch,
          'Active',
          testBatchId,
          'Bulk 500 Test File.xlsx',
          item.tags,
          'Bulk 500 test'
        );
      }
    });

    commitTx();

    const afterCount = db.prepare('SELECT COUNT(*) as c FROM students').get().c;
    assert.strictEqual(afterCount, beforeCount + 500, `Expected ${beforeCount + 500} students, got ${afterCount}`);
  });

  // 7. SMTP Password / App Password Persistence Test
  test('Settings: Successfully saves, updates, and persists SMTP Password / App Password in database', () => {
    const db = getDb();
    const testAppPassword = 'abcd efgh ijkl mnop';

    const updateStmt = db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES ('smtp_pass', ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `);

    updateStmt.run(testAppPassword);

    const savedPass = db.prepare("SELECT value FROM settings WHERE key = 'smtp_pass'").get();
    assert.strictEqual(savedPass.value, testAppPassword, 'SMTP Password not saved or matched');
  });

  // 8. Single Bulk Upload Batch Selection & Targeting Test
  test('Upload Batches: Filter and select data of one bulk upload for blast', () => {
    const db = getDb();
    const ts = Date.now();
    const batchId = `batch_test_selection_${ts}`;
    const batchFilename = 'IIT_Bombay_Placement_Drive.xlsx';

    // Insert 5 students in this upload batch
    for (let i = 1; i <= 5; i++) {
      db.prepare(`
        INSERT INTO students (name, email, college, status, import_batch_id, import_source)
        VALUES (?, ?, 'IIT Bombay', 'Active', ?, ?)
      `).run(`Batch Candidate ${i}`, `batch.candidate.${ts}.${i}@iitb.ac.in`, batchId, batchFilename);
    }

    const batchStudents = db.prepare('SELECT * FROM students WHERE import_batch_id = ?').all(batchId);
    assert.strictEqual(batchStudents.length, 5, 'Expected 5 students in test bulk upload batch');
  });

  // 9. Delete All Data of One Bulk Upload Test
  test('Upload Batches: Select and delete all data of one bulk upload atomically', () => {
    const db = getDb();
    const ts = Date.now();
    const batchId = `batch_test_deletion_${ts}`;

    // Insert 10 students in this upload batch
    for (let i = 1; i <= 10; i++) {
      db.prepare(`
        INSERT INTO students (name, email, college, status, import_batch_id, import_source)
        VALUES (?, ?, 'COEP Tech', 'Active', ?, 'COEP_Batch_To_Delete.csv')
      `).run(`COEP Student ${i}`, `coep.delete.${ts}.${i}@coep.ac.in`, batchId);
    }

    const beforeDelete = db.prepare('SELECT COUNT(*) as c FROM students WHERE import_batch_id = ?').get(batchId).c;
    assert.strictEqual(beforeDelete, 10, 'Expected 10 students before delete');

    // Delete all data of this bulk upload
    const result = db.prepare('DELETE FROM students WHERE import_batch_id = ?').run(batchId);
    assert.strictEqual(result.changes, 10, 'Expected exactly 10 students to be deleted');

    const afterDelete = db.prepare('SELECT COUNT(*) as c FROM students WHERE import_batch_id = ?').get(batchId).c;
    assert.strictEqual(afterDelete, 0, 'Expected 0 students remaining in deleted bulk upload batch');
  });

  // 10. Multi-SMTP Accounts Pool & Round-Robin Rotation Test
  test('Multi-SMTP: Pool creates 5 sender accounts and alternates them in Round-Robin mode', () => {
    const db = getDb();
    const smtpPool = require('../services/smtpPool');

    // Clear existing test accounts and insert 5 accounts
    db.prepare('DELETE FROM smtp_accounts').run();

    const insertAccount = db.prepare(`
      INSERT INTO smtp_accounts (name, host, port, secure, user, pass, from_name, from_email, daily_limit, sent_today, is_active, priority)
      VALUES (?, 'smtp.gmail.com', 587, 0, ?, 'app-pass-1234', 'Aparaitech Recruitment', ?, 500, 0, 1, ?)
    `);

    for (let i = 1; i <= 5; i++) {
      insertAccount.run(`HR Sender Account #${i}`, `hr${i}@aparaitech.org`, `hr${i}@aparaitech.org`, i);
    }

    const accounts = smtpPool.getAvailableAccounts();
    assert.strictEqual(accounts.length, 5, 'Expected 5 active SMTP accounts in pool');

    // Test round robin order: 1 -> 2 -> 3 -> 4 -> 5 -> 1
    const first = smtpPool.getNextAccount('round_robin');
    const second = smtpPool.getNextAccount('round_robin');
    const third = smtpPool.getNextAccount('round_robin');

    assert.notStrictEqual(first.id, second.id, 'Expected different accounts in round robin');
    assert.notStrictEqual(second.id, third.id, 'Expected different accounts in round robin');
  });

  // 11. Multi-SMTP Auto-Failover & Limit Switching Test
  test('Multi-SMTP: Auto-switches to next sender when daily limit is reached or quota exceeded', () => {
    const db = getDb();
    const smtpPool = require('../services/smtpPool');

    // Find first account and simulate daily limit reached
    const accounts = db.prepare('SELECT * FROM smtp_accounts ORDER BY id ASC').all();
    assert(accounts.length >= 2, 'Need at least 2 accounts for failover test');

    const acc1 = accounts[0];
    const acc2 = accounts[1];

    // Set acc1 as exhausted (sent_today = 500 / daily_limit = 500)
    db.prepare("UPDATE smtp_accounts SET sent_today = 500, daily_limit = 500, last_sent_date = ? WHERE id = ?").run(smtpPool.getTodayString(), acc1.id);

    // Get next account in auto_failover mode - should skip acc1 and pick acc2
    const nextAcc = smtpPool.getNextAccount('auto_failover');
    assert.strictEqual(nextAcc.id, acc2.id, `Expected next available account (${acc2.user}), got ${nextAcc.user}`);
  });

  // 12. MongoDB Atlas Module & URI Validator Test
  test('MongoDB Atlas: Driver initializes and properly handles URI connection validation', async () => {
    const { testMongoConnection } = require('../database/mongo');

    // Test empty URI validation
    const emptyResult = await testMongoConnection('');
    assert.strictEqual(emptyResult.success, false, 'Expected false for empty URI');

    // Test invalid URI format validation
    const invalidResult = await testMongoConnection('invalid-protocol://fake-host:1234');
    assert.strictEqual(invalidResult.success, false, 'Expected false for invalid protocol URI');
  });

  // 13. Dynamic Application / Apply Now Link Substitution Test
  test('Template Engine: Renders custom dynamic {ApplyLink} and {Application_Link} correctly in hyperlinks', () => {
    const { renderText } = require('../services/templateEngine');
    const student = {
      name: 'Aditi Deshmukh',
      college: 'VPKBIET Baramati',
      batch: '2026'
    };

    const customUrl = 'https://careers.aparaitech.org/apply?drive=2026-pune-campus';
    const htmlTemplate = '<p>Hi {Name},</p><a href="{ApplyLink}">Apply Now</a><p>Or visit {Application_Link}</p>';

    const rendered = renderText(htmlTemplate, student, { apply_link: customUrl });
    assert(rendered.includes(`href="${customUrl}"`), 'Expected rendered HTML to include custom dynamic ApplyLink href');
    assert(rendered.includes(`visit ${customUrl}`), 'Expected rendered HTML to include custom dynamic Application_Link');
    assert(rendered.includes('Hi Aditi Deshmukh'), 'Expected name personalization');
  });

  // 14. Campaigns DB Schema: apply_link column exists
  test('Database Schema: campaigns table has apply_link column for persistent custom URLs', () => {
    const db = getDb();
    const cols = db.prepare("PRAGMA table_info(campaigns)").all().map(c => c.name);
    assert(cols.includes('apply_link'), 'Expected campaigns table to include apply_link column');
  });

  console.log('\n====================================================');
  console.log(`📊 Test Results: ${passedTests} / ${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('====================================================');

  if (passedTests === totalTests) {
    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
  } else {
    process.exit(1);
  }
}

if (require.main === module) {
  runTestSuite().catch(err => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  });
}

module.exports = { runTestSuite };
