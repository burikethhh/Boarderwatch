const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/lease.controller');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

router.get('/expiring', ctrl.getExpiring);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', requireRole('admin'), ctrl.create);
router.put('/:id', requireRole('admin'), ctrl.update);
router.post('/:id/renew', requireRole('admin'), ctrl.renew);

module.exports = router;
