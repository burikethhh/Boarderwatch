const { getDatabase } = require('../config/database');

exports.list = (req, res) => {
  const db = getDatabase();
  const { status, floor } = req.query;

  let query = 'SELECT * FROM rooms WHERE 1=1';
  const params = [];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  if (floor) {
    query += ' AND floor = ?';
    params.push(floor);
  }

  query += ' ORDER BY room_number ASC';
  const rooms = db.prepare(query).all(...params);
  res.json(rooms);
};

exports.getById = (req, res) => {
  const db = getDatabase();
  const room = db.prepare('SELECT * FROM rooms WHERE room_id = ?').get(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json(room);
};

exports.create = (req, res) => {
  const db = getDatabase();
  const { room_number, floor, type, capacity, monthly_rate, amenities } = req.body;

  if (!room_number || !monthly_rate) {
    return res.status(400).json({ error: 'Room number and monthly rate are required' });
  }

  const result = db.prepare(
    'INSERT INTO rooms (room_number, floor, type, capacity, monthly_rate, amenities) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(room_number, floor || 1, type || 'single', capacity || 1, monthly_rate, amenities || null);

  const room = db.prepare('SELECT * FROM rooms WHERE room_id = ?').get(result.lastInsertRowid);

  db.prepare('INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)')
    .run(req.user.user_id, 'CREATE', 'room', room.room_id, `Created room: ${room.room_number}`);

  res.status(201).json(room);
};

exports.update = (req, res) => {
  const db = getDatabase();
  const { room_number, floor, type, capacity, monthly_rate, amenities, status } = req.body;

  const existing = db.prepare('SELECT * FROM rooms WHERE room_id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Room not found' });

  db.prepare(
    'UPDATE rooms SET room_number = ?, floor = ?, type = ?, capacity = ?, monthly_rate = ?, amenities = ?, status = ? WHERE room_id = ?'
  ).run(
    room_number || existing.room_number,
    floor !== undefined ? floor : existing.floor,
    type || existing.type,
    capacity !== undefined ? capacity : existing.capacity,
    monthly_rate || existing.monthly_rate,
    amenities !== undefined ? amenities : existing.amenities,
    status || existing.status,
    req.params.id
  );

  const room = db.prepare('SELECT * FROM rooms WHERE room_id = ?').get(req.params.id);

  db.prepare('INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)')
    .run(req.user.user_id, 'UPDATE', 'room', room.room_id, `Updated room: ${room.room_number}`);

  res.json(room);
};

exports.remove = (req, res) => {
  const db = getDatabase();
  const room = db.prepare('SELECT * FROM rooms WHERE room_id = ?').get(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  db.prepare('DELETE FROM rooms WHERE room_id = ?').run(req.params.id);

  db.prepare('INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)')
    .run(req.user.user_id, 'DELETE', 'room', room.room_id, `Deleted room: ${room.room_number}`);

  res.json({ message: 'Room deleted' });
};

exports.stats = (req, res) => {
  const db = getDatabase();
  const total = db.prepare('SELECT COUNT(*) as count FROM rooms').get().count;
  const occupied = db.prepare("SELECT COUNT(*) as count FROM rooms WHERE status = 'occupied'").get().count;
  const available = db.prepare("SELECT COUNT(*) as count FROM rooms WHERE status = 'available'").get().count;
  const maintenance = db.prepare("SELECT COUNT(*) as count FROM rooms WHERE status = 'maintenance'").get().count;

  res.json({
    total,
    occupied,
    available,
    maintenance,
    occupancyRate: total > 0 ? Math.round((occupied / total) * 100) : 0,
  });
};
