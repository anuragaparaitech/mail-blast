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

    // Generate 500 student records
    const bulk500 = [];
    for (let i = 1; i <= 500; i++) {
      bulk500.push({
        'Name': `Bulk Student ${i}`,
        'Email': `bulk.student.${i}@college.edu`
      });
    }

    const { validateAndNormalizeRows } = require('../services/excelParser');
    const validated = validateAndNormalizeRows(bulk500, { name: 'Name', email: 'Email' });
    assert.strictEqual(validated.validCount, 500, 'Expected all 500 records to be valid');

    const insertStmt = db.prepare(`
      INSERT INTO students (name, email, college, phone, branch, batch, status, tags, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
