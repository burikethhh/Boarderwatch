const { getDatabase } = require('../config/database');
const twilio = require('./twilio.service');
const sendgrid = require('./sendgrid.service');

/**
 * Create a system notification in the database
 */
function createNotification(type, title, message, channel = 'system') {
  const db = getDatabase();
  db.prepare('INSERT INTO notifications (type, title, message, channel) VALUES (?, ?, ?, ?)')
    .run(type, title, message, channel);
}

/**
 * Handle motion detection alert - creates notification + sends SMS/email
 */
async function handleMotionAlert(camera) {
  const db = getDatabase();
  const timestamp = new Date().toLocaleString();

  // 1. Create system notification
  createNotification(
    'motion_detected',
    `Motion Detected - ${camera.camera_name}`,
    `${camera.location || 'Unknown location'} detected movement`,
    'system'
  );

  // 2. Create CCTV alert
  db.prepare('INSERT INTO cctv_alerts (camera_id, alert_type, description) VALUES (?, ?, ?)')
    .run(camera.camera_id, 'motion', `${camera.camera_name} - Motion detected at ${camera.location || 'unknown location'}`);

  // 3. Send SMS
  const smsResult = await twilio.sendMotionAlert(camera.camera_name, camera.location || 'Unknown', timestamp);

  // 4. Send email
  const emailResult = await sendgrid.sendMotionAlertEmail(camera.camera_name, camera.location || 'Unknown', timestamp);

  // 5. Log activity
  db.prepare('INSERT INTO activity_logs (action, entity_type, entity_id, details) VALUES (?, ?, ?, ?)')
    .run('ALERT', 'camera', camera.camera_id, `Motion alert from ${camera.camera_name}`);

  return { notification: true, sms: smsResult, email: emailResult };
}

/**
 * Handle lease expiry check - finds leases expiring within warning period
 */
async function checkLeaseExpiry() {
  const db = getDatabase();
  db.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);

  const warningDays = db.prepare("SELECT value FROM settings WHERE key = 'auto_lease_expiry'").get();
  const days = parseInt(warningDays?.value || '30');

  // Find active leases expiring within the warning period
  const expiringLeases = db.prepare(`
    SELECT l.*, t.first_name || ' ' || t.last_name as tenant_name, t.phone_number, t.email,
           r.room_number
    FROM leases l
    LEFT JOIN tenants t ON l.tenant_id = t.tenant_id
    LEFT JOIN rooms r ON l.room_id = r.room_id
    WHERE l.status = 'active'
    AND l.end_date <= date('now', '+' || ? || ' days')
    AND l.end_date >= date('now')
  `).all(days);

  let alertsSent = 0;

  for (const lease of expiringLeases) {
    // Check if we already sent an alert for this lease today
    const existingAlert = db.prepare(`
      SELECT notification_id FROM notifications
      WHERE type = 'lease_expiring'
      AND message LIKE '%' || ? || '%'
      AND date(created_at) = date('now')
    `).get(lease.lease_number);

    if (!existingAlert) {
      // Create notification
      createNotification(
        'lease_expiring',
        'Lease Expiring Soon',
        `Lease ${lease.lease_number} for ${lease.tenant_name} (Room ${lease.room_number}) expires on ${lease.end_date}`,
        'system'
      );

      // Send SMS if phone available
      if (lease.phone_number) {
        await twilio.sendLeaseExpiryAlert(lease.tenant_name, lease.room_number, lease.end_date);
      }

      // Send email if email available
      if (lease.email) {
        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Lease Expiring Soon</h2>
            <p>Your lease is expiring soon. Please contact the boarding house administration.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Lease</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${lease.lease_number}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Room</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${lease.room_number}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Expiry Date</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${lease.end_date}</td></tr>
            </table>
            <p style="color: #666; font-size: 12px;">BoardersWatch - Boarding House Management System</p>
          </div>
        `;
        await sendgrid.sendEmail(lease.email, `[BoardersWatch] Lease Expiring - ${lease.lease_number}`, html);
      }

      alertsSent++;
    }
  }

  // Also mark leases that have already expired
  db.prepare("UPDATE leases SET status = 'expired' WHERE status IN ('active', 'expiring_soon') AND end_date < date('now')").run();

  // Mark leases expiring soon
  db.prepare("UPDATE leases SET status = 'expiring_soon' WHERE status = 'active' AND end_date <= date('now', '+' || ? || ' days') AND end_date >= date('now')").run(days);

  console.log(`[Cron] Lease expiry check: ${expiringLeases.length} expiring, ${alertsSent} new alerts sent`);
  return { expiring: expiringLeases.length, alertsSent };
}

/**
 * Handle payment received - sends confirmation
 */
async function handlePaymentReceived(payment, tenant) {
  const db = getDatabase();

  // 1. Create system notification
  createNotification(
    'payment_received',
    'Payment Received',
    `Payment of P${payment.amount} received from ${payment.tenant_name || 'tenant'}`,
    'system'
  );

  // 2. Send email confirmation
  if (tenant?.email) {
    await sendgrid.sendPaymentEmail(
      payment.tenant_name,
      payment.amount,
      payment.receipt_number,
      payment.payment_date
    );
  }

  // 3. Log activity
  db.prepare('INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)')
    .run(null, 'PAYMENT', 'payment', payment.payment_id, `Payment ${payment.receipt_number} - P${payment.amount}`);
}

module.exports = {
  createNotification,
  handleMotionAlert,
  checkLeaseExpiry,
  handlePaymentReceived,
};
