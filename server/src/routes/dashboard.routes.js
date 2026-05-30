const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/metrics', ctrl.metrics);
router.get('/recent-payments', ctrl.recentPayments);
router.get('/recent-notifications', ctrl.recentNotifications);

module.exports = router;
