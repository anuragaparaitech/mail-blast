const express = require('express');
const router = express.Router();
const { getDb } = require('../database/db');

// GET /api/inbox - Get list of simulated inbox emails
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { search = '', campaign_id = '', page = 1, limit = 20 } = req.query;

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const validLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));

    let whereClauses = [];
    let params = [];

    if (search.trim()) {
      whereClauses.push('(recipient_name LIKE ? OR recipient_email LIKE ? OR college LIKE ? OR subject LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    if (campaign_id) {
      whereClauses.push('campaign_id = ?');
      params.push(campaign_id);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM simulated_inbox ${whereSql}`).get(...params);
    const total = countRow ? countRow.total : 0;

    const emails = db.prepare(`
      SELECT id, campaign_id, recipient_email, recipient_name, college, subject, from_address, received_at, is_read, substr(body_html, 1, 200) as preview_snippet
      FROM simulated_inbox
      ${whereSql}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `).all(...params, validLimit, offset);

    res.json({
      success: true,
      emails,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: validLimit,
        totalPages: Math.ceil(total / validLimit) || 1
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/inbox/:id - Get full single email
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const email = db.prepare('SELECT * FROM simulated_inbox WHERE id = ?').get(req.params.id);

    if (!email) {
      return res.status(404).json({ success: false, message: 'Email not found in mailbox' });
    }

    // Mark as read
    db.prepare('UPDATE simulated_inbox SET is_read = 1 WHERE id = ?').run(req.params.id);

    res.json({ success: true, email });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/inbox/clear - Clear simulated inbox
router.delete('/clear', (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM simulated_inbox').run();
    res.json({ success: true, message: `Cleared ${result.changes} emails from mailbox.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
