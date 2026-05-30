const { getDatabase } = require('../config/database');

let twilioClient = null;

function getClient() {
  if (twilioClient) return twilioClient;

  const db = getDatabase();
  db.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  const sid = db.prepare("SELECT value FROM settings WHERE key = 'twilio_account_sid'").get();
  const token = db.prepare("SELECT value FROM settings WHERE key = 'twilio_auth_token'").get();

  if (!sid?.value || !token?.value) {
    return null;
  }

  try {
    const twilio = require('twilio');
    twilioClient = twilio(sid.value, token.value);
    return twilioClient;
  } catch (err) {
    console.error('Twilio init failed:', err.message);
    return null;
  }
}

function getFromNumber() {
  const db = getDatabase();
  db.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  const from = db.prepare("SELECT value FROM settings WHERE key = 'twilio_phone_number'").get();
  return from?.value || null;
}

/**
 * Send SMS notification
 * @param {string} to - Phone number (e.g., +639171234567)
 * @param {string} message - SMS body
 * @returns {Promise<{success: boolean, sid?: string, error?: string}>}
 */
async function sendSMS(to, message) {
  const client = getClient();
  const from = getFromNumber();

  if (!client) {
    console.log('[Twilio] Not configured - SMS would be sent to:', to);
    console.log('[Twilio] Message:', message);
    return { success: false, error: 'Twilio not configured' };
  }

  if (!from) {
    return { success: false, error: 'Twilio phone number not configured' };
  }

  try {
    const result = await client.messages.create({
      body: message,
      from,
      to,
    });

    console.log(`[Twilio] SMS sent to ${to}, SID: ${result.sid}`);
    return { success: true, sid: result.sid };
  } catch (err) {
    console.error(`[Twilio] SMS failed to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send motion detection alert via SMS
 */
async function sendMotionAlert(cameraName, location, timestamp) {
  const db = getDatabase();
  db.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  const phoneSetting = db.prepare("SELECT value FROM settings WHERE key = 'contact_phone'").get();
  const notifyMotion = db.prepare("SELECT value FROM settings WHERE key = 'notify_motion'").get();

  if (notifyMotion?.value === '0') return { success: false, error: 'Motion notifications disabled' };
  if (!phoneSetting?.value) return { success: false, error: 'No contact phone configured' };

  const message = `[BoardersWatch] Motion detected at ${cameraName} (${location}) at ${timestamp}. Please check.`;
  return sendSMS(phoneSetting.value, message);
}

/**
 * Send lease expiry warning via SMS
 */
async function sendLeaseExpiryAlert(tenantName, roomNumber, endDate) {
  const db = getDatabase();
  db.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  const phoneSetting = db.prepare("SELECT value FROM settings WHERE key = 'contact_phone'").get();
  const notifyLease = db.prepare("SELECT value FROM settings WHERE key = 'notify_lease_expiry'").get();

  if (notifyLease?.value === '0') return { success: false, error: 'Lease notifications disabled' };
  if (!phoneSetting?.value) return { success: false, error: 'No contact phone configured' };

  const message = `[BoardersWatch] Lease expiring for ${tenantName} (Room ${roomNumber}). End date: ${endDate}. Please review.`;
  return sendSMS(phoneSetting.value, message);
}

module.exports = { sendSMS, sendMotionAlert, sendLeaseExpiryAlert };
