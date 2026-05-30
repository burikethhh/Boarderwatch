const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/settings.controller');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

router.get('/', ctrl.getSettings);
router.put('/', requireRole('admin'), ctrl.updateSettings);
router.post('/rooms/bulk', requireRole('admin'), ctrl.bulkUpdateRooms);
router.post('/test-camera', requireRole('admin'), ctrl.testCamera);

module.exports = router;
