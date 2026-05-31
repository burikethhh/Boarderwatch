const { getDatabase } = require('../config/database');

function generateLeaseNumber(db) {
  const year = new Date().getFullYear();
  const last = db.prepare("SELECT lease_number FROM leases ORDER BY lease_id DESC LIMIT 1").get();
  let num = 1;
  if (last && last.lease_number) {
    const match = last.lease_number.match(/(\d+)$/);
    if (match) num = parseInt(match[1]) + 1;
  }
  return `LS-${year}-${String(num).padStart(3, '0')}`;
}

exports.list = (req, res) => {
  const db = getDatabase();
  const { status, tenant_id } = req.query;

  let query = `
    SELECT l.*, t.first_name || ' ' || t.last_name as tenant_name, r.room_number
    FROM leases l
    LEFT JOIN tenants t ON l.tenant_id = t.tenant_id
    LEFT JOIN rooms r ON l.room_id = r.room_id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    query += ' AND l.status = ?';
    params.push(status);
  }

  if (tenant_id) {
    query += ' AND l.tenant_id = ?';
    params.push(tenant_id);
  }

  query += ' ORDER BY l.lease_id DESC';
  const leases = db.prepare(query).all(...params);
  res.json(leases);
};

exports.getById = (req, res) => {
  const db = getDatabase();
  const lease = db.prepare(`
    SELECT l.*, t.first_name || ' ' || t.last_name as tenant_name, r.room_number
    FROM leases l
    LEFT JOIN tenants t ON l.tenant_id = t.tenant_id
    LEFT JOIN rooms r ON l.room_id = r.room_id
    WHERE l.lease_id = ?
  `).get(req.params.id);
  if (!lease) return res.status(404).json({ error: 'Lease not found' });
  res.json(lease);
};

exports.create = (req, res) => {
  const db = getDatabase();
  const { tenant_id, room_id, start_date, end_date, monthly_rent } = req.body;

  if (!tenant_id || !room_id || !start_date || !end_date || !monthly_rent) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const lease_number = generateLeaseNumber(db);

  const result = db.prepare(
    'INSERT INTO leases (lease_number, tenant_id, room_id, start_date, end_date, monthly_rent) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(lease_number, tenant_id, room_id, start_date, end_date, monthly_rent);

  // Update room status
  db.prepare("UPDATE rooms SET status = 'occupied' WHERE room_id = ?").run(room_id);

  const lease = db.prepare('SELECT * FROM leases WHERE lease_id = ?').get(result.lastInsertRowid);

  db.prepare('INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)')
    .run(req.user.user_id, 'CREATE', 'lease', lease.lease_id, `Created lease: ${lease_number}`);

  res.status(201).json(lease);
};

exports.update = (req, res) => {
  const db = getDatabase();
  const { tenant_id, room_id, start_date, end_date, monthly_rent, status } = req.body;

  const existing = db.prepare('SELECT * FROM leases WHERE lease_id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Lease not found' });

  db.prepare(
    'UPDATE leases SET tenant_id = ?, room_id = ?, start_date = ?, end_date = ?, monthly_rent = ?, status = ? WHERE lease_id = ?'
  ).run(
    tenant_id || existing.tenant_id,
    room_id || existing.room_id,
    start_date || existing.start_date,
    end_date || existing.end_date,
    monthly_rent || existing.monthly_rent,
    status || existing.status,
    req.params.id
  );

  const lease = db.prepare('SELECT * FROM leases WHERE lease_id = ?').get(req.params.id);
  res.json(lease);
};

exports.renew = (req, res) => {
  const db = getDatabase();
  const { end_date } = req.body;

  const lease = db.prepare('SELECT * FROM leases WHERE lease_id = ?').get(req.params.id);
  if (!lease) return res.status(404).json({ error: 'Lease not found' });

  db.prepare("UPDATE leases SET end_date = ?, status = 'active' WHERE lease_id = ?")
    .run(end_date, req.params.id);

  const updated = db.prepare('SELECT * FROM leases WHERE lease_id = ?').get(req.params.id);

  // Get tenant info for notification
  const tenant = db.prepare('SELECT * FROM tenants WHERE tenant_id = ?').get(lease.tenant_id);
  if (tenant) {
    db.prepare('INSERT INTO notifications (recipient_id, type, title, message, channel) VALUES (?, ?, ?, ?, ?)')
      .run(tenant.tenant_id, 'lease_expiring', 'Lease Renewed', `Your lease has been renewed until ${end_date}`, 'system');
  }

  db.prepare('INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)')
    .run(req.user.user_id, 'UPDATE', 'lease', lease.lease_id, `Renewed lease: ${lease.lease_number}`);

  res.json(updated);
};

exports.remove = (req, res) => {
  const db = getDatabase();
  const lease = db.prepare('SELECT * FROM leases WHERE lease_id = ?').get(req.params.id);
  if (!lease) return res.status(404).json({ error: 'Lease not found' });

  // Free the room
  if (lease.room_id) {
    db.prepare("UPDATE rooms SET status = 'available' WHERE room_id = ?").run(lease.room_id);
  }

  db.prepare("UPDATE leases SET status = 'expired' WHERE lease_id = ?").run(req.params.id);

  db.prepare('INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)')
    .run(req.user.user_id, 'DELETE', 'lease', lease.lease_id, `Terminated lease: ${lease.lease_number}`);

  res.json({ message: 'Lease terminated' });
};

exports.getExpiring = (req, res) => {
  const db = getDatabase();
  const leases = db.prepare(`
    SELECT l.*, t.first_name || ' ' || t.last_name as tenant_name, r.room_number
    FROM leases l
    LEFT JOIN tenants t ON l.tenant_id = t.tenant_id
    LEFT JOIN rooms r ON l.room_id = r.room_id
    WHERE l.status = 'active' AND l.end_date <= date('now', '+30 days')
    ORDER BY l.end_date ASC
  `).all();
  res.json(leases);
};
