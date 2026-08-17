const express = require('express');
const router = express.Router();
const xlsx = require('xlsx');
const { getDb } = require('../database/db');
const blastManager = require('../services/blastManager');
const { sendEmail } = require('../services/mailer');
const { renderText } = require('../services/templateEngine');

// GET /api/campaigns - List all campaigns
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const campaigns = db.prepare(`
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM campaign_recipients cr WHERE cr.campaign_id = c.id AND cr.status = 'sent') as computed_sent,
        (SELECT COUNT(*) FROM campaign_recipients cr WHERE cr.campaign_id = c.id AND cr.status = 'failed') as computed_failed,
        (SELECT COUNT(*) FROM campaign_recipients cr WHERE cr.campaign_id = c.id AND cr.status = 'pending') as computed_pending
      FROM campaigns c
      ORDER BY c.id DESC
    `).all();

    res.json({ success: true, campaigns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/campaigns/:id - Get campaign details
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    const summary = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        AVG(CASE WHEN latency_ms > 0 THEN latency_ms ELSE NULL END) as avg_latency
      FROM campaign_recipients
      WHERE campaign_id = ?
    `).get(req.params.id);

    res.json({
      success: true,
      campaign,
      summary: {
        total: summary.total || 0,
        sent: summary.sent || 0,
        failed: summary.failed || 0,
        pending: summary.pending || 0,
        avgLatencyMs: Math.round(summary.avg_latency || 0)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/campaigns/:id/recipients - Get delivery logs for a campaign
router.get('/:id/recipients', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { status = '', search = '', page = 1, limit = 50 } = req.query;

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const validLimit = Math.min(200, Math.max(1, parseInt(limit, 10)));

    let whereClauses = ['campaign_id = ?'];
    let params = [id];

    if (status.trim()) {
      whereClauses.push('status = ?');
      params.push(status.trim());
    }

    if (search.trim()) {
      whereClauses.push('(recipient_name LIKE ? OR recipient_email LIKE ? OR recipient_college LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    const totalRow = db.prepare(`SELECT COUNT(*) as total FROM campaign_recipients ${whereSql}`).get(...params);
    const total = totalRow ? totalRow.total : 0;

    const recipients = db.prepare(`
      SELECT * FROM campaign_recipients
      ${whereSql}
      ORDER BY id ASC
      LIMIT ? OFFSET ?
    `).all(...params, validLimit, offset);

    res.json({
      success: true,
      recipients,
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

// POST /api/campaigns - Launch a new email blast campaign
router.post('/', async (req, res) => {
  try {
    const db = getDb();
    const {
      title,
      subject,
      body_html,
      target_type = 'all', // 'all', 'college', 'batch', 'selected', 'import_batch', 'upload_batch'
      target_colleges = [],
      target_batches = [],
      target_upload_batches = [],
      target_batch_id = '',
      selected_student_ids = []
    } = req.body;

    if (!title || !subject || !body_html) {
      return res.status(400).json({ success: false, message: 'Campaign Title, Subject, and Email Body are required.' });
    }

    // Determine target students
    let targetStudents = [];

    if (target_type === 'selected' && Array.isArray(selected_student_ids) && selected_student_ids.length > 0) {
      const placeholders = selected_student_ids.map(() => '?').join(',');
      targetStudents = db.prepare(`SELECT * FROM students WHERE id IN (${placeholders}) AND status = 'Active'`).all(...selected_student_ids);
    } else if (target_type === 'college' && Array.isArray(target_colleges) && target_colleges.length > 0) {
      const placeholders = target_colleges.map(() => '?').join(',');
      targetStudents = db.prepare(`SELECT * FROM students WHERE college IN (${placeholders}) AND status = 'Active'`).all(...target_colleges);
    } else if (target_type === 'batch' && Array.isArray(target_batches) && target_batches.length > 0) {
      const placeholders = target_batches.map(() => '?').join(',');
      targetStudents = db.prepare(`SELECT * FROM students WHERE batch IN (${placeholders}) AND status = 'Active'`).all(...target_batches);
    } else if (target_type === 'import_batch' || target_type === 'upload_batch') {
      const batchIds = target_upload_batches.length > 0 ? target_upload_batches : (target_batch_id ? [target_batch_id] : []);
      if (batchIds.length > 0) {
        const placeholders = batchIds.map(() => '?').join(',');
        targetStudents = db.prepare(`SELECT * FROM students WHERE import_batch_id IN (${placeholders}) AND status = 'Active'`).all(...batchIds);
      }
    } else {
      // Default: All active students
      targetStudents = db.prepare("SELECT * FROM students WHERE status = 'Active'").all();
    }

    if (targetStudents.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active student recipients found for the selected audience criteria.'
      });
    }

    // Insert Campaign
    const targetFilterMeta = JSON.stringify({
      target_type,
      target_colleges,
      target_batches,
      target_upload_batches,
      target_batch_id,
      selected_student_ids_count: selected_student_ids.length
    });

    const createCampStmt = db.prepare(`
      INSERT INTO campaigns (title, subject, body_html, target_type, target_filter, total_recipients, sent_count, success_count, failed_count, status)
      VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 'draft')
    `);

    const result = createCampStmt.run(
      title.trim(),
      subject.trim(),
      body_html,
      target_type,
      targetFilterMeta,
      targetStudents.length
    );

    const campaignId = result.lastInsertRowid;

    // Insert Recipients in a transaction
    const insertRecipStmt = db.prepare(`
      INSERT INTO campaign_recipients (campaign_id, student_id, recipient_name, recipient_email, recipient_college, recipient_phone, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `);

    const insertTx = db.transaction(() => {
      for (const student of targetStudents) {
        insertRecipStmt.run(
          campaignId,
          student.id,
          student.name,
          student.email,
          student.college,
          student.phone || ''
        );
      }
    });

    insertTx();

    // Start background mail blast
    blastManager.startCampaign(campaignId).catch(err => {
      console.error(`Blast execution error for ${campaignId}:`, err);
    });

    res.status(201).json({
      success: true,
      campaignId,
      totalRecipients: targetStudents.length,
      message: `Email blast initiated for ${targetStudents.length} students!`
    });
  } catch (error) {
    console.error('Launch campaign error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/campaigns/test-send - Send a single preview test email
router.post('/test-send', async (req, res) => {
  try {
    const { test_email, subject, body_html, studentId } = req.body;

    if (!test_email) {
      return res.status(400).json({ success: false, message: 'Test email address is required.' });
    }

    const db = getDb();
    let sampleStudent = null;
    if (studentId) {
      sampleStudent = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId);
    }
    if (!sampleStudent) {
      sampleStudent = db.prepare('SELECT * FROM students LIMIT 1').get() || {
        name: 'Test Recruiter Candidate',
        email: test_email,
        college: 'Aparaitech Partner College',
        phone: '+91 9999999999',
        branch: 'Computer Science',
        batch: '2026'
      };
    }

    const renderedSubject = renderText(subject || 'Test Email Blast', sampleStudent);
    const renderedBody = renderText(body_html || '<p>This is a test recruitment blast preview.</p>', sampleStudent);

    const result = await sendEmail({
      to: test_email.trim(),
      recipientName: sampleStudent.name,
      subject: `[TEST BLAST] ${renderedSubject}`,
      html: renderedBody,
      student: sampleStudent
    });

    if (result.success) {
      res.json({
        success: true,
        message: `Test email dispatched to ${test_email} (${result.latencyMs}ms)`,
        mode: result.mode
      });
    } else {
      res.status(400).json({
        success: false,
        message: `Failed to send test email: ${result.error}`,
        mode: result.mode
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/campaigns/:id/pause - Pause running blast
router.post('/:id/pause', (req, res) => {
  try {
    const result = blastManager.pauseCampaign(parseInt(req.params.id, 10));
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/campaigns/:id/resume - Resume paused blast
router.post('/:id/resume', (req, res) => {
  try {
    blastManager.startCampaign(parseInt(req.params.id, 10));
    res.json({ success: true, message: 'Campaign resumed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/campaigns/:id/cancel - Abort blast
router.post('/:id/cancel', (req, res) => {
  try {
    const result = blastManager.cancelCampaign(parseInt(req.params.id, 10));
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/campaigns/:id/retry-failed - Retry failed deliveries
router.post('/:id/retry-failed', (req, res) => {
  try {
    const campaignId = parseInt(req.params.id, 10);
    const retryResult = blastManager.retryFailed(campaignId);

    if (retryResult.success) {
      // Automatically restart blast for retrying
      blastManager.startCampaign(campaignId).catch(err => {
        console.error('Error starting retry blast:', err);
      });
      res.json(retryResult);
    } else {
      res.status(400).json(retryResult);
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/campaigns/:id/stream - SSE Live Progress Endpoint
router.get('/:id/stream', (req, res) => {
  const campaignId = parseInt(req.params.id, 10);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Send initial state
  const db = getDb();
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
  if (campaign) {
    const initialPayload = {
      campaignId,
      total: campaign.total_recipients,
      sent: campaign.sent_count,
      success: campaign.success_count,
      failed: campaign.failed_count,
      status: campaign.status,
      percentage: Math.round((campaign.sent_count / Math.max(1, campaign.total_recipients)) * 100)
    };
    res.write(`event: progress\ndata: ${JSON.stringify(initialPayload)}\n\n`);
  }

  // Subscribe client to manager
  blastManager.addSseClient(campaignId, res);
});

// GET /api/campaigns/:id/export - Export delivery report to CSV
router.get('/:id/export', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    const recipients = db.prepare(`
      SELECT 
        recipient_name as "Student Name",
        recipient_email as "Email Address",
        recipient_college as "College",
        recipient_phone as "Phone",
        status as "Delivery Status",
        latency_ms as "Latency (ms)",
        error_message as "Error Reason",
        sent_at as "Delivery Timestamp"
      FROM campaign_recipients
      WHERE campaign_id = ?
      ORDER BY id ASC
    `).all(id);

    const worksheet = xlsx.utils.json_to_sheet(recipients);
    const csv = xlsx.utils.sheet_to_csv(worksheet);

    const safeTitle = campaign.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="delivery_report_${safeTitle}_${id}.csv"`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
