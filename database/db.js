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
    { key: 'mailer_mode', value: 'smtp' },
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

const DEFAULT_SMTP_ACCOUNTS = [
  {
    name: 'Anurag Primary Sender',
    host: 'smtp.gmail.com',
    port: 587,
    secure: 0,
    user: 'anurag.aparaitech@gmail.com',
    pass: 'kmnitimmwqmbzoha',
    from_name: 'Aparaitech Software Recruitment Team',
    from_email: 'anurag.aparaitech@gmail.com',
    reply_to: 'careers@aparaitech.org',
    daily_limit: 500,
    priority: 1,
    is_active: 1
  },
  {
    name: 'Vivek Tech Recruitment',
    host: 'smtp.gmail.com',
    port: 587,
    secure: 0,
    user: 'vivek.aparaitech@gmail.com',
    pass: 'lsejhomvrffjuawu',
    from_name: 'Aparaitech Software Recruitment Team',
    from_email: 'vivek.aparaitech@gmail.com',
    reply_to: 'careers@aparaitech.org',
    daily_limit: 500,
    priority: 2,
    is_active: 1
  },
  {
    name: 'Anurag00 Campus Outreach',
    host: 'smtp.gmail.com',
    port: 587,
    secure: 0,
    user: 'anurag00.aparaitech@gmail.com',
    pass: 'kkrrxmqkhbmcaplq',
    from_name: 'Aparaitech Software Recruitment Team',
    from_email: 'anurag00.aparaitech@gmail.com',
    reply_to: 'careers@aparaitech.org',
    daily_limit: 500,
    priority: 3,
    is_active: 1
  },
  {
    name: 'Anurag01 Talent Acquisition',
    host: 'smtp.gmail.com',
    port: 587,
    secure: 0,
    user: 'anurag01.aparaitech@gmail.com',
    pass: 'tfyykuuavxpamjvo',
    from_name: 'Aparaitech Software Recruitment Team',
    from_email: 'anurag01.aparaitech@gmail.com',
    reply_to: 'careers@aparaitech.org',
    daily_limit: 500,
    priority: 4,
    is_active: 1
  },
  {
    name: 'Kshitij HR Operations',
    host: 'smtp.gmail.com',
    port: 587,
    secure: 0,
    user: 'kshitij.aparaitech@gmail.com',
    pass: 'zxlwpwxwwskdfmwh',
    from_name: 'Aparaitech Software Recruitment Team',
    from_email: 'kshitij.aparaitech@gmail.com',
    reply_to: 'careers@aparaitech.org',
    daily_limit: 500,
    priority: 5,
    is_active: 1
  }
];

function migrateExistingSmtpToAccounts(database) {
  try {
    const existingAccounts = database.prepare('SELECT * FROM smtp_accounts').all();
    const existingUsers = new Set(existingAccounts.map(a => a.user.toLowerCase()));

    const insertStmt = database.prepare(`
      INSERT INTO smtp_accounts (name, host, port, secure, user, pass, from_name, from_email, reply_to, daily_limit, sent_today, is_active, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `);

    const updatePassStmt = database.prepare(`
      UPDATE smtp_accounts 
      SET pass = ?, host = ?, port = ?, from_name = ?, from_email = ?, reply_to = ?, is_active = 1
      WHERE user = ?
    `);

    const tx = database.transaction(() => {
      for (const acc of DEFAULT_SMTP_ACCOUNTS) {
        if (!existingUsers.has(acc.user.toLowerCase())) {
          insertStmt.run(
            acc.name,
            acc.host,
            acc.port,
            acc.secure,
            acc.user,
            acc.pass,
            acc.from_name,
            acc.from_email,
            acc.reply_to,
            acc.daily_limit,
            acc.is_active,
            acc.priority
          );
        } else {
          // Keep credentials up to date
          updatePassStmt.run(
            acc.pass,
            acc.host,
            acc.port,
            acc.from_name,
            acc.from_email,
            acc.reply_to,
            acc.user
          );
        }
      }
    });

    tx();
  } catch (e) {
    console.error('Error seeding SMTP accounts in db.js:', e.message);
  }
}

module.exports = {
  getDb,
  DB_PATH
};
