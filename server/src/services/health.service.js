const { getDatabase } = require('../config/database');
const cameraService = require('./camera.service');

/**
 * Check health of all cameras - probe RTSP streams
 */
async function checkCameraHealth() {
  const db = getDatabase();
  const cameras = db.prepare("SELECT * FROM cctv_cameras WHERE status != 'inactive'").all();

  let online = 0;
  let offline = 0;

  for (const camera of cameras) {
    const result = await cameraService.probeCamera(camera.rtsp_url, 8000);

    const newStatus = result.reachable ? 'active' : 'offline';

    if (camera.status !== newStatus) {
      db.prepare('UPDATE cctv_cameras SET status = ?, last_health_check = CURRENT_TIMESTAMP WHERE camera_id = ?')
        .run(newStatus, camera.camera_id);

      // Create alert if camera went offline
      if (newStatus === 'offline') {
        db.prepare('INSERT INTO cctv_alerts (camera_id, alert_type, description) VALUES (?, ?, ?)')
          .run(camera.camera_id, 'offline', `${camera.camera_name} went offline`);

        db.prepare('INSERT INTO notifications (type, title, message, channel) VALUES (?, ?, ?, ?)')
          .run(
            'camera_offline',
            `Camera Offline - ${camera.camera_name}`,
            `${camera.camera_name} at ${camera.location || 'unknown location'} is no longer reachable`,
            'system'
          );
      }

      console.log(`[HealthCheck] Camera ${camera.camera_name}: ${camera.status} -> ${newStatus}`);
    } else {
      db.prepare('UPDATE cctv_cameras SET last_health_check = CURRENT_TIMESTAMP WHERE camera_id = ?')
        .run(camera.camera_id);
    }

    if (result.reachable) online++;
    else offline++;
  }

  console.log(`[HealthCheck] Cameras: ${online} online, ${offline} offline`);
  return { total: cameras.length, online, offline };
}

module.exports = { checkCameraHealth };
