const { getDatabase } = require('../config/database');
const { BRAND_PRESETS, buildRtspUrl } = require('../config/brandPresets');
const cameraService = require('../services/camera.service');
const notificationService = require('../services/notification.service');
const discoveryService = require('../services/discovery.service');
const motionService = require('../services/motion.service');
const ptz = require('../services/ptz.service');
const onvif = require('../services/onvif.service');
const security = require('../services/security.service');

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
  const { camera_name, location, brand, ip_address, username, password, port, stream_path, motion_detection, alert_threshold, motion_sensitivity, motion_tracking, night_vision } = req.body;

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
    `INSERT INTO cctv_cameras (camera_name, location, brand, rtsp_url, username, password_encrypted, ip_address, port, stream_path, motion_detection, alert_threshold, motion_sensitivity, motion_tracking, night_vision)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    camera_name, location || null, cameraBrand, rtspUrl,
    username || null, password || null, ip_address,
    rtspPort, stream,
    motion_detection !== undefined ? motion_detection : 1,
    alert_threshold || 'medium',
    motion_sensitivity !== undefined ? motion_sensitivity : 1.5,
    motion_tracking ? 1 : 0,
    night_vision || 'auto'
  );

  const camera = db.prepare('SELECT * FROM cctv_cameras WHERE camera_id = ?').get(result.lastInsertRowid);

  db.prepare('INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)')
    .run(req.user.user_id, 'CREATE', 'camera', camera.camera_id, `Added camera: ${camera_name} (${cameraBrand})`);

  security.startForCamera(camera);

  camera.password_encrypted = camera.password_encrypted ? '••••••' : null;
  res.status(201).json(camera);
};

exports.update = (req, res) => {
  const db = getDatabase();
  const existing = db.prepare('SELECT * FROM cctv_cameras WHERE camera_id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Camera not found' });

  const { camera_name, location, brand, ip_address, username, password, port, stream_path, motion_detection, alert_threshold, status, motion_sensitivity, motion_tracking, night_vision } = req.body;

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
     ip_address = ?, port = ?, stream_path = ?, motion_detection = ?, alert_threshold = ?, status = ?,
     motion_sensitivity = ?, motion_tracking = ?, night_vision = ? WHERE camera_id = ?`
  ).run(
    camera_name || existing.camera_name,
    location !== undefined ? location : existing.location,
    newBrand, rtspUrl, newUsername,
    password || existing.password_encrypted,
    newIp, newPort, newStream,
    motion_detection !== undefined ? motion_detection : existing.motion_detection,
    alert_threshold || existing.alert_threshold,
    status || existing.status,
    motion_sensitivity !== undefined ? motion_sensitivity : existing.motion_sensitivity,
    motion_tracking !== undefined ? (motion_tracking ? 1 : 0) : existing.motion_tracking,
    night_vision || existing.night_vision,
    req.params.id
  );

  const camera = db.prepare('SELECT * FROM cctv_cameras WHERE camera_id = ?').get(req.params.id);
  security.refresh(camera);
  camera.password_encrypted = camera.password_encrypted ? '••••••' : null;
  res.json(camera);
};

exports.remove = (req, res) => {
  const db = getDatabase();
  const camera = db.prepare('SELECT * FROM cctv_cameras WHERE camera_id = ?').get(req.params.id);
  if (!camera) return res.status(404).json({ error: 'Camera not found' });

  security.stopForCamera(camera.camera_id);
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

  // Use notification service for alert flow (system notification + email)
  const result = await notificationService.handleMotionAlert(camera);

  res.json({ success: true, ...result });
};

exports.discover = async (req, res) => {
  try {
    const { subnet } = req.query;
    const result = await discoveryService.discoverCameras({ subnet });
    res.json({
      success: true,
      ...result,
    });
  } catch (e) {
    console.error('[CCTV Discovery Error]', e);
    res.status(500).json({ error: 'Failed to scan network: ' + e.message });
  }
};

exports.probeIp = async (req, res) => {
  try {
    const { ip } = req.query;
    if (!ip) return res.status(400).json({ error: 'IP address is required' });
    const result = await discoveryService.probeSingleIp(ip);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'Probe failed: ' + e.message });
  }
};

