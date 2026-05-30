const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/payment.controller');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

router.get('/stats', ctrl.stats);
router.get('/recent', ctrl.recentPayments);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.get('/:id/receipt', ctrl.getReceipt);
router.post('/', requireRole('admin'), ctrl.create);

module.exports = router;
