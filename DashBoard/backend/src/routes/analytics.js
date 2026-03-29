const express = require('express');
const { getLabUtilization, getTopLabs } = require('../controllers/analyticsController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware, adminMiddleware);
router.get('/utilization', getLabUtilization);
router.get('/top-labs', getTopLabs);

module.exports = router;
