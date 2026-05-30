const { getDatabase } = require('../config/database');
const cameraService = require('../services/camera.service');
const notificationService = require('../services/notification.service');

const BRAND_PRESETS = {
  tapo: {
    name: 'TP-Link Tapo',
    rtspFormat: 'rtsp://{user}:{pass}@{ip}:{port}/{stream}',
    defaultPort: 554,
    streams: { high: 'stream1', standard: 'stream2' },
    motionWebhook: true,
  },
  hikvision: {
    name: 'Hikvision',
    rtspFormat: 'rtsp://{user}:{pass}@{ip}:{port}/ISAPI/streaming/channels/101',
    defaultPort: 554,
    streams: { high: '101', standard: '102' },
    motionWebhook: true,
  },
  dahua: {
    name: 'Dahua',
    rtspFormat: 'rtsp://{user}:{pass}@{ip}:{port}/cam/realmonitor?channel=1&subtype=0',
    defaultPort: 554,
    streams: { high: '0', standard: '1' },
    motionWebhook: true,
  },
  generic: {
    name: 'Generic RTSP',
    rtspFormat: 'rtsp://{user}:{pass}@{ip}:{port}{streamPath}',
    defaultPort: 554,
    streams: { high: '/stream1', standard: '/stream2' },
    motionWebhook: false,
  },
};

function buildRtspUrl(camera) {
  const preset = BRAND_PRESETS[camera.brand] || BRAND_PRESETS.generic;
  return preset.rtspFormat
    .replace('{user}', camera.username || '')
    .replace('{pass}', camera.password_encrypted || '')
    .replace('{ip}', camera.ip_address)
    .replace('{port}', camera.port || 554)
    .replace('{stream}', camera.stream_path || 'stream1')
    .replace('{streamPath}', camera.stream_path || '/stream1');
}

exports.presets = (req, res) => {
  res.json(BRAND_PRESETS);
};

exports.list = (req, res) => {
  const db = getDatabase();
  const cameras = db.prepare('SELECT * FROM cctv_cameras ORDER BY camera_id ASC').all();
  // Remove passwords from response
  const safe = cameras.map(c => ({ ...c, password_encrypted: c.password_encrypted ? '••••••' : null }));
  res.json(safe);
};

exports.getById = (req, res) => {
  const db = getDatabase();
  const camera = db.prepare('SELECT * FROM cctv_cameras WHERE camera_id = ?').get(req.params.id);
  if (!camera) return res.status(404).json({ error: 'Camera not found' });
  camera.password_encrypted = camera.password_encrypted ? '••••••' : null;
  res.json(camera);
};

