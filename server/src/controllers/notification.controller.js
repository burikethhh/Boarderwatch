const { getDatabase } = require('../config/database');

exports.list = (req, res) => {
  const db = getDatabase();
  const { type, is_read } = req.query;

  let query = 'SELECT * FROM notifications WHERE 1=1';
  const params = [];

  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }

  if (is_read !== undefined) {
    query += ' AND is_read = ?';
    params.push(is_read);
  }

  query += ' ORDER BY created_at DESC';
  const notifications = db.prepare(query).all(...params);
  res.json(notifications);
};

exports.markRead = (req, res) => {
  const db = getDatabase();
  db.prepare('UPDATE notifications SET is_read = 1 WHERE notification_id = ?').run(req.params.id);
  res.json({ message: 'Notification marked as read' });
};

exports.markAllRead = (req, res) => {
  const db = getDatabase();
  db.prepare('UPDATE notifications SET is_read = 1 WHERE is_read = 0').run();
  res.json({ message: 'All notifications marked as read' });
};

exports.unreadCount = (req, res) => {
  const db = getDatabase();
  const result = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE is_read = 0').get();
  res.json({ count: result.count });
};

exports.alerts = (req, res) => {
  const db = getDatabase();
  const { acknowledged } = req.query;

  let query = `
    SELECT a.*, c.camera_name, c.location
    FROM cctv_alerts a
    LEFT JOIN cctv_cameras c ON a.camera_id = c.camera_id
    WHERE 1=1
  `;
  const params = [];

  if (acknowledged !== undefined) {
    query += ' AND a.is_acknowledged = ?';
    params.push(acknowledged);
  }

  query += ' ORDER BY a.timestamp DESC';
  const alerts = db.prepare(query).all(...params);
  res.json(alerts);
};

exports.acknowledgeAlert = (req, res) => {
  const db = getDatabase();
  db.prepare('UPDATE cctv_alerts SET is_acknowledged = 1, acknowledged_by = ?, acknowledged_at = CURRENT_TIMESTAMP WHERE alert_id = ?')
    .run(req.user.user_id, req.params.id);
  res.json({ message: 'Alert acknowledged' });
};

exports.unacknowledgedAlerts = (req, res) => {
  const db = getDatabase();
  const alerts = db.prepare(`
    SELECT a.*, c.camera_name, c.location
    FROM cctv_alerts a
    LEFT JOIN cctv_cameras c ON a.camera_id = c.camera_id
    WHERE a.is_acknowledged = 0
    ORDER BY a.timestamp DESC
  `).all();
  res.json(alerts);
};
