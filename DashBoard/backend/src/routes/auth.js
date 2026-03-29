const express = require('express');
const { register, login, refreshToken, getProfile, updateProfile, changePassword } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');
const { loginLimiter, createAccountLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

router.post('/register', createAccountLimiter, register);
router.post('/login', loginLimiter, login);
router.post('/refresh', refreshToken);
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);
router.post('/change-password', authMiddleware, changePassword);

module.exports = router;