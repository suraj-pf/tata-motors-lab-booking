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
const { authMiddleware } = require('../../shared/middleware/auth');
const validateBooking = require('../../shared/middleware/validateBooking');
const { bookingLimiter } = require('../../shared/middleware/rateLimiter');
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
router.patch('/:bookingId', updateBooking); // PATCH for partial updates
router.put('/:bookingId', updateBooking); // PUT for full updates (backward compatibility)
router.delete('/:bookingId', cancelBooking); // DELETE for cancellation
router.patch('/:bookingId/approve', approveBooking); // Admin only - approve/reject booking

module.exports = router;