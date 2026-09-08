require('dotenv').config();
const bcrypt = require('bcryptjs');
const { initializeDatabase, getDatabase } = require('./config/database');

initializeDatabase();
const db = getDatabase();

console.log('Seeding BoardersWatch database for Day N Earth Lucero Boarding House...');

// 1. Create default users
const adminPassword = bcrypt.hashSync('admin123', 10);
const staffPassword = bcrypt.hashSync('staff123', 10);

try {
  db.prepare('INSERT OR IGNORE INTO users (user_id, username, password, email, role, status) VALUES (1, ?, ?, ?, ?, ?)')
    .run('admin', adminPassword, 'admin@daynearth.com', 'admin', 'active');
  console.log('  Admin user ready: admin / admin123');
} catch (e) {}

try {
  db.prepare('INSERT OR IGNORE INTO users (user_id, username, password, email, role, status) VALUES (2, ?, ?, ?, ?, ?)')
    .run('staff', staffPassword, 'staff@daynearth.com', 'staff', 'active');
  console.log('  Staff user ready: staff / staff123');
} catch (e) {}

// 2. Settings table initialization
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const defaultSettings = [
  ['boarding_house_name', 'Day N Earth Lucero Boarding House'],
  ['owner_name', 'Vannesa Cajandig Lucero'],
  ['address', 'National Highway, Tacurong City, Sultan Kudarat'],
  ['contact_phone', '0917-123-4567'],
  ['email_contact', 'contact@daynearth.com'],
  ['currency', 'PHP'],
  ['grace_period_days', '5'],
  ['auto_lease_expiry', '30'],
  ['tapo_default_port', '554'],
  ['tapo_stream_high', 'stream1'],
  ['tapo_stream_low', 'stream2']
];

const insertSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
defaultSettings.forEach(([k, v]) => insertSetting.run(k, v));

// 3. Create 10 Rooms (matching Figure 17: 8 Occupied, 2 Vacant, Occupancy 80%)
const rooms = [
  { id: 1, number: '101', floor: 1, type: 'single', capacity: 1, rate: 3500, amenities: 'WiFi, AC, Private CR', status: 'occupied' },
  { id: 2, number: '102', floor: 1, type: 'single', capacity: 1, rate: 3500, amenities: 'WiFi, AC', status: 'occupied' },
  { id: 3, number: '103', floor: 1, type: 'double', capacity: 2, rate: 5000, amenities: 'WiFi, AC, Private CR, Balcony', status: 'occupied' },
  { id: 4, number: '104', floor: 1, type: 'single', capacity: 1, rate: 3500, amenities: 'WiFi, Desk', status: 'occupied' },
  { id: 5, number: '201', floor: 2, type: 'single', capacity: 1, rate: 3500, amenities: 'WiFi, AC', status: 'occupied' },
  { id: 6, number: '202', floor: 2, type: 'single', capacity: 1, rate: 3500, amenities: 'WiFi, AC, Private CR', status: 'occupied' },
  { id: 7, number: '203', floor: 2, type: 'double', capacity: 2, rate: 5000, amenities: 'WiFi, AC, Balcony', status: 'occupied' },
  { id: 8, number: '204', floor: 2, type: 'single', capacity: 1, rate: 3500, amenities: 'WiFi', status: 'occupied' },
  { id: 9, number: '205', floor: 2, type: 'double', capacity: 2, rate: 5000, amenities: 'WiFi, AC, Private CR', status: 'available' },
  { id: 10, number: '301', floor: 3, type: 'single', capacity: 1, rate: 4000, amenities: 'WiFi, AC, Balcony', status: 'available' },
];

