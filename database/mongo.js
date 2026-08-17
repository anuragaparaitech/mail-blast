const { MongoClient } = require('mongodb');
const { getDb } = require('./db');

let mongoClient = null;
let mongoDb = null;
let isConnected = false;
let currentUri = process.env.MONGODB_URI || '';

/**
 * Connect to MongoDB Atlas
 */
async function connectMongo(uri = null) {
  const targetUri = uri || process.env.MONGODB_URI;
  if (!targetUri) {
    return { success: false, message: 'No MongoDB URI provided.' };
  }

  try {
    if (mongoClient) {
      await mongoClient.close();
    }

    mongoClient = new MongoClient(targetUri, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000
    });

    await mongoClient.connect();
    mongoDb = mongoClient.db();
    isConnected = true;
    currentUri = targetUri;

    // Ensure collections and indexes
    await ensureMongoIndexes(mongoDb);

    console.log(`🍃 Connected to MongoDB Atlas Database: ${mongoDb.databaseName}`);
    return {
      success: true,
      database: mongoDb.databaseName,
      message: `Successfully connected to MongoDB Atlas (${mongoDb.databaseName})`
    };
  } catch (error) {
    isConnected = false;
    mongoClient = null;
    mongoDb = null;
    console.error('MongoDB Atlas Connection Error:', error.message);
    return {
      success: false,
      error: error.message,
      message: `MongoDB Atlas connection failed: ${error.message}`
    };
  }
}

/**
 * Test a MongoDB connection string without keeping it active
 */
async function testMongoConnection(uri) {
  if (!uri || !uri.trim()) {
    return { success: false, message: 'Please enter a valid MongoDB connection URI.' };
  }

  let tempClient = null;
  const startTime = Date.now();

  try {
    tempClient = new MongoClient(uri.trim(), {
      serverSelectionTimeoutMS: 6000,
      connectTimeoutMS: 8000
    });

    await tempClient.connect();
    const db = tempClient.db();
    await db.command({ ping: 1 });

    const latencyMs = Date.now() - startTime;
    const dbName = db.databaseName || 'mailblast';

    await tempClient.close();

    return {
      success: true,
      database: dbName,
      latencyMs,
      message: `Successfully connected to MongoDB Atlas database "${dbName}" in ${latencyMs}ms!`
    };
  } catch (error) {
    if (tempClient) {
      try { await tempClient.close(); } catch (e) {}
    }
    return {
      success: false,
      message: `MongoDB Atlas test failed: ${error.message}`
    };
  }
}

/**
 * Create indexes in MongoDB collections
 */
async function ensureMongoIndexes(db) {
  try {
    // Students collection
    await db.collection('students').createIndex({ email: 1 }, { unique: true });
    await db.collection('students').createIndex({ college: 1 });
    await db.collection('students').createIndex({ batch: 1 });
    await db.collection('students').createIndex({ import_batch_id: 1 });

    // Campaigns collection
    await db.collection('campaigns').createIndex({ createdAt: -1 });

    // Campaign recipients collection
    await db.collection('campaign_recipients').createIndex({ campaign_id: 1 });
    await db.collection('campaign_recipients').createIndex({ status: 1 });

    // SMTP accounts collection
    await db.collection('smtp_accounts').createIndex({ is_active: 1 });
  } catch (err) {
    console.error('Error creating MongoDB indexes:', err.message);
  }
}

/**
 * Sync / Migrate all current SQLite data directly into MongoDB Atlas
 */
async function syncSqliteToMongo(uri = null) {
  const targetUri = uri || currentUri || process.env.MONGODB_URI;
  if (!targetUri) {
    throw new Error('MongoDB URI is required to sync data.');
  }

  if (!isConnected || !mongoDb) {
    const connResult = await connectMongo(targetUri);
    if (!connResult.success) {
      throw new Error(connResult.message);
    }
  }

  const sqlite = getDb();
  const summary = {
    students: 0,
    templates: 0,
    campaigns: 0,
    smtp_accounts: 0,
    settings: 0
  };

  // 1. Sync Students
  const students = sqlite.prepare('SELECT * FROM students').all();
  if (students.length > 0) {
    const studentOps = students.map(s => ({
      updateOne: {
        filter: { email: s.email },
        update: {
          $set: {
            name: s.name,
            email: s.email,
            college: s.college,
            phone: s.phone,
            branch: s.branch,
            batch: s.batch,
            status: s.status,
            import_batch_id: s.import_batch_id,
            import_source: s.import_source,
            tags: typeof s.tags === 'string' ? JSON.parse(s.tags || '[]') : s.tags,
            notes: s.notes,
            created_at: s.created_at,
            updated_at: s.updated_at
          }
        },
        upsert: true
      }
    }));
    const res = await mongoDb.collection('students').bulkWrite(studentOps);
    summary.students = (res.upsertedCount || 0) + (res.modifiedCount || 0) || students.length;
  }

  // 2. Sync Templates
  const templates = sqlite.prepare('SELECT * FROM templates').all();
  if (templates.length > 0) {
    const templateOps = templates.map(t => ({
      updateOne: {
        filter: { name: t.name },
        update: {
          $set: {
            name: t.name,
            category: t.category,
            subject: t.subject,
            body_html: t.body_html,
            tags_used: typeof t.tags_used === 'string' ? JSON.parse(t.tags_used || '[]') : t.tags_used,
            created_at: t.created_at
          }
        },
        upsert: true
      }
    }));
    await mongoDb.collection('templates').bulkWrite(templateOps);
    summary.templates = templates.length;
  }

  // 3. Sync SMTP Accounts
  const smtpAccounts = sqlite.prepare('SELECT * FROM smtp_accounts').all();
  if (smtpAccounts.length > 0) {
    const smtpOps = smtpAccounts.map(a => ({
      updateOne: {
        filter: { user: a.user },
        update: {
          $set: {
            name: a.name,
            host: a.host,
            port: a.port,
            secure: a.secure,
            user: a.user,
            pass: a.pass,
            from_name: a.from_name,
            from_email: a.from_email,
            reply_to: a.reply_to,
            daily_limit: a.daily_limit,
            sent_today: a.sent_today,
            is_active: a.is_active,
            priority: a.priority
          }
        },
        upsert: true
      }
    }));
    await mongoDb.collection('smtp_accounts').bulkWrite(smtpOps);
    summary.smtp_accounts = smtpAccounts.length;
  }

  // 4. Sync Settings
  const settings = sqlite.prepare('SELECT * FROM settings').all();
  if (settings.length > 0) {
    const settingsOps = settings.map(s => ({
      updateOne: {
        filter: { key: s.key },
        update: { $set: { key: s.key, value: s.value } },
        upsert: true
      }
    }));
    await mongoDb.collection('settings').bulkWrite(settingsOps);
    summary.settings = settings.length;
  }

  return {
    success: true,
    message: `Successfully synchronized ${summary.students} candidates, ${summary.templates} templates, and ${summary.smtp_accounts} SMTP accounts to MongoDB Atlas!`,
    summary
  };
}

function getMongoDb() {
  return mongoDb;
}

function isMongoActive() {
  return isConnected && mongoDb !== null;
}

module.exports = {
  connectMongo,
  testMongoConnection,
  syncSqliteToMongo,
  getMongoDb,
  isMongoActive
};
