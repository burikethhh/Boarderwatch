const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate, requireRole } = require('../middleware/auth');

router.post('/login', authController.login);
router.post('/register', authenticate, requireRole('admin'), authController.register);
router.get('/me', authenticate, authController.getMe);

module.exports = router;