exports.autoRebind = async (req, res) => {
  try {
    const db = getDatabase();
    const camera = db.prepare('SELECT * FROM cctv_cameras WHERE camera_id = ?').get(req.params.id);
    if (!camera) return res.status(404).json({ error: 'Camera not found' });

    console.log(`[AutoRebind] Scanning local network to re-link camera ${camera.camera_name}...`);
    const foundCamera = await discoveryService.findTapoCamera();

    if (!foundCamera) {
      return res.status(404).json({
        success: false,
        message: 'Could not find Tapo camera on local network. Ensure camera is powered on and connected to Wi-Fi.',
      });
    }

    const oldIp = camera.ip_address;
    const newIp = foundCamera.ip;
    const isProd = (process.env.NODE_ENV || '').trim() === 'production';

    let updated = false;
    if (oldIp !== newIp || camera.status === 'offline') {
      const preset = BRAND_PRESETS[camera.brand] || BRAND_PRESETS.tapo || BRAND_PRESETS.generic;
      const port = camera.port || preset.defaultPort || 554;
      const stream = camera.stream_path || preset.streams?.high || 'stream1';

      const targetHost = (!isProd || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(oldIp)) ? newIp : oldIp;

      const rtspUrl = preset.rtspFormat
        .replace('{user}', camera.username || '')
        .replace('{pass}', camera.password_encrypted || '')
        .replace('{ip}', targetHost)
        .replace('{port}', port)
        .replace('{stream}', stream)
        .replace('{streamPath}', stream.includes('/') ? stream : `/${stream}`);

      db.prepare(`
        UPDATE cctv_cameras
        SET ip_address = ?, rtsp_url = ?, status = 'active', last_health_check = CURRENT_TIMESTAMP
        WHERE camera_id = ?
      `).run(targetHost, rtspUrl, camera.camera_id);

      db.prepare('INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)')
        .run(req.user.user_id, 'UPDATE', 'camera', camera.camera_id, `Auto-relinked IP from ${oldIp} to ${newIp} (MAC: ${foundCamera.macAddress || 'unknown'})`);

      updated = true;
    }

    res.json({
      success: true,
      updated,
      oldIp,
      newIp,
      macAddress: foundCamera.macAddress,
      cameraName: foundCamera.name,
      message: updated
        ? `Successfully re-linked camera to new IP: ${newIp}!`
        : `Camera IP verified: ${newIp} is active and reachable.`,
    });
  } catch (e) {
    console.error('[AutoRebind Error]', e);
    res.status(500).json({ error: 'Auto-rebind failed: ' + e.message });
  }
};

// ---------------------------------------------------------------------------
// Motion tracking
// ---------------------------------------------------------------------------

function loadCamera(id) {
  const db = getDatabase();
  return db.prepare('SELECT * FROM cctv_cameras WHERE camera_id = ?').get(id);
}

function sanitize(camera) {
  if (!camera) return camera;
  return { ...camera, password_encrypted: camera.password_encrypted ? '••••••' : null };
}

exports.motionStates = (req, res) => {
  res.json(motionService.getAllStates());
};

exports.motionState = (req, res) => {
  res.json(motionService.getState(req.params.id));
};

exports.activeDetections = (req, res) => {
  const db = getDatabase();
  const cams = db.prepare('SELECT camera_id FROM cctv_cameras').all();
  const result = {};
  cams.forEach(c => { result[c.camera_id] = motionService.isRunning(c.camera_id); });
  res.json(result);
};

// ---------------------------------------------------------------------------
// PTZ / night vision / smart tracking (via Python bridge)
// ---------------------------------------------------------------------------

exports.ptzMove = async (req, res) => {
  const camera = loadCamera(req.params.id);
  if (!camera) return res.status(404).json({ error: 'Camera not found' });
  try {
    await onvif.move(camera, Number(req.body.x || 0), Number(req.body.y || 0), Math.min(Number(req.body.duration || 500), 1500));
    res.json({ success: true });
  } catch (e) {
    res.status(502).json({ success: false, error: e.message });
  }
};

exports.ptzStop = async (req, res) => {
  const camera = loadCamera(req.params.id);
  if (!camera) return res.status(404).json({ error: 'Camera not found' });
  try { await onvif.stop(camera); res.json({ success: true }); }
  catch (e) { res.status(502).json({ success: false, error: e.message }); }
};

exports.ptzCalibrate = async (req, res) => {
  const camera = loadCamera(req.params.id);
  if (!camera) return res.status(404).json({ error: 'Camera not found' });
  try { await onvif.gotoHome(camera); res.json({ success: true }); }
  catch (e) { res.status(502).json({ success: false, error: e.message }); }
};

