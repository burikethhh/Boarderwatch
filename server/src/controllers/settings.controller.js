const { getDatabase } = require('../config/database');
const cameraService = require('../services/camera.service');

// Get all settings
exports.getSettings = (req, res) => {
  const db = getDatabase();

  // Create settings table if not exists
  db.exec(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  const rows = db.prepare('SELECT * FROM settings').all();
  const settings = {};
  rows.forEach(r => { settings[r.key] = r.value; });

  // Camera brand presets
  const BRAND_PRESETS = {
    tapo: { name: 'TP-Link Tapo', rtspFormat: 'rtsp://{user}:{pass}@{ip}:{port}/{stream}', defaultPort: 554, streams: { high: 'stream1', standard: 'stream2' } },
    hikvision: { name: 'Hikvision', rtspFormat: 'rtsp://{user}:{pass}@{ip}:{port}/ISAPI/streaming/channels/101', defaultPort: 554, streams: { high: '101', standard: '102' } },
    dahua: { name: 'Dahua', rtspFormat: 'rtsp://{user}:{pass}@{ip}:{port}/cam/realmonitor?channel=1&subtype=0', defaultPort: 554, streams: { high: '0', standard: '1' } },
    generic: { name: 'Generic RTSP', rtspFormat: 'rtsp://{user}:{pass}@{ip}:{port}{streamPath}', defaultPort: 554, streams: { high: '/stream1', standard: '/stream2' } },
  };

  res.json({ settings, presets: BRAND_PRESETS });
};

// Update settings
exports.updateSettings = (req, res) => {
  const db = getDatabase();

  db.exec(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  const { settings } = req.body;
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: 'Settings object required' });
  }

  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)');

  const transaction = db.transaction(() => {
    Object.entries(settings).forEach(([key, value]) => {
      upsert.run(key, String(value));
    });
  });

  transaction();

  db.prepare('INSERT INTO activity_logs (user_id, action, entity_type, details) VALUES (?, ?, ?, ?)')
    .run(req.user.user_id, 'UPDATE', 'settings', `Updated settings: ${Object.keys(settings).join(', ')}`);

  res.json({ message: 'Settings updated' });
};

// Bulk room update
exports.bulkUpdateRooms = (req, res) => {
  const db = getDatabase();
  const { rooms } = req.body;

  if (!Array.isArray(rooms)) {
    return res.status(400).json({ error: 'Rooms array required' });
  }

  const upsert = db.prepare(`
    INSERT INTO rooms (room_number, floor, type, capacity, monthly_rate, amenities, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(room_number) DO UPDATE SET
      floor = excluded.floor,
      type = excluded.type,
      capacity = excluded.capacity,
      monthly_rate = excluded.monthly_rate,
      amenities = excluded.amenities
  `);

  const transaction = db.transaction(() => {
    rooms.forEach(r => {
      upsert.run(
        r.room_number,
        r.floor || 1,
        r.type || 'single',
        r.capacity || 1,
        r.monthly_rate,
        r.amenities || '',
        r.status || 'available'
      );
    });
  });

  transaction();

  res.json({ message: `${rooms.length} rooms updated`, count: rooms.length });
};

// Camera connection test
exports.testCamera = async (req, res) => {
  const { rtsp_url, brand, ip_address, username, password, port, stream_path } = req.body;

  const BRAND_PRESETS = {
    tapo: { rtspFormat: 'rtsp://{user}:{pass}@{ip}:{port}/{stream}', defaultPort: 554, streams: { high: 'stream1' } },
    hikvision: { rtspFormat: 'rtsp://{user}:{pass}@{ip}:{port}/ISAPI/streaming/channels/101', defaultPort: 554, streams: { high: '101' } },
    dahua: { rtspFormat: 'rtsp://{user}:{pass}@{ip}:{port}/cam/realmonitor?channel=1&subtype=0', defaultPort: 554, streams: { high: '0' } },
    generic: { rtspFormat: 'rtsp://{user}:{pass}@{ip}:{port}{streamPath}', defaultPort: 554, streams: { high: '/stream1' } },
  };

  // Build RTSP URL
  let url = rtsp_url;
  if (!url && brand) {
    const preset = BRAND_PRESETS[brand] || BRAND_PRESETS.generic;
    url = preset.rtspFormat
      .replace('{user}', username || '')
      .replace('{pass}', password || '')
      .replace('{ip}', ip_address || '')
      .replace('{port}', port || preset.defaultPort)
      .replace('{stream}', stream_path || preset.streams.high)
      .replace('{streamPath}', stream_path || '/stream1');
  }

  // Validate inputs
  const isValidIp = ip_address && /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip_address);
  const hasCredentials = username && password;

  if (!isValidIp) {
    return res.json({ success: false, message: 'Invalid IP address format', url });
  }

  if (!hasCredentials) {
    return res.json({ success: false, message: 'Username and password required', url });
  }

  // Use FFmpeg to probe the actual RTSP stream
  const result = await cameraService.probeCamera(url, 10000);

  res.json({
    success: result.reachable,
    message: result.reachable
      ? `Connection successful to ${ip_address}`
      : `Cannot reach ${ip_address}: ${result.error}`,
    url,
    stream_info: result.reachable ? {
      codec: result.codec,
      resolution: result.resolution,
    } : null,
  });
};
