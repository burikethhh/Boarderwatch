require('dotenv').config();
const bcrypt = require('bcryptjs');
const { initializeDatabase, getDatabase } = require('./config/database');

initializeDatabase();
const db = getDatabase();

console.log('Seeding database...');

// Create admin user
const adminPassword = bcrypt.hashSync('admin123', 10);
const staffPassword = bcrypt.hashSync('staff123', 10);

try {
  db.prepare('INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)').run('admin', adminPassword, 'admin@boarderswatch.com', 'admin');
  console.log('Created admin user: admin / admin123');
} catch (e) {
  console.log('Admin user already exists');
}

try {
  db.prepare('INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)').run('staff', staffPassword, 'staff@boarderswatch.com', 'staff');
  console.log('Created staff user: staff / staff123');
} catch (e) {
  console.log('Staff user already exists');
}

// Create rooms
const rooms = [
  { number: '101', floor: 1, type: 'single', capacity: 1, rate: 3500, amenities: 'WiFi, AC' },
  { number: '102', floor: 1, type: 'single', capacity: 1, rate: 3500, amenities: 'WiFi, AC' },
  { number: '103', floor: 1, type: 'double', capacity: 2, rate: 5000, amenities: 'WiFi, AC, Private CR' },
  { number: '104', floor: 1, type: 'single', capacity: 1, rate: 3500, amenities: 'WiFi' },
  { number: '201', floor: 2, type: 'single', capacity: 1, rate: 3500, amenities: 'WiFi, AC' },
  { number: '202', floor: 2, type: 'single', capacity: 1, rate: 3500, amenities: 'WiFi, AC' },
  { number: '203', floor: 2, type: 'double', capacity: 2, rate: 5000, amenities: 'WiFi, AC, Private CR, Balcony' },
  { number: '204', floor: 2, type: 'single', capacity: 1, rate: 3500, amenities: 'WiFi' },
  { number: '205', floor: 2, type: 'double', capacity: 2, rate: 5000, amenities: 'WiFi, AC, Private CR' },
  { number: '301', floor: 3, type: 'single', capacity: 1, rate: 4000, amenities: 'WiFi, AC, Balcony' },
];

const insertRoom = db.prepare('INSERT OR IGNORE INTO rooms (room_number, floor, type, capacity, monthly_rate, amenities) VALUES (?, ?, ?, ?, ?, ?)');

rooms.forEach(r => {
  insertRoom.run(r.number, r.floor, r.type, r.capacity, r.rate, r.amenities);
});
console.log(`Created ${rooms.length} rooms`);

// Create sample cameras
const cameras = [
  { name: 'CAM 1 - MAIN ENTRANCE', location: 'Front Door', brand: 'tapo', ip: '192.168.1.101', user: 'admin', pass: 'admin123' },
  { name: 'CAM 2 - HALLWAY', location: 'Second Floor Hallway', brand: 'tapo', ip: '192.168.1.102', user: 'admin', pass: 'admin123' },
];

const insertCamera = db.prepare(
  "INSERT OR IGNORE INTO cctv_cameras (camera_name, location, brand, rtsp_url, username, password_encrypted, ip_address, port, stream_path) VALUES (?, ?, ?, ?, ?, ?, ?, 554, 'stream1')"
);

cameras.forEach(c => {
  const rtspUrl = `rtsp://${c.user}:${c.pass}@${c.ip}:554/stream1`;
  insertCamera.run(c.name, c.location, c.brand, rtspUrl, c.user, c.pass, c.ip);
});
console.log(`Created ${cameras.length} cameras`);

console.log('Seed complete!');
console.log('');
console.log('Login credentials:');
console.log('  Admin: admin / admin123');
console.log('  Staff: staff / staff123');
