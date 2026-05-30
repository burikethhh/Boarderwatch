const { getDatabase } = require('../config/database');

let sgMail = null;

function getClient() {
  if (sgMail) return sgMail;

  const db = getDatabase();
  db.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  const apiKey = db.prepare("SELECT value FROM settings WHERE key = 'sendgrid_api_key'").get();

  if (!apiKey?.value) {
    return null;
  }

  try {
    sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(apiKey.value);
    return sgMail;
  } catch (err) {
    console.error('SendGrid init failed:', err.message);
    return null;
  }
}

function getFromEmail() {
  const db = getDatabase();
  db.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  const from = db.prepare("SELECT value FROM settings WHERE key = 'sendgrid_from_email'").get();
  return from?.value || null;
}

/**
 * Send email notification
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML body
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendEmail(to, subject, html) {
  const client = getClient();
  const from = getFromEmail();

  if (!client) {
    console.log('[SendGrid] Not configured - Email would be sent to:', to);
    console.log('[SendGrid] Subject:', subject);
    return { success: false, error: 'SendGrid not configured' };
  }

  if (!from) {
    return { success: false, error: 'SendGrid from email not configured' };
  }

  try {
    await client.send({
      to,
      from,
      subject,
      html,
    });

    console.log(`[SendGrid] Email sent to ${to}: ${subject}`);
    return { success: true };
  } catch (err) {
    console.error(`[SendGrid] Email failed to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send motion detection alert via email
 */
async function sendMotionAlertEmail(cameraName, location, timestamp) {
  const db = getDatabase();
  db.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  const emailSetting = db.prepare("SELECT value FROM settings WHERE key = 'contact_email'").get();
  const notifyMotion = db.prepare("SELECT value FROM settings WHERE key = 'notify_motion'").get();

  if (notifyMotion?.value === '0') return { success: false, error: 'Motion notifications disabled' };
  if (!emailSetting?.value) return { success: false, error: 'No contact email configured' };

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Motion Detected</h2>
      <p>A motion event was detected by your BoardersWatch camera system.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Camera</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${cameraName}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Location</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${location}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Time</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${timestamp}</td></tr>
      </table>
      <p style="color: #666; font-size: 12px;">BoardersWatch - Boarding House Management System</p>
    </div>
  `;

  return sendEmail(emailSetting.value, `[BoardersWatch] Motion Detected - ${cameraName}`, html);
}

/**
 * Send payment confirmation email
 */
async function sendPaymentEmail(tenantName, amount, receiptNumber, paymentDate) {
  const db = getDatabase();
  db.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  const emailSetting = db.prepare("SELECT value FROM settings WHERE key = 'contact_email'").get();
  const notifyPayment = db.prepare("SELECT value FROM settings WHERE key = 'notify_payment'").get();

  if (notifyPayment?.value === '0') return { success: false, error: 'Payment notifications disabled' };
  if (!emailSetting?.value) return { success: false, error: 'No contact email configured' };

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Payment Received</h2>
      <p>A payment has been recorded in the system.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Tenant</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${tenantName}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Amount</td><td style="padding: 8px; border-bottom: 1px solid #eee;">P${amount.toLocaleString()}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Receipt</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${receiptNumber}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Date</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${paymentDate}</td></tr>
      </table>
      <p style="color: #666; font-size: 12px;">BoardersWatch - Boarding House Management System</p>
    </div>
  `;

  return sendEmail(emailSetting.value, `[BoardersWatch] Payment Received - ${receiptNumber}`, html);
}

module.exports = { sendEmail, sendMotionAlertEmail, sendPaymentEmail };
