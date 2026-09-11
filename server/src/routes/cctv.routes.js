const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/cctv.controller');
const { authenticate, requireRole } = require('../middleware/auth');
const cameraService = require('../services/camera.service');
const { getDatabase } = require('../config/database');

router.get('/presets', ctrl.presets);
router.post('/webhook', ctrl.webhook);

router.use(authenticate);

// Static routes must be declared before '/:id'
router.get('/discover', requireRole('admin'), ctrl.discover);
router.get('/probe', requireRole('admin'), ctrl.probeIp);
router.get('/motion', ctrl.motionStates);
router.get('/detections', ctrl.activeDetections);
router.get('/streams/active', (req, res) => res.json(cameraService.getActiveStreams()));

router.get('/', ctrl.list);
router.post('/', requireRole('admin'), ctrl.create);

router.get('/:id', ctrl.getById);
router.put('/:id', requireRole('admin'), ctrl.update);
router.delete('/:id', requireRole('admin'), ctrl.remove);
router.post('/:id/test', requireRole('admin'), ctrl.testConnection);
router.post('/:id/auto-rebind', requireRole('admin'), ctrl.autoRebind);

// Stream control
router.post('/:id/stream/start', requireRole('admin'), async (req, res) => {
  const db = getDatabase();
  const camera = db.prepare('SELECT * FROM cctv_cameras WHERE camera_id = ?').get(req.params.id);
  if (!camera) return res.status(404).json({ error: 'Camera not found' });

  const stream = cameraService.startStream(camera);
  res.json({ message: 'Stream started', status: stream.status, cameraId: camera.camera_id });
});

router.post('/:id/stream/stop', requireRole('admin'), (req, res) => {
  cameraService.stopStream(parseInt(req.params.id));
  res.json({ message: 'Stream stopped' });
});

router.get('/:id/stream/status', (req, res) => {
  res.json(cameraService.getStreamStatus(parseInt(req.params.id)));
});

// Motion tracking
router.get('/:id/motion', ctrl.motionState);
router.post('/:id/motion/start', requireRole('admin'), ctrl.startDetection);
router.post('/:id/motion/stop', requireRole('admin'), ctrl.stopDetection);
router.put('/:id/motion/settings', requireRole('admin'), ctrl.setMotionSettings);
router.put('/:id/tracking', requireRole('admin'), ctrl.setTracking);

// Evidence clips
router.get('/:id/clips', ctrl.clips);
router.post('/:id/clips', requireRole('admin'), ctrl.recordClip);

// PTZ / night vision / smart track
router.post('/:id/ptz/move', requireRole('admin'), ctrl.ptzMove);
router.post('/:id/ptz/stop', requireRole('admin'), ctrl.ptzStop);
router.post('/:id/ptz/calibrate', requireRole('admin'), ctrl.ptzCalibrate);
router.get('/:id/ptz/presets', ctrl.ptzPresets);
router.post('/:id/ptz/presets', requireRole('admin'), ctrl.ptzSavePreset);
router.post('/:id/ptz/presets/goto', requireRole('admin'), ctrl.ptzGoToPreset);
router.get('/:id/ptz/info', ctrl.ptzInfo);
router.put('/:id/night-vision', requireRole('admin'), ctrl.nightVision);

module.exports = router;
