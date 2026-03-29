const express = require('express');
const { 
  createBooking, 
  getUserBookings, 
  getBookingById,
  cancelBooking, 
  updateBooking,
  checkAvailability,
  getUpcomingBookings,
  getBookingHistory,
  approveBooking,
  getPendingBookings,
  getTodayBookings
} = require('../controllers/bookingController');
const { authMiddleware } = require('../middleware/auth');
const validateBooking = require('../middleware/validateBooking');
const { bookingLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

// All booking routes require authentication
router.use(authMiddleware);

// Booking CRUD operations
router.post('/', bookingLimiter, validateBooking, createBooking);
router.get('/', getUserBookings);
router.get('/upcoming', getUpcomingBookings);
router.get('/history', getBookingHistory);
router.get('/check-availability', checkAvailability);
router.get('/pending', getPendingBookings); // Admin only - pending bookings
router.get('/today', getTodayBookings); // Admin only - today's bookings
router.get('/:bookingId', getBookingById);
router.put('/:bookingId', updateBooking);
router.patch('/:bookingId/approve', approveBooking); // Admin only - approve/reject booking
router.delete('/:bookingId', cancelBooking);

module.exports = router;