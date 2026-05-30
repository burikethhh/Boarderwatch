const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/alerts', ctrl.alerts);
router.get('/alerts/unacknowledged', ctrl.unacknowledgedAlerts);
router.put('/alerts/:id/acknowledge', ctrl.acknowledgeAlert);
router.get('/unread-count', ctrl.unreadCount);
router.get('/', ctrl.list);
router.put('/:id/read', ctrl.markRead);
router.put('/read-all', ctrl.markAllRead);

module.exports = router;