const insertRoom = db.prepare('INSERT OR REPLACE INTO rooms (room_id, room_number, floor, type, capacity, monthly_rate, amenities, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
rooms.forEach(r => insertRoom.run(r.id, r.number, r.floor, r.type, r.capacity, r.rate, r.amenities, r.status));
console.log(`  Initialized ${rooms.length} rooms (8 occupied, 2 available)`);

// 4. Create 8 Registered Tenants (matching Figure 15 & 16)
const tenants = [
  { id: 1, first: 'Maria', last: 'Santos', phone: '0917-234-5678', email: 'maria.santos@email.com', emergency: 'Juan Santos (Father) - 0917-999-0001', status: 'active' },
  { id: 2, first: 'John Mark', last: 'Dela Cruz', phone: '0918-345-6789', email: 'jm.delacruz@email.com', emergency: 'Elena Dela Cruz (Mother) - 0918-999-0002', status: 'active' },
  { id: 3, first: 'Sarah Jane', last: 'Alcantara', phone: '0919-456-7890', email: 'sarah.alcantara@email.com', emergency: 'Pedro Alcantara (Father) - 0919-999-0003', status: 'active' },
  { id: 4, first: 'Michael Angelo', last: 'Tan', phone: '0920-567-8901', email: 'matan@email.com', emergency: 'Grace Tan (Sister) - 0920-999-0004', status: 'active' },
  { id: 5, first: 'Christian Paul', last: 'Ramos', phone: '0921-678-9012', email: 'cp.ramos@email.com', emergency: 'Luz Ramos (Mother) - 0921-999-0005', status: 'active' },
  { id: 6, first: 'Kimberly Mae', last: 'Flores', phone: '0922-789-0123', email: 'kim.flores@email.com', emergency: 'Robert Flores (Father) - 0922-999-0006', status: 'active' },
  { id: 7, first: 'Joshua David', last: 'Mendoza', phone: '0923-890-1234', email: 'josh.mendoza@email.com', emergency: 'Carmen Mendoza (Mother) - 0923-999-0007', status: 'active' },
  { id: 8, first: 'Angelica Rose', last: 'Bautista', phone: '0924-901-2345', email: 'angela.bautista@email.com', emergency: 'Antonio Bautista (Guardian) - 0924-999-0008', status: 'active' },
];

const insertTenant = db.prepare('INSERT OR REPLACE INTO tenants (tenant_id, first_name, last_name, phone_number, email, emergency_contact, status) VALUES (?, ?, ?, ?, ?, ?, ?)');
tenants.forEach(t => insertTenant.run(t.id, t.first, t.last, t.phone, t.email, t.emergency, t.status));
console.log(`  Initialized ${tenants.length} tenants`);

// 5. Create 8 Active Leases (matching Figure 18)
const leases = [
  { id: 1, num: 'LS-2025-001', tenant_id: 1, room_id: 1, start: '2025-06-01', end: '2026-05-31', rent: 3500, status: 'active' },
  { id: 2, num: 'LS-2025-002', tenant_id: 2, room_id: 2, start: '2025-07-01', end: '2026-06-30', rent: 3500, status: 'active' },
  { id: 3, num: 'LS-2025-003', tenant_id: 3, room_id: 3, start: '2025-08-01', end: '2026-07-31', rent: 5000, status: 'active' },
  { id: 4, num: 'LS-2025-004', tenant_id: 4, room_id: 4, start: '2025-09-01', end: '2026-08-31', rent: 3500, status: 'active' },
  { id: 5, num: 'LS-2025-005', tenant_id: 5, room_id: 5, start: '2025-09-15', end: '2026-09-14', rent: 3500, status: 'expiring_soon' },
  { id: 6, num: 'LS-2025-006', tenant_id: 6, room_id: 6, start: '2025-10-01', end: '2026-09-30', rent: 3500, status: 'active' },
  { id: 7, num: 'LS-2025-007', tenant_id: 7, room_id: 7, start: '2025-10-15', end: '2026-10-14', rent: 5000, status: 'active' },
  { id: 8, num: 'LS-2025-008', tenant_id: 8, room_id: 8, start: '2025-11-01', end: '2026-10-31', rent: 3500, status: 'active' },
];

const insertLease = db.prepare('INSERT OR REPLACE INTO leases (lease_id, lease_number, tenant_id, room_id, start_date, end_date, monthly_rent, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
leases.forEach(l => insertLease.run(l.id, l.num, l.tenant_id, l.room_id, l.start, l.end, l.rent, l.status));
console.log(`  Initialized ${leases.length} leases`);

// 6. Create Payment Records (matching Figure 19: ₱24,000 collected, 2 pending payments)
const payments = [
  { id: 1, receipt: 'RCT-2025-001', lease_id: 1, tenant: 'Maria Santos', amount: 3500, date: '2026-09-01', method: 'cash', type: 'rent' },
  { id: 2, receipt: 'RCT-2025-002', lease_id: 2, tenant: 'John Mark Dela Cruz', amount: 3500, date: '2026-09-02', method: 'bank_transfer', type: 'rent' },
  { id: 3, receipt: 'RCT-2025-003', lease_id: 3, tenant: 'Sarah Jane Alcantara', amount: 5000, date: '2026-09-03', method: 'cash', type: 'rent' },
  { id: 4, receipt: 'RCT-2025-004', lease_id: 4, tenant: 'Michael Angelo Tan', amount: 3500, date: '2026-09-04', method: 'bank_transfer', type: 'rent' },
  { id: 5, receipt: 'RCT-2025-005', lease_id: 5, tenant: 'Christian Paul Ramos', amount: 3500, date: '2026-09-05', method: 'cash', type: 'rent' },
  { id: 6, receipt: 'RCT-2025-006', lease_id: 6, tenant: 'Kimberly Mae Flores', amount: 5000, date: '2026-09-06', method: 'bank_transfer', type: 'rent' },
];

const insertPayment = db.prepare('INSERT OR REPLACE INTO payments (payment_id, receipt_number, lease_id, tenant_name, amount, payment_date, payment_method, payment_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
payments.forEach(p => insertPayment.run(p.id, p.receipt, p.lease_id, p.tenant, p.amount, p.date, p.method, p.type));
console.log(`  Initialized ${payments.length} payment records (Total: ₱24,000)`);

// 7. Configure Tapo C200 Camera
try {
  const isProd = (process.env.NODE_ENV || '').trim() === 'production';
  const cameraHost = isProd
    ? 'mnydp-2001-fd8-bc8b-1e00-6004-dad3-d9b2-bf0a.run.pinggy-free.link'
    : '192.168.254.123';
  const cameraPort = isProd ? 38605 : 554;
  const rtspUrl = `rtsp://admin123:admin1234@${cameraHost}:${cameraPort}/stream1`;

  db.prepare(`
    INSERT OR REPLACE INTO cctv_cameras (camera_id, camera_name, location, brand, rtsp_url, username, password_encrypted, ip_address, port, stream_path, motion_detection, alert_threshold, status)
    VALUES (1, 'Main Entrance - Tapo C200', 'Front Gate / Main Entrance', 'tapo', ?, 'admin123', 'admin1234', ?, ?, 'stream1', 1, 'medium', 'active')
  `).run(rtspUrl, cameraHost, cameraPort);
  console.log('  Tapo C200 camera configured: ' + rtspUrl);
} catch (e) {
  console.error('  Failed to configure Tapo camera in seed:', e.message);
}

// 9. Create System Notifications
const notifications = [
  { type: 'motion_detected', title: 'Motion Alert - Main Entrance', msg: 'Camera 1 detected motion at Front Gate', read: 0 },
  { type: 'lease_expiring', title: 'Lease Expiring Soon', msg: 'Lease LS-2025-005 for Christian Paul Ramos expires in 6 days', read: 0 },
  { type: 'payment_received', title: 'Payment Received', msg: 'Payment RCT-2025-006 received: ₱5,000 from Kimberly Mae Flores', read: 1 },
  { type: 'tenant_registered', title: 'New Tenant Registered', msg: 'Angelica Rose Bautista registered to Room 204', read: 1 },
];

const insertNotif = db.prepare('INSERT INTO notifications (type, title, message, channel, is_read) VALUES (?, ?, ?, ?, ?)');
notifications.forEach(n => insertNotif.run(n.type, n.title, n.msg, 'system', n.read));
console.log(`  Initialized ${notifications.length} notifications`);

console.log('\nDatabase seed complete!');
console.log('Login credentials:');
console.log('  Admin: admin / admin123');
console.log('  Staff: staff / staff123');
