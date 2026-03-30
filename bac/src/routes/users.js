const express = require('express');
const { updateProfile } = require('../controllers/authController');
const { authMiddleware } = require('../shared/middleware/auth');
const router = express.Router();

router.use(authMiddleware);

router.put('/profile', updateProfile);

module.exports = router;
