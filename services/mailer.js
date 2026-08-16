const nodemailer = require('nodemailer');
const { getDb } = require('../database/db');

/**
 * Get current mailer configuration from database settings
 */
function getMailerConfig() {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  rows.forEach(r => { settings[r.key] = r.value; });
  return settings;
}

/**
 * Verify SMTP server connection
 */
async function verifySmtpConnection(customConfig = null) {
  const config = customConfig || getMailerConfig();

  if (config.mailer_mode === 'sandbox') {
    return {
      success: true,
      mode: 'sandbox',
      message: 'Sandbox / Simulator mode is active. Real emails will not be sent to external inboxes, but will be captured in the Student Mailbox Inspector.'
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.smtp_host,
      port: parseInt(config.smtp_port, 10) || 587,
      secure: config.smtp_secure === 'true' || config.smtp_port === '465',
      auth: {
        user: config.smtp_user,
        pass: config.smtp_pass
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    await transporter.verify();
    return {
      success: true,
      mode: 'smtp',
      message: `Successfully connected to SMTP server (${config.smtp_host}:${config.smtp_port})`
    };
  } catch (error) {
    return {
      success: false,
      mode: 'smtp',
      message: `SMTP Connection Failed: ${error.message}`
    };
  }
}

/**
 * Send an email (via real SMTP or high-fidelity sandbox)
 */
async function sendEmail({
  to,
  recipientName,
  subject,
  html,
  campaignId = null,
  studentId = null,
  student = {}
}) {
  const config = getMailerConfig();
  const startTime = Date.now();

  const fromName = config.from_name || 'Aparaitech Software Recruitment Team';
  const fromEmail = config.from_email || 'recruitment@aparaitech.org';
  const replyTo = config.reply_to || 'careers@aparaitech.org';

  // 1. SANDBOX / SIMULATION MODE
  if (config.mailer_mode === 'sandbox') {
    // Simulate network delay
    const delay = Math.floor(Math.random() * 120) + 80;
    await new Promise(resolve => setTimeout(resolve, delay));

    // Check simulated failure rate
    const failureRate = parseInt(config.simulate_failure_rate || '0', 10);
    const shouldFail = failureRate > 0 && Math.random() * 100 < failureRate;

    if (shouldFail) {
      const simulatedErrors = [
        '550 5.1.1 User unknown / Mailbox unavailable',
        '421 4.7.0 Connection rate limit exceeded by recipient MX',
        '554 5.7.1 Relay access denied for recipient domain',
        'ETIMEDOUT: Connection to mail server timed out after 3000ms'
      ];
      const errorMsg = simulatedErrors[Math.floor(Math.random() * simulatedErrors.length)];
      return {
        success: false,
        error: errorMsg,
        latencyMs: Date.now() - startTime,
        mode: 'sandbox'
      };
    }

    // Save into simulated_inbox
    try {
      const db = getDb();
      db.prepare(`
        INSERT INTO simulated_inbox (campaign_id, recipient_email, recipient_name, college, subject, body_html, from_address, received_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        campaignId,
        to,
        recipientName || student.name || 'Candidate',
        student.college || '',
        subject,
        html,
        `"${fromName}" <${fromEmail}>`
      );
    } catch (err) {
      console.error('Error saving to simulated inbox:', err.message);
    }

    return {
      success: true,
      messageId: `<sim-${Date.now()}-${Math.random().toString(36).substring(7)}@aparaitech.org>`,
      latencyMs: Date.now() - startTime,
      mode: 'sandbox'
    };
  }

  // 2. LIVE SMTP MODE
  try {
    const transporter = nodemailer.createTransport({
      host: config.smtp_host,
      port: parseInt(config.smtp_port, 10) || 587,
      secure: config.smtp_secure === 'true' || config.smtp_port === '465',
      auth: {
        user: config.smtp_user,
        pass: config.smtp_pass
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: recipientName ? `"${recipientName}" <${to}>` : to,
      replyTo,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      messageId: info.messageId,
      latencyMs: Date.now() - startTime,
      mode: 'smtp'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Unknown SMTP transmission error',
      latencyMs: Date.now() - startTime,
      mode: 'smtp'
    };
  }
}

module.exports = {
  getMailerConfig,
  verifySmtpConnection,
  sendEmail
};
