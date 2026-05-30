const { getDatabase } = require('../config/database');

exports.metrics = (req, res) => {
  const db = getDatabase();

  const totalTenants = db.prepare("SELECT COUNT(*) as count FROM tenants WHERE status = 'active'").get().count;
  const occupiedRooms = db.prepare("SELECT COUNT(*) as count FROM rooms WHERE status = 'occupied'").get().count;
  const pendingPayments = db.prepare(`
    SELECT COUNT(*) as count FROM leases l
    WHERE l.status = 'active'
    AND l.lease_id NOT IN (
      SELECT lease_id FROM payments WHERE payment_date >= date('now', 'start of month')
    )
  `).get().count;
  const unreadAlerts = db.prepare('SELECT COUNT(*) as count FROM cctv_alerts WHERE is_acknowledged = 0').get().count;

  res.json({ totalTenants, occupiedRooms, pendingPayments, unreadAlerts });
};

exports.recentPayments = (req, res) => {
  const db = getDatabase();
  const payments = db.prepare(`
    SELECT p.*, l.lease_number
    FROM payments p
    LEFT JOIN leases l ON p.lease_id = l.lease_id
    ORDER BY p.payment_date DESC
    LIMIT 5
  `).all();
  res.json(payments);
};

exports.recentNotifications = (req, res) => {
  const db = getDatabase();
  const notifications = db.prepare('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 5').all();
  res.json(notifications);
};
