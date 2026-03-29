const { calculateDuration } = require('../utils/timeSlots');

const validateBooking = (req, res, next) => {
  try {
    const { start_time, end_time, booking_date, lab_id, bc_number } = req.body;
    
    // Check required fields
    if (!start_time || !end_time || !booking_date || !lab_id) {
      return res.status(400).json({ 
        error: 'Missing required fields: start_time, end_time, booking_date, lab_id' 
      });
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
      return res.status(400).json({ error: 'Invalid time format. Use HH:MM' });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(booking_date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    // Validate duration
    const duration = calculateDuration(start_time, end_time);
    if (duration > 10.5) {
      return res.status(400).json({ error: 'Duration cannot exceed 10.5 hours' });
    }
    if (duration <= 0) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    // Validate time range (6:30 AM to 5:00 PM)
    const startHour = parseInt(start_time.split(':')[0]);
    const startMinute = parseInt(start_time.split(':')[1]);
    const endHour = parseInt(end_time.split(':')[0]);
    
    if (startHour < 6 || (startHour === 6 && startMinute < 30)) {
      return res.status(400).json({ error: 'Booking must start after 6:30 AM' });
    }
    
    if (endHour > 17 || (endHour === 17 && parseInt(end_time.split(':')[1]) > 0)) {
      return res.status(400).json({ error: 'Booking must end by 5:00 PM' });
    }

    // Validate date (not in past)
    const today = new Date().toISOString().split('T')[0];
    if (booking_date < today) {
      return res.status(400).json({ error: 'Cannot book past dates' });
    }

    // Attach validated data to request
    req.validatedBooking = { 
      start_time, 
      end_time, 
      booking_date, 
      lab_id, 
      bc_number: bc_number || req.user?.bc_number,
      duration 
    };
    
    next();
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ error: 'Validation failed' });
  }
};

module.exports = validateBooking;