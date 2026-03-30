const express = require('express');
const { 
  getAllUsers, 
  getAllBookings, 
  getAnalytics,
  createUser,
  updateUser,
  toggleUserStatus,
  getAllLabs,
  createLab,
  updateLab,
  deleteLab,
  toggleLabStatus,
  getDashboardStats,
  getRecentBookings,
  getBookingsPerDay,
  updateBookingStatus,
  autoCompleteExpiredBookings,
  getPendingBookings,
  approveBooking
} = require('../controllers/adminController');
const { authMiddleware, adminMiddleware } = require('../../shared/middleware/auth');
const router = express.Router();

router.use(authMiddleware, adminMiddleware);

// Dashboard
router.get('/dashboard/stats', getDashboardStats);
router.get('/bookings/recent', getRecentBookings);

// Users
router.get('/users', getAllUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.patch('/users/:id/status', toggleUserStatus);
router.patch('/users/:id/toggle', toggleUserStatus);
router.delete('/users/:id', (req, res) => {
  // Soft delete by deactivating user
  toggleUserStatus(req, res);
});

// Labs
router.get('/labs', getAllLabs);
router.post('/labs', createLab);
router.put('/labs/:id', updateLab);
router.patch('/labs/:id/toggle', toggleLabStatus);
router.delete('/labs/:id', deleteLab);

// Bookings
router.get('/bookings', getAllBookings);
router.get('/bookings/analytics', getAnalytics);
router.get('/bookings/recent', getRecentBookings);
router.get('/bookings/per-day', getBookingsPerDay);
router.get('/bookings/pending', getPendingBookings);
router.patch('/bookings/:id', updateBookingStatus);
router.patch('/bookings/:id/approve', approveBooking);
router.post('/bookings/auto-complete', autoCompleteExpiredBookings);

// Analytics
router.get('/analytics', getAnalytics);

module.exports = router;