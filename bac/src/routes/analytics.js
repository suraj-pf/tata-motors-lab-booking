const express = require('express');
const { 
  getFullAnalytics, 
  getRealtimeMetrics,
  getLabUtilization, 
  getTopLabs 
} = require('../controllers/analyticsController');
const { authMiddleware, adminMiddleware } = require('../shared/middleware/auth');
const router = express.Router();

router.use(authMiddleware, adminMiddleware);

// Full analytics using ALL bookings
router.get('/full', getFullAnalytics);
router.get('/realtime', getRealtimeMetrics);

// Legacy endpoints
router.get('/utilization', getLabUtilization);
router.get('/top-labs', getTopLabs);

module.exports = router;
