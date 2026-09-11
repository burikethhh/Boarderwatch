/**
 * BoardersWatch PTZ / Night-Vision Service
 *
 * Talks to the Tapo camera's proprietary control channel through a persistent
 * Python (pytapo) bridge. Provides manual pan/tilt, presets, night-vision
 * mode, motion sensitivity and the camera's built-in smart-track (auto-follow).
 *
 * The bridge keeps ONE authenticated session to avoid Tapo's login lockout.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const BRIDGE = path.join(__dirname, '../../scripts/tapo_bridge.py');
const bridges = new Map(); // cameraId -> bridge

function pythonPath() {
  try {
    const { getDatabase } = require('../config/database');
    const db = getDatabase();
    const row = db.prepare("SELECT value FROM settings WHERE key = 'python_path'").get();
    if (row && row.value) return row.value;
  } catch {}
  return process.env.PYTHON_PATH || 'python';
}

function createBridge(camera) {
  return new Promise((resolve) => {
    const user = camera.username || '';
    const pass = camera.password_encrypted || '';
    let proc;
    try {
      proc = spawn(pythonPath(), [BRIDGE, camera.ip_address, user, pass], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (e) {
      return resolve({ ready: false, error: e.message });
    }

    const bridge = {
      cameraId: camera.camera_id,
      proc,
      ready: false,
      queue: [],
      buffer: '',
      pending: [],
    };

    proc.stdout.on('data', (chunk) => {
      bridge.buffer += chunk.toString();
      let idx;
      while ((idx = bridge.buffer.indexOf('\n')) >= 0) {
        const line = bridge.buffer.slice(0, idx).trim();
        bridge.buffer = bridge.buffer.slice(idx + 1);
        if (!line) continue;
        let msg;
        try { msg = JSON.parse(line); } catch { continue; }
        if (msg.ready !== undefined) {
          bridge.ready = !!msg.ready;
          bridge.readyError = msg.error;
          resolve(bridge);
        }
        const p = bridge.pending.shift();
        if (p) p.resolve(msg);
      }
    });

    proc.stderr.on('data', () => {});
    proc.on('error', (e) => {
      bridge.ready = false;
      bridge.error = e.message;
      resolve(bridge);
      bridges.delete(camera.camera_id);
    });
    proc.on('close', () => {
      bridges.delete(camera.camera_id);
    });

    bridges.set(camera.camera_id, bridge);
    setTimeout(() => { if (!bridge.ready) resolve(bridge); }, 20000);
  });
}

async function getBridge(camera) {
  let b = bridges.get(camera.camera_id);
  if (b && b.ready && b.proc && !b.proc.killed) return b;
  b = await createBridge(camera);
  return b;
}

function send(bridge, action, params = {}) {
  return new Promise((resolve, reject) => {
    if (!bridge.ready) return reject(new Error(bridge.readyError || bridge.error || 'Camera control unavailable'));
    const timer = setTimeout(() => reject(new Error('PTZ command timeout')), 15000);
    bridge.pending.push({ resolve: (msg) => { clearTimeout(timer); msg && msg.ok === false ? reject(new Error(msg.error)) : resolve(msg); } });
    try {
      bridge.proc.stdin.write(JSON.stringify({ action, ...params }) + '\n');
    } catch (e) {
      clearTimeout(timer);
      reject(e);
    }
  });
}

async function run(camera, action, params) {
  const bridge = await getBridge(camera);
  if (!bridge.ready) throw new Error(bridge.readyError || bridge.error || 'Camera login unavailable (possible temporary lockout)');
  return send(bridge, action, params);
}

// ---- public API ------------------------------------------------------------

const ptz = {
  status: (camera) => run(camera, 'info'),
  move: (camera, x, y) => run(camera, 'move', { x, y }),
  stop: (camera) => run(camera, 'stop'),
  moveStep: (camera, angle) => run(camera, 'moveStep', { angle }),
  calibrate: (camera) => run(camera, 'calibrate'),
  presets: (camera) => run(camera, 'presets'),
  savePreset: (camera, name) => run(camera, 'savePreset', { name }),
  goToPreset: (camera, id) => run(camera, 'goToPreset', { id }),
  nightVision: (camera, mode) => run(camera, 'nightVision', { mode }),
  getNightVision: (camera) => run(camera, 'getNightVision'),
  smartTrack: (camera, enabled) => run(camera, 'smartTrack', { enabled }),
  getSmartTrack: (camera) => run(camera, 'getSmartTrack'),
  autoTrackTarget: (camera, enabled) => run(camera, 'autoTrackTarget', { enabled }),
  setMotionDetection: (camera, enabled, sensitivity) => run(camera, 'motionDetection', { enabled, sensitivity }),
  privacy: (camera, enabled) => run(camera, 'privacy', { enabled }),
  led: (camera, enabled) => run(camera, 'led', { enabled }),
};

// ---- auto-follow (software tracking -> PTZ) --------------------------------

const lastFollow = new Map(); // cameraId -> timestamp
const DEADZONE = 0.18;
const FOLLOW_INTERVAL = 1500;

/**
 * Given a normalized motion centroid (0..1), nudge the camera toward it.
 */
async function follow(camera, cx, cy) {
  if (cx == null || cy == null) return { moved: false };
  const now = Date.now();
  if (now - (lastFollow.get(camera.camera_id) || 0) < FOLLOW_INTERVAL) return { moved: false, throttled: true };
  lastFollow.set(camera.camera_id, now);

  const dx = cx - 0.5;
  const dy = cy - 0.5;
  if (Math.abs(dx) < DEADZONE && Math.abs(dy) < DEADZONE) return { moved: false, centered: true };

  const step = 0.6;
  const mx = Math.abs(dx) < DEADZONE ? 0 : (dx > 0 ? step : -step);
  const my = Math.abs(dy) < DEADZONE ? 0 : (dy > 0 ? -step : step); // invert vertical

  try {
    await ptz.move(camera, mx, my);
    setTimeout(() => { try { ptz.stop(camera); } catch {} }, 350);
    return { moved: true, x: mx, y: my };
  } catch (e) {
    return { moved: false, error: e.message };
  }
}

function resetFollow(cameraId) { lastFollow.delete(cameraId); }

function destroyAll() {
  for (const [id, b] of bridges) { try { b.proc.kill(); } catch {} }
  bridges.clear();
}

module.exports = { ...ptz, follow, resetFollow, destroyAll, getBridge };
