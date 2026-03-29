const { pool } = require('../config/database');
const Lab = require('../models/Lab');
const { isTimeSlotAvailable } = require('../utils/timeSlots');

const getAllLabs = async (req, res) => {
  try {
    const { building, is_ac } = req.query;
    let query = 'SELECT * FROM labs WHERE is_active = TRUE';
    let params = [];

    if (building) {
      query += ' AND building = ?';
      params.push(building);
    }

    if (is_ac !== undefined) {
      query += ' AND is_ac = ?';
      params.push(is_ac === 'true');
    }

    query += ' ORDER BY building, name';

    const [labs] = await pool.execute(query, params);
    
    const today = new Date().toISOString().split('T')[0];
    const selectedDate = req.query.date || today;
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    const isToday = selectedDate === today;

    const enhancedLabs = await Promise.all(labs.map(async (lab) => {
      const [bookings] = await pool.execute(
        `SELECT COUNT(*) as booking_count FROM bookings 
         WHERE lab_id = ? AND booking_date = ? AND status = 'confirmed'`,
        [lab.id, selectedDate]
      );

      const [currentBooking] = await pool.execute(
        `SELECT id, start_time, end_time, user_id FROM bookings 
         WHERE lab_id = ? AND booking_date = ? AND status = 'confirmed'
         ${isToday ? 'AND start_time <= ? AND end_time > ?' : ''}`,
        isToday ? [lab.id, selectedDate, currentTime, currentTime] : [lab.id, selectedDate]
      );

      const [nextBooking] = await pool.execute(
        `SELECT id, booking_date, start_time, end_time FROM bookings
         WHERE lab_id = ? AND booking_date = ? AND status = 'confirmed'
         ${isToday ? 'AND start_time > ?' : ''}
         ORDER BY booking_date ASC, start_time ASC
         LIMIT 1`,
        isToday ? [lab.id, selectedDate, currentTime] : [lab.id, selectedDate]
      );

      return {
        ...lab,
        today_bookings: bookings[0].booking_count,
        has_availability_today: bookings[0].booking_count < 10,
        is_booked: currentBooking.length > 0,
        is_reserved_today: bookings[0].booking_count > 0,
        next_booking: nextBooking[0] || null,
        selected_date: selectedDate
      };
    }));

    res.json({ 
      success: true, 
      labs: enhancedLabs
    });
  } catch (error) {
    console.error('Get labs error:', error);
    res.status(500).json({ error: error.message });
  }
};

const getLabById = async (req, res) => {
  try {
    const { labId } = req.params;
    
    const lab = await Lab.findById(labId);
    
    if (!lab) {
      return res.status(404).json({ error: 'Lab not found' });
    }

    res.json({ success: true, lab });
  } catch (error) {
    console.error('Get lab error:', error);
    res.status(500).json({ error: error.message });
  }
};

const getLabAvailability = async (req, res) => {
  try {
    const { labId, date } = req.query;
    
    if (!labId || !date) {
      return res.status(400).json({ error: 'labId and date are required' });
    }

    const lab = await Lab.findById(labId);
    if (!lab) {
      return res.status(404).json({ error: 'Lab not found' });
    }

    const [bookings] = await pool.execute(
      `SELECT start_time, end_time FROM bookings 
       WHERE lab_id = ? AND booking_date = ? AND status = 'confirmed'
       ORDER BY start_time`,
      [labId, date]
    );

    const { generateTimeSlots } = require('../utils/timeSlots');
    const allSlots = generateTimeSlots();
    
    const availability = allSlots.map(slot => ({
      ...slot,
      available: isTimeSlotAvailable(bookings, slot.start, slot.end)
    }));

    res.json({ 
      success: true, 
      lab,
      date,
      availability
    });
  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({ error: error.message });
  }
};

const getBuildings = async (req, res) => {
  try {
    const [buildings] = await pool.execute(
      'SELECT DISTINCT building FROM labs WHERE is_active = TRUE ORDER BY building'
    );
    res.json({ 
      success: true, 
      buildings: buildings.map(b => b.building) 
    });
  } catch (error) {
    console.error('Get buildings error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getAllLabs, getLabById, getLabAvailability, getBuildings };