const { getDatabase } = require('../config/database');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

exports.tenantReport = async (req, res) => {
  const db = getDatabase();
  const { format } = req.query;

  const tenants = db.prepare(`
    SELECT t.*, l.lease_number, l.end_date as lease_end, r.room_number
    FROM tenants t
    LEFT JOIN leases l ON t.tenant_id = l.tenant_id AND l.status = 'active'
    LEFT JOIN rooms r ON l.room_id = r.room_id
    WHERE t.status = 'active'
    ORDER BY t.last_name, t.first_name
  `).all();

  if (format === 'excel') {
    return exportTenantsExcel(res, tenants);
  }

  if (format === 'pdf') {
    return exportTenantsPDF(res, tenants);
  }

  res.json(tenants);
};

exports.paymentReport = async (req, res) => {
  const db = getDatabase();
  const { format, start_date, end_date } = req.query;

  let query = `
    SELECT p.*, l.lease_number
    FROM payments p
    LEFT JOIN leases l ON p.lease_id = l.lease_id
    WHERE 1=1
  `;
  const params = [];

  if (start_date) {
    query += ' AND p.payment_date >= ?';
    params.push(start_date);
  }

  if (end_date) {
    query += ' AND p.payment_date <= ?';
    params.push(end_date);
  }

  query += ' ORDER BY p.payment_date DESC';
  const payments = db.prepare(query).all(...params);

  const total = payments.reduce((sum, p) => sum + p.amount, 0);

  if (format === 'excel') {
    return exportPaymentsExcel(res, payments, total);
  }

  if (format === 'pdf') {
    return exportPaymentsPDF(res, payments, total);
  }

  res.json({ payments, total });
};

exports.occupancyReport = async (req, res) => {
  const db = getDatabase();
  const { format } = req.query;

  const stats = {
    total: db.prepare('SELECT COUNT(*) as count FROM rooms').get().count,
    occupied: db.prepare("SELECT COUNT(*) as count FROM rooms WHERE status = 'occupied'").get().count,
    available: db.prepare("SELECT COUNT(*) as count FROM rooms WHERE status = 'available'").get().count,
    maintenance: db.prepare("SELECT COUNT(*) as count FROM rooms WHERE status = 'maintenance'").get().count,
  };
  stats.occupancyRate = stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0;

  const rooms = db.prepare(`
    SELECT r.*, l.lease_number, l.end_date as lease_end,
           t.first_name || ' ' || t.last_name as tenant_name
    FROM rooms r
    LEFT JOIN leases l ON r.room_id = l.room_id AND l.status = 'active'
    LEFT JOIN tenants t ON l.tenant_id = t.tenant_id
    ORDER BY r.room_number
  `).all();

  if (format === 'excel') {
    return exportOccupancyExcel(res, stats, rooms);
  }

  if (format === 'pdf') {
    return exportOccupancyPDF(res, stats, rooms);
  }

  res.json({ stats, rooms });
};

exports.securityReport = (req, res) => {
  const db = getDatabase();
  const { format } = req.query;

  const alerts = db.prepare(`
    SELECT a.*, c.camera_name, c.location
    FROM cctv_alerts a
    LEFT JOIN cctv_cameras c ON a.camera_id = c.camera_id
    ORDER BY a.timestamp DESC
  `).all();

  const stats = {
    total: alerts.length,
    unacknowledged: alerts.filter(a => !a.is_acknowledged).length,
    byType: {
      motion: alerts.filter(a => a.alert_type === 'motion').length,
      offline: alerts.filter(a => a.alert_type === 'offline').length,
      tampering: alerts.filter(a => a.alert_type === 'tampering').length,
    },
  };

  if (format === 'pdf') {
    return exportSecurityPDF(res, alerts, stats);
  }

  res.json({ alerts, stats });
};

async function exportTenantsExcel(res, tenants) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Tenants');

  sheet.columns = [
    { header: 'ID', key: 'tenant_id', width: 8 },
    { header: 'Name', key: 'full_name', width: 25 },
    { header: 'Phone', key: 'phone_number', width: 15 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Room', key: 'room_number', width: 10 },
    { header: 'Lease End', key: 'lease_end', width: 12 },
    { header: 'Status', key: 'status', width: 10 },
  ];

  tenants.forEach(t => {
    sheet.addRow({
      tenant_id: t.tenant_id,
      full_name: `${t.first_name} ${t.last_name}`,
      phone_number: t.phone_number || '-',
      email: t.email || '-',
      room_number: t.room_number || '-',
      lease_end: t.lease_end || '-',
      status: t.status,
    });
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=tenants_report.xlsx');
  await workbook.xlsx.write(res);
  res.end();
}

function exportTenantsPDF(res, tenants) {
  const doc = new PDFDocument({ margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=tenants_report.pdf');
  doc.pipe(res);

  doc.fontSize(18).text('BoardersWatch - Tenant Report', { align: 'center' });
  doc.moveDown();
  doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString()}`);
  doc.moveDown();

  tenants.forEach(t => {
    doc.fontSize(11).text(`${t.first_name} ${t.last_name}`);
    doc.fontSize(9).text(`  Phone: ${t.phone_number || '-'} | Email: ${t.email || '-'}`);
    doc.fontSize(9).text(`  Room: ${t.room_number || '-'} | Lease End: ${t.lease_end || '-'}`);
    doc.moveDown(0.5);
  });

  doc.end();
}

async function exportPaymentsExcel(res, payments, total) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Payments');

  sheet.columns = [
    { header: 'Receipt #', key: 'receipt_number', width: 18 },
    { header: 'Tenant', key: 'tenant_name', width: 25 },
    { header: 'Amount', key: 'amount', width: 12 },
    { header: 'Date', key: 'payment_date', width: 12 },
    { header: 'Method', key: 'payment_method', width: 15 },
    { header: 'Type', key: 'payment_type', width: 10 },
  ];

  payments.forEach(p => {
    sheet.addRow({
      receipt_number: p.receipt_number,
      tenant_name: p.tenant_name || '-',
      amount: p.amount,
      payment_date: p.payment_date,
      payment_method: p.payment_method,
      payment_type: p.payment_type,
    });
  });
  sheet.addRow({});
  sheet.addRow({ receipt_number: 'TOTAL', amount: total });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=payments_report.xlsx');
  await workbook.xlsx.write(res);
  res.end();
}

function exportPaymentsPDF(res, payments, total) {
  const doc = new PDFDocument({ margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=payments_report.pdf');
  doc.pipe(res);

  doc.fontSize(18).text('BoardersWatch - Payment Report', { align: 'center' });
  doc.moveDown();
  doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString()}`);
  doc.moveDown();

  payments.forEach(p => {
    doc.fontSize(10).text(`${p.receipt_number} | ${p.tenant_name || 'N/A'} | ₱${p.amount} | ${p.payment_date}`);
  });

  doc.moveDown();
  doc.fontSize(12).text(`Total: ₱${total}`, { align: 'right' });
  doc.end();
}

async function exportOccupancyExcel(res, stats, rooms) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Occupancy');

  sheet.addRow({ A: 'Occupancy Summary' });
  sheet.addRow({ A: 'Total Rooms', B: stats.total });
  sheet.addRow({ A: 'Occupied', B: stats.occupied });
  sheet.addRow({ A: 'Available', B: stats.available });
  sheet.addRow({ A: 'Maintenance', B: stats.maintenance });
  sheet.addRow({ A: 'Occupancy Rate', B: `${stats.occupancyRate}%` });
  sheet.addRow({});

  sheet.columns = [
    { header: 'Room #', key: 'room_number', width: 10 },
    { header: 'Type', key: 'type', width: 10 },
    { header: 'Rate', key: 'monthly_rate', width: 12 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Tenant', key: 'tenant_name', width: 25 },
  ];

  rooms.forEach(r => {
    sheet.addRow({
      room_number: r.room_number,
      type: r.type,
      monthly_rate: r.monthly_rate,
      status: r.status,
      tenant_name: r.tenant_name || '-',
    });
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=occupancy_report.xlsx');
  await workbook.xlsx.write(res);
  res.end();
}

function exportOccupancyPDF(res, stats, rooms) {
  const doc = new PDFDocument({ margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=occupancy_report.pdf');
  doc.pipe(res);

  doc.fontSize(18).text('BoardersWatch - Occupancy Report', { align: 'center' });
  doc.moveDown();
  doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString()}`);
  doc.moveDown();
  doc.fontSize(11).text(`Total: ${stats.total} | Occupied: ${stats.occupied} | Available: ${stats.available} | Maintenance: ${stats.maintenance}`);
  doc.fontSize(11).text(`Occupancy Rate: ${stats.occupancyRate}%`);
  doc.moveDown();

  rooms.forEach(r => {
    doc.fontSize(10).text(`Room ${r.room_number} | ${r.type} | ₱${r.monthly_rate} | ${r.status} | ${r.tenant_name || '-'}`);
  });

  doc.end();
}

function exportSecurityPDF(res, alerts, stats) {
  const doc = new PDFDocument({ margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=security_report.pdf');
  doc.pipe(res);

  doc.fontSize(18).text('BoardersWatch - Security Report', { align: 'center' });
  doc.moveDown();
  doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString()}`);
  doc.moveDown();
  doc.fontSize(11).text(`Total Alerts: ${stats.total} | Unacknowledged: ${stats.unacknowledged}`);
  doc.fontSize(11).text(`Motion: ${stats.byType.motion} | Offline: ${stats.byType.offline} | Tampering: ${stats.byType.tampering}`);
  doc.moveDown();

  alerts.forEach(a => {
    doc.fontSize(10).text(`[${a.alert_type.toUpperCase()}] ${a.camera_name || 'Unknown'} - ${a.description || '-'}`);
    doc.fontSize(8).text(`  ${a.timestamp} | ${a.is_acknowledged ? 'Acknowledged' : 'PENDING'}`);
  });

  doc.end();
}
