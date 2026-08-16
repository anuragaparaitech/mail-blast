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

    // Run schema migrations
    const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');
    db.exec(schemaSql);

    // Initialize default settings if not exists
    initDefaultSettings(db);
  }
  return db;
}

function initDefaultSettings(database) {
  const defaultSettings = [
    { key: 'mailer_mode', value: 'sandbox' }, // 'sandbox' or 'smtp'
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
    { key: 'company_location', value: 'Baramati / Bengaluru, India' }
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

module.exports = {
  getDb,
  DB_PATH
};
