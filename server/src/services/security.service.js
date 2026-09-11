/**
 * BoardersWatch Security Service
 * Orchestrates server-side motion detection, alert creation, evidence clip
 * recording and software auto-follow (motion -> PTZ pan/tilt).
 */

const { getDatabase } = require('../config/database');
const motionService = require('./motion.service');
const notificationService = require('./notification.service');
const onvif = require('./onvif.service');

const cameraCache = new Map();

async function onMotion(camera, state) {
  let clipPath = null;
  try {
    clipPath = await motionService.recordClip(camera, 8);
  } catch (e) {
    console.error('[Security] clip error:', e.message);
  }
  try {
    await notificationService.handleMotionAlert(camera, state, clipPath);
  } catch (e) {
    console.error('[Security] alert error:', e.message);
  }
  if (camera.motion_tracking) {
    onvif.follow(camera, state.cx, state.cy).catch(() => {});
  }
}

function startForCamera(camera) {
  if (!camera) return;
  cameraCache.set(camera.camera_id, camera);
  if (camera.motion_detection && camera.status !== 'inactive') {
    motionService.startDetection(camera, onMotion);
  }
}

function stopForCamera(cameraId) {
  motionService.stopDetection(cameraId);
  cameraCache.delete(Number(cameraId));
  onvif.resetFollow(Number(cameraId));
}

function refresh(camera) {
  if (!camera) return;
  const id = camera.camera_id;
  cameraCache.set(id, camera);
  const running = motionService.isRunning(id);
  if (camera.motion_detection && camera.status !== 'inactive') {
    if (!running) motionService.startDetection(camera, onMotion);
  } else if (running) {
    motionService.stopDetection(id);
  }
}

function startAll() {
  const db = getDatabase();
  const cameras = db.prepare("SELECT * FROM cctv_cameras WHERE status != 'inactive'").all();
  for (const cam of cameras) startForCamera(cam);
  console.log(`[Security] Motion detection active for ${cameras.filter(c => c.motion_detection).length} camera(s)`);

  // Continuous software auto-follow
  motionService.onFrame((state) => {
    const camera = cameraCache.get(state.cameraId);
    if (!camera) return;
    if (camera.motion_tracking && state.motion && state.cx != null) {
      onvif.follow(camera, state.cx, state.cy).catch(() => {});
    }
  });
}

function stopAll() {
  motionService.stopAll();

  cameraCache.clear();
}

function getCamera(cameraId) {
  return cameraCache.get(Number(cameraId));
}

module.exports = { startAll, stopAll, startForCamera, stopForCamera, refresh, getCamera };
