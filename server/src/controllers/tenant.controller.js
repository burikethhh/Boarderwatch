const { getDatabase } = require('../config/database');

exports.list = (req, res) => {
  const db = getDatabase();
  const { search, status } = req.query;

  let query = 'SELECT * FROM tenants WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (first_name LIKE ? OR last_name LIKE ? OR phone_number LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC';
  const tenants = db.prepare(query).all(...params);
  res.json(tenants);
};

exports.getById = (req, res) => {
  const db = getDatabase();
  const tenant = db.prepare('SELECT * FROM tenants WHERE tenant_id = ?').get(req.params.id);
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
  res.json(tenant);
};

exports.create = (req, res) => {
  const db = getDatabase();
  const { first_name, last_name, phone_number, email, emergency_contact } = req.body;

  if (!first_name || !last_name) {
    return res.status(400).json({ error: 'First name and last name are required' });
  }

  const result = db.prepare(
    'INSERT INTO tenants (first_name, last_name, phone_number, email, emergency_contact) VALUES (?, ?, ?, ?, ?)'
  ).run(first_name, last_name, phone_number || null, email || null, emergency_contact || null);

  const tenant = db.prepare('SELECT * FROM tenants WHERE tenant_id = ?').get(result.lastInsertRowid);

  // Create notification
  db.prepare('INSERT INTO notifications (type, title, message, channel) VALUES (?, ?, ?, ?)')
    .run('tenant_registered', 'New Tenant Registered', `${first_name} ${last_name} has been registered`, 'system');

  // Log activity
  db.prepare('INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)')
    .run(req.user.user_id, 'CREATE', 'tenant', tenant.tenant_id, `Registered tenant: ${first_name} ${last_name}`);

  res.status(201).json(tenant);
};

exports.update = (req, res) => {
  const db = getDatabase();
  const { first_name, last_name, phone_number, email, emergency_contact, status } = req.body;

  const existing = db.prepare('SELECT * FROM tenants WHERE tenant_id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Tenant not found' });

  db.prepare(
    'UPDATE tenants SET first_name = ?, last_name = ?, phone_number = ?, email = ?, emergency_contact = ?, status = ? WHERE tenant_id = ?'
  ).run(
    first_name || existing.first_name,
    last_name || existing.last_name,
    phone_number !== undefined ? phone_number : existing.phone_number,
    email !== undefined ? email : existing.email,
    emergency_contact !== undefined ? emergency_contact : existing.emergency_contact,
    status || existing.status,
    req.params.id
  );

  const tenant = db.prepare('SELECT * FROM tenants WHERE tenant_id = ?').get(req.params.id);

  db.prepare('INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)')
    .run(req.user.user_id, 'UPDATE', 'tenant', tenant.tenant_id, `Updated tenant: ${tenant.first_name} ${tenant.last_name}`);

  res.json(tenant);
};

exports.remove = (req, res) => {
  const db = getDatabase();
  const tenant = db.prepare('SELECT * FROM tenants WHERE tenant_id = ?').get(req.params.id);
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

  const transaction = db.transaction(() => {
    // Deactivate tenant
    db.prepare('UPDATE tenants SET status = ? WHERE tenant_id = ?').run('inactive', req.params.id);

    // Terminate active leases and free rooms
    const activeLeases = db.prepare("SELECT lease_id, room_id FROM leases WHERE tenant_id = ? AND status IN ('active', 'expiring_soon')").all(req.params.id);
    for (const lease of activeLeases) {
      db.prepare("UPDATE leases SET status = 'expired' WHERE lease_id = ?").run(lease.lease_id);
      if (lease.room_id) {
        db.prepare("UPDATE rooms SET status = 'available' WHERE room_id = ?").run(lease.room_id);
      }
    }
  });

  transaction();

  db.prepare('INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)')
    .run(req.user.user_id, 'DELETE', 'tenant', tenant.tenant_id, `Deactivated tenant: ${tenant.first_name} ${tenant.last_name}`);

  res.json({ message: 'Tenant deactivated' });
};