exports.ptzPresets = async (req, res) => {
  const camera = loadCamera(req.params.id);
  if (!camera) return res.status(404).json({ error: 'Camera not found' });
  try { res.json(await onvif.getPresets(camera)); }
  catch (e) { res.status(502).json({ success: false, error: e.message }); }
};

exports.ptzSavePreset = async (req, res) => {
  const camera = loadCamera(req.params.id);
  if (!camera) return res.status(404).json({ error: 'Camera not found' });
  try { res.json(await onvif.savePreset(camera, req.body.name || 'Preset')); }
  catch (e) { res.status(502).json({ success: false, error: e.message }); }
};

exports.ptzGoToPreset = async (req, res) => {
  const camera = loadCamera(req.params.id);
  if (!camera) return res.status(404).json({ error: 'Camera not found' });
  try { res.json(await onvif.gotoPreset(camera, req.body.id)); }
  catch (e) { res.status(502).json({ success: false, error: e.message }); }
};

exports.nightVision = async (req, res) => {
  const camera = loadCamera(req.params.id);
  if (!camera) return res.status(404).json({ error: 'Camera not found' });
  const mode = req.body.mode || 'auto';
  try {
    const result = await onvif.setIrCutFilter(camera, mode);
    getDatabase().prepare('UPDATE cctv_cameras SET night_vision = ? WHERE camera_id = ?').run(mode, camera.camera_id);
    res.json({ success: true, mode, supported: result.supported });
  } catch (e) {
    res.status(502).json({ success: false, error: e.message });
  }
};

exports.ptzInfo = async (req, res) => {
  const camera = loadCamera(req.params.id);
  if (!camera) return res.status(404).json({ error: 'Camera not found' });
  try { res.json(await onvif.info(camera)); }
  catch (e) { res.status(502).json({ success: false, error: e.message }); }
};

// ---------------------------------------------------------------------------
// Motion settings / tracking toggle / clips
// ---------------------------------------------------------------------------

exports.setTracking = (req, res) => {
  const camera = loadCamera(req.params.id);
  if (!camera) return res.status(404).json({ error: 'Camera not found' });
  const enabled = req.body.enabled ? 1 : 0;
  getDatabase().prepare('UPDATE cctv_cameras SET motion_tracking = ? WHERE camera_id = ?').run(enabled, camera.camera_id);
  const updated = loadCamera(camera.camera_id);
  security.refresh(updated);
  res.json({ success: true, motion_tracking: enabled });
};

exports.setMotionSettings = async (req, res) => {
  const camera = loadCamera(req.params.id);
  if (!camera) return res.status(404).json({ error: 'Camera not found' });
  const db = getDatabase();
  const fields = {};
  if (req.body.motion_detection !== undefined) fields.motion_detection = req.body.motion_detection ? 1 : 0;
  if (req.body.motion_sensitivity !== undefined) fields.motion_sensitivity = Number(req.body.motion_sensitivity);
  if (Object.keys(fields).length) {
    const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE cctv_cameras SET ${sets} WHERE camera_id = ?`).run(...Object.values(fields), camera.camera_id);
  }
  const updated = loadCamera(camera.camera_id);
  security.refresh(updated);

  // best-effort: mirror sensitivity to the camera firmware
  if (req.body.motion_sensitivity !== undefined) {
    try {
      const s = Number(req.body.motion_sensitivity);
      const level = s <= 1 ? 'high' : s <= 2.5 ? 'medium' : 'low';
      await ptz.setMotionDetection(updated, true, level);
    } catch (e) { /* firmware control optional */ }
  }

  res.json({ success: true, camera: sanitize(updated) });
};

exports.clips = (req, res) => {
  res.json(motionService.listClips(Number(req.params.id)));
};

exports.recordClip = async (req, res) => {
  const camera = loadCamera(req.params.id);
  if (!camera) return res.status(404).json({ error: 'Camera not found' });
  const seconds = Math.min(Number(req.body.seconds || 8), 30);
  const clip = await motionService.recordClip(camera, seconds);
  res.json({ success: !!clip, clip: clip ? `/api/recordings/cam_${camera.camera_id}/${require('path').basename(clip)}` : null });
};

exports.startDetection = (req, res) => {
  const camera = loadCamera(req.params.id);
  if (!camera) return res.status(404).json({ error: 'Camera not found' });
  security.startForCamera(camera);
  res.json({ success: true, running: motionService.isRunning(camera.camera_id) });
};

exports.stopDetection = (req, res) => {
  motionService.stopDetection(Number(req.params.id));
  res.json({ success: true });
};