exports.create = (req, res) => {
  const db = getDatabase();
  const { camera_name, location, brand, ip_address, username, password, port, stream_path, motion_detection, alert_threshold } = req.body;

  if (!camera_name || !ip_address) {
    return res.status(400).json({ error: 'Camera name and IP address are required' });
  }

  // Build RTSP URL automatically
  const cameraBrand = brand || 'generic';
  const preset = BRAND_PRESETS[cameraBrand] || BRAND_PRESETS.generic;
  const rtspPort = port || preset.defaultPort;
  const stream = stream_path || preset.streams.high;

  const rtspUrl = preset.rtspFormat
    .replace('{user}', username || '')
    .replace('{pass}', password || '')
    .replace('{ip}', ip_address)
    .replace('{port}', rtspPort)
    .replace('{stream}', stream)
    .replace('{streamPath}', stream.includes('/') ? stream : `/${stream}`);

  const result = db.prepare(
    `INSERT INTO cctv_cameras (camera_name, location, brand, rtsp_url, username, password_encrypted, ip_address, port, stream_path, motion_detection, alert_threshold)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    camera_name, location || null, cameraBrand, rtspUrl,
    username || null, password || null, ip_address,
    rtspPort, stream,
    motion_detection !== undefined ? motion_detection : 1,
    alert_threshold || 'medium'
  );

  const camera = db.prepare('SELECT * FROM cctv_cameras WHERE camera_id = ?').get(result.lastInsertRowid);

  db.prepare('INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)')
    .run(req.user.user_id, 'CREATE', 'camera', camera.camera_id, `Added camera: ${camera_name} (${cameraBrand})`);

  camera.password_encrypted = camera.password_encrypted ? '••••••' : null;
  res.status(201).json(camera);
};

exports.update = (req, res) => {
  const db = getDatabase();
  const existing = db.prepare('SELECT * FROM cctv_cameras WHERE camera_id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Camera not found' });

  const { camera_name, location, brand, ip_address, username, password, port, stream_path, motion_detection, alert_threshold, status } = req.body;

  const newBrand = brand || existing.brand;
  const newIp = ip_address || existing.ip_address;
  const newPort = port || existing.port;
  const newStream = stream_path || existing.stream_path;
  const newUsername = username || existing.username;
  const newPass = password || existing.password_encrypted;

  const preset = BRAND_PRESETS[newBrand] || BRAND_PRESETS.generic;
  const rtspUrl = preset.rtspFormat
    .replace('{user}', newUsername || '')
    .replace('{pass}', newPass || '')
    .replace('{ip}', newIp)
    .replace('{port}', newPort)
    .replace('{stream}', newStream)
    .replace('{streamPath}', newStream.includes('/') ? newStream : `/${newStream}`);

  db.prepare(
    `UPDATE cctv_cameras SET camera_name = ?, location = ?, brand = ?, rtsp_url = ?, username = ?, password_encrypted = ?,
     ip_address = ?, port = ?, stream_path = ?, motion_detection = ?, alert_threshold = ?, status = ? WHERE camera_id = ?`
  ).run(
    camera_name || existing.camera_name,
    location !== undefined ? location : existing.location,
    newBrand, rtspUrl, newUsername,
    password || existing.password_encrypted,
    newIp, newPort, newStream,
    motion_detection !== undefined ? motion_detection : existing.motion_detection,
    alert_threshold || existing.alert_threshold,
    status || existing.status,
    req.params.id
  );

  const camera = db.prepare('SELECT * FROM cctv_cameras WHERE camera_id = ?').get(req.params.id);
  camera.password_encrypted = camera.password_encrypted ? '••••••' : null;
  res.json(camera);
};

exports.remove = (req, res) => {
  const db = getDatabase();
  const camera = db.prepare('SELECT * FROM cctv_cameras WHERE camera_id = ?').get(req.params.id);
  if (!camera) return res.status(404).json({ error: 'Camera not found' });

  db.prepare('DELETE FROM cctv_cameras WHERE camera_id = ?').run(req.params.id);

  db.prepare('INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)')
    .run(req.user.user_id, 'DELETE', 'camera', camera.camera_id, `Removed camera: ${camera.camera_name}`);

  res.json({ message: 'Camera removed' });
};

exports.testConnection = async (req, res) => {
  const db = getDatabase();
  const camera = db.prepare('SELECT * FROM cctv_cameras WHERE camera_id = ?').get(req.params.id);
  if (!camera) return res.status(404).json({ error: 'Camera not found' });

  const result = await cameraService.probeCamera(camera.rtsp_url, 10000);

  if (result.reachable) {
    db.prepare("UPDATE cctv_cameras SET status = 'active', last_health_check = CURRENT_TIMESTAMP WHERE camera_id = ?")
      .run(camera.camera_id);
  }

  res.json({
    success: result.reachable,
    message: result.reachable
      ? `Connected to ${camera.camera_name}`
      : `Cannot reach ${camera.camera_name}: ${result.error}`,
    rtspUrl: camera.rtsp_url,
    status: result.reachable ? 'reachable' : 'unreachable',
    stream_info: result.reachable ? { resolution: result.resolution, codec: result.codec } : null,
  });
};

exports.webhook = async (req, res) => {
  const db = getDatabase();
  const { camera_id, type, description } = req.body;

  if (!camera_id) {
    return res.status(400).json({ error: 'camera_id is required' });
  }

  const camera = db.prepare('SELECT * FROM cctv_cameras WHERE camera_id = ?').get(camera_id);
  if (!camera) return res.status(404).json({ error: 'Camera not found' });

  // Use notification service for full alert flow (notification + SMS + email)
  const result = await notificationService.handleMotionAlert(camera);

  res.json({ success: true, ...result });
};
