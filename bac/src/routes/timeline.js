const express = require('express');
const router = express.Router();
const timelineController = require('../controllers/timelineController');
const { authenticateToken } = require('../shared/middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Day view - hourly time slots
router.get('/day', timelineController.getDayView);

// Week view - daily aggregation
router.get('/week', timelineController.getWeekView);

// Month view - monthly aggregation with analytics
router.get('/month', timelineController.getMonthView);

// Real-time availability check
router.get('/availability', timelineController.checkAvailability);

// Timeline analytics
router.get('/analytics', timelineController.getTimelineAnalytics);

module.exports = router;
