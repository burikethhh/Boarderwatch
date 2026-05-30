const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/cctv.controller');
const { authenticate, requireRole } = require('../middleware/auth');
const cameraService = require('../services/camera.service');
const { getDatabase } = require('../config/database');

router.get('/presets', ctrl.presets);
router.post('/webhook', ctrl.webhook);

router.use(authenticate);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', requireRole('admin'), ctrl.create);
router.put('/:id', requireRole('admin'), ctrl.update);
router.delete('/:id', requireRole('admin'), ctrl.remove);
router.post('/:id/test', requireRole('admin'), ctrl.testConnection);

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
  const status = cameraService.getStreamStatus(parseInt(req.params.id));
  res.json(status);
});

router.get('/streams/active', (req, res) => {
  res.json(cameraService.getActiveStreams());
});

module.exports = router;
