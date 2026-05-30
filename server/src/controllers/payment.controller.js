const { getDatabase } = require('../config/database');
const notificationService = require('../services/notification.service');

function generateReceiptNumber(db) {
  const year = new Date().getFullYear();
  const last = db.prepare("SELECT receipt_number FROM payments ORDER BY payment_id DESC LIMIT 1").get();
  let num = 1;
  if (last && last.receipt_number) {
    const match = last.receipt_number.match(/(\d+)$/);
    if (match) num = parseInt(match[1]) + 1;
  }
  return `RCT-${year}-${String(num).padStart(3, '0')}`;
}

exports.list = (req, res) => {
  const db = getDatabase();
  const { lease_id, payment_type } = req.query;

  let query = `
    SELECT p.*, l.lease_number, l.monthly_rent
    FROM payments p
    LEFT JOIN leases l ON p.lease_id = l.lease_id
    WHERE 1=1
  `;
  const params = [];

  if (lease_id) {
    query += ' AND p.lease_id = ?';
    params.push(lease_id);
  }

  if (payment_type) {
    query += ' AND p.payment_type = ?';
    params.push(payment_type);
  }

  query += ' ORDER BY p.payment_date DESC';
  const payments = db.prepare(query).all(...params);
  res.json(payments);
};

exports.getById = (req, res) => {
  const db = getDatabase();
  const payment = db.prepare(`
    SELECT p.*, l.lease_number, l.monthly_rent
    FROM payments p
    LEFT JOIN leases l ON p.lease_id = l.lease_id
    WHERE p.payment_id = ?
  `).get(req.params.id);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  res.json(payment);
};

exports.create = (req, res) => {
  const db = getDatabase();
  const { lease_id, tenant_name, amount, payment_date, payment_method, payment_type } = req.body;

  if (!lease_id || !amount || !payment_date) {
    return res.status(400).json({ error: 'Lease, amount, and date are required' });
  }

  const receipt_number = generateReceiptNumber(db);

  const result = db.prepare(
    'INSERT INTO payments (receipt_number, lease_id, tenant_name, amount, payment_date, payment_method, payment_type) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(receipt_number, lease_id, tenant_name || null, amount, payment_date, payment_method || 'cash', payment_type || 'rent');

  const payment = db.prepare('SELECT * FROM payments WHERE payment_id = ?').get(result.lastInsertRowid);

  // Get tenant info for notification
  const lease = db.prepare('SELECT * FROM leases WHERE lease_id = ?').get(lease_id);
  const tenant = lease ? db.prepare('SELECT * FROM tenants WHERE tenant_id = ?').get(lease.tenant_id) : null;

  // Use notification service for full notification flow
  notificationService.handlePaymentReceived(payment, tenant).catch(err => {
    console.error('Payment notification error:', err.message);
  });

  db.prepare('INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)')
    .run(req.user.user_id, 'CREATE', 'payment', payment.payment_id, `Recorded payment: ${receipt_number} - ₱${amount}`);

  res.status(201).json(payment);
};

exports.getReceipt = (req, res) => {
  const db = getDatabase();
  const payment = db.prepare(`
    SELECT p.*, l.lease_number, l.monthly_rent, l.start_date, l.end_date,
           t.first_name || ' ' || t.last_name as full_tenant_name, t.phone_number, t.email,
           r.room_number
    FROM payments p
    LEFT JOIN leases l ON p.lease_id = l.lease_id
    LEFT JOIN tenants t ON l.tenant_id = t.tenant_id
    LEFT JOIN rooms r ON l.room_id = r.room_id
    WHERE p.payment_id = ?
  `).get(req.params.id);

  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  res.json(payment);
};

exports.stats = (req, res) => {
  const db = getDatabase();
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;

  const collected = db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE payment_date BETWEEN ? AND ?"
  ).get(monthStart, monthEnd).total;

  const pending = db.prepare(`
    SELECT COALESCE(SUM(l.monthly_rent), 0) as total
    FROM leases l
    WHERE l.status = 'active'
    AND l.lease_id NOT IN (
      SELECT lease_id FROM payments WHERE payment_date BETWEEN ? AND ?
    )
  `).get(monthStart, monthEnd).total;

  const totalLeases = db.prepare("SELECT COUNT(*) as count FROM leases WHERE status = 'active'").get().count;
  const collectionRate = totalLeases > 0 ? Math.round((collected / (collected + pending)) * 100) || 0 : 0;

  res.json({ collected, pending, collectionRate });
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
