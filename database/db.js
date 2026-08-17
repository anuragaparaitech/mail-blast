const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || (process.env.VERCEL ? path.join('/tmp', 'mailblast.db') : path.join(__dirname, 'mailblast.db'));
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Ensure database directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database
let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Migration: Ensure import_batch_id & import_source columns exist on students table
    try {
      const cols = db.prepare("PRAGMA table_info(students)").all().map(c => c.name);
      if (cols.length > 0) {
        if (!cols.includes('import_batch_id')) {
          db.exec("ALTER TABLE students ADD COLUMN import_batch_id TEXT;");
        }
        if (!cols.includes('import_source')) {
          db.exec("ALTER TABLE students ADD COLUMN import_source TEXT DEFAULT 'Manual Entry';");
        }
      }
    } catch (e) {
      // ignore if table doesn't exist yet
    }

    // Migration: Ensure campaign_recipients has smtp_account_id & smtp_sender columns
    try {
      const crCols = db.prepare("PRAGMA table_info(campaign_recipients)").all().map(c => c.name);
      if (crCols.length > 0) {
        if (!crCols.includes('smtp_account_id')) {
          db.exec("ALTER TABLE campaign_recipients ADD COLUMN smtp_account_id INTEGER;");
        }
        if (!crCols.includes('smtp_sender')) {
          db.exec("ALTER TABLE campaign_recipients ADD COLUMN smtp_sender TEXT;");
        }
      }
    } catch (e) {
      // ignore
    }

    // Migration: Ensure campaigns has apply_link column
    try {
      const campCols = db.prepare("PRAGMA table_info(campaigns)").all().map(c => c.name);
      if (campCols.length > 0 && !campCols.includes('apply_link')) {
        db.exec("ALTER TABLE campaigns ADD COLUMN apply_link TEXT DEFAULT 'https://aparaitech.org/apply';");
      }
    } catch (e) {
      // ignore
    }

    // Run schema migrations
    const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');
    db.exec(schemaSql);

    // Ensure index exists
    try {
      db.exec("CREATE INDEX IF NOT EXISTS idx_students_import_batch ON students(import_batch_id);");
      db.exec("CREATE INDEX IF NOT EXISTS idx_smtp_accounts_active ON smtp_accounts(is_active);");
    } catch (e) {
      // ignore
    }

    // Initialize default settings and migrate existing SMTP to smtp_accounts
    initDefaultSettings(db);
    migrateExistingSmtpToAccounts(db);
  }
  return db;
}

function initDefaultSettings(database) {
  const defaultSettings = [
    { key: 'mailer_mode', value: 'sandbox' }, // 'sandbox' or 'smtp'
    { key: 'smtp_rotation_strategy', value: 'round_robin' }, // 'round_robin', 'auto_failover', 'single'
    { key: 'smtp_host', value: 'smtp.gmail.com' },
    { key: 'smtp_port', value: '587' },
    { key: 'smtp_secure', value: 'false' },
    { key: 'smtp_user', value: 'recruitment@aparaitech.org' },
    { key: 'smtp_pass', value: '' },
    { key: 'from_name', value: 'Aparaitech Software Recruitment Team' },
    { key: 'from_email', value: 'recruitment@aparaitech.org' },
    { key: 'reply_to', value: 'careers@aparaitech.org' },
    { key: 'send_delay_ms', value: '350' }, // Delay between emails in blast
    { key: 'simulate_failure_rate', value: '5' }, // 5% simulated failure for testing diagnostics
    { key: 'company_name', value: 'Aparaitech Software' },
    { key: 'company_website', value: 'https://aparaitech.org' },
    { key: 'company_logo', value: '/assets/logo.svg' },
    { key: 'company_location', value: 'Bengaluru & Pune / Baramati Tech Centers' }
  ];

  const checkStmt = database.prepare('SELECT value FROM settings WHERE key = ?');
  const insertStmt = database.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');

  const insertTx = database.transaction(() => {
    for (const setting of defaultSettings) {
      const existing = checkStmt.get(setting.key);
      if (!existing) {
        insertStmt.run(setting.key, setting.value);
      }
    }
  });

  insertTx();
}

function migrateExistingSmtpToAccounts(database) {
  try {
    const count = database.prepare('SELECT COUNT(*) as c FROM smtp_accounts').get().c;
    if (count === 0) {
      const getSetting = (k) => {
        const row = database.prepare('SELECT value FROM settings WHERE key = ?').get(k);
        return row ? row.value : '';
      };

      const user = getSetting('smtp_user') || 'recruitment@aparaitech.org';
      const pass = getSetting('smtp_pass') || '';
      const host = getSetting('smtp_host') || 'smtp.gmail.com';
      const port = parseInt(getSetting('smtp_port') || '587', 10);
      const secure = getSetting('smtp_secure') === 'true' ? 1 : 0;
      const fromName = getSetting('from_name') || 'Aparaitech Software Recruitment Team';
      const fromEmail = getSetting('from_email') || user;
      const replyTo = getSetting('reply_to') || 'careers@aparaitech.org';

      database.prepare(`
        INSERT INTO smtp_accounts (name, host, port, secure, user, pass, from_name, from_email, reply_to, daily_limit, sent_today, is_active, priority)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 500, 0, 1, 1)
      `).run(
        'Primary Sender Account (Default)',
        host,
        port,
        secure,
        user,
        pass,
        fromName,
        fromEmail,
        replyTo
      );
    }
  } catch (e) {
    // ignore
  }
}

module.exports = {
  getDb,
  DB_PATH
};
