const express = require('express');
const { createBooking } = require('../staff/controllers/bookingController');
const { 
  getUserBookings, 
  getBookingById,
  cancelBooking, 
  updateBooking,
  checkAvailability,
  getUpcomingBookings,
  getBookingHistory,
  getTodayBookings
} = require('../staff/controllers/bookingController');
const { authMiddleware } = require('../shared/middleware/auth');
const router = express.Router();

router.use(authMiddleware);
router.post('/', createBooking);
router.get('/', getUserBookings);
router.get('/upcoming', getUpcomingBookings);
router.get('/history', getBookingHistory);
router.get('/check-availability', checkAvailability);
router.get('/today', getTodayBookings);
router.get('/:bookingId', getBookingById);
router.put('/:bookingId', updateBooking);
router.delete('/:bookingId', cancelBooking);

module.exports = router;
