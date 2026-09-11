const { getDatabase } = require('../config/database');
const mail = require('./mail.service');

function ensureSettings() {
  const db = getDatabase();
  db.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  return db;
}

/**
 * Send email notification through the configured provider
 * (Brevo / Resend / Web3Forms / Gmail SMTP / SendGrid / FormSubmit).
 * Kept for backwards compatibility with existing callers.
 */
async function sendEmail(to, subject, html, text) {
  return mail.sendEmail(to, subject, html, text);
}

/**
 * Send motion detection alert via email
 */
async function sendMotionAlertEmail(cameraName, location, timestamp) {
  const db = ensureSettings();
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

  return mail.sendEmail(emailSetting.value, `[BoardersWatch] Motion Detected - ${cameraName}`, html);
}

/**
 * Send payment confirmation email
 */
async function sendPaymentEmail(tenantName, amount, receiptNumber, paymentDate) {
  const db = ensureSettings();
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
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Amount</td><td style="padding: 8px; border-bottom: 1px solid #eee;">P${Number(amount).toLocaleString()}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Receipt</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${receiptNumber}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Date</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${paymentDate}</td></tr>
      </table>
      <p style="color: #666; font-size: 12px;">BoardersWatch - Boarding House Management System</p>
    </div>
  `;

  return mail.sendEmail(emailSetting.value, `[BoardersWatch] Payment Received - ${receiptNumber}`, html);
}

module.exports = { sendEmail, sendMotionAlertEmail, sendPaymentEmail };
