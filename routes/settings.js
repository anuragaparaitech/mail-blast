const express = require('express');
const router = express.Router();
const { getDb } = require('../database/db');
const { verifySmtpConnection, getMailerConfig } = require('../services/mailer');

// GET /api/settings - Fetch all settings as key-value object
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const config = {};
    rows.forEach(r => { config[r.key] = r.value; });

    // Mask password for security if returned
    if (config.smtp_pass) {
      config.smtp_pass_masked = config.smtp_pass ? '••••••••' : '';
    }

    res.json({ success: true, settings: config });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/settings - Update settings
router.post('/', (req, res) => {
  try {
    const db = getDb();
    const updates = req.body; // e.g. { mailer_mode: 'sandbox', send_delay_ms: 300, ... }

    const updateStmt = db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `);

    const updateTx = db.transaction(() => {
      for (const [key, value] of Object.entries(updates)) {
        // If password is sent as empty or masked without change, don't overwrite if existing
        if (key === 'smtp_pass' && (value === '' || value === '••••••••')) {
          continue;
        }
        updateStmt.run(key, String(value));
      }
    });

    updateTx();

    res.json({ success: true, message: 'Settings saved successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/settings/test-smtp - Test SMTP connection
router.post('/test-smtp', async (req, res) => {
  try {
    const customConfig = req.body;
    const result = await verifySmtpConnection(customConfig);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
