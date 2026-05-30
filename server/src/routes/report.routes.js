const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/report.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/tenant', ctrl.tenantReport);
router.get('/payment', ctrl.paymentReport);
router.get('/occupancy', ctrl.occupancyReport);
router.get('/security', ctrl.securityReport);

module.exports = router;
