const { pool } = require('../shared/config/database');
const Lab = require('../shared/models/Lab');
const { isTimeSlotAvailable } = require('../shared/utils/timeSlots');

const getAllLabs = async (req, res) => {
  try {
    const { building, is_ac, date } = req.query;
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
    
    const targetDate = date || new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().slice(0, 5);
    
    const enhancedLabs = await Promise.all(labs.map(async (lab) => {
      // Get today's booking count
      const [bookings] = await pool.execute(
        `SELECT COUNT(*) as booking_count FROM bookings 
         WHERE lab_id = ? AND booking_date = ? AND status = 'confirmed'`,
        [lab.id, targetDate]
      );
      
      // Check if lab is currently booked (real-time status)
      const [currentBooking] = await pool.execute(
        `SELECT id, user_id, start_time, end_time, purpose FROM bookings 
         WHERE lab_id = ? AND booking_date = ? AND status = 'confirmed'
         AND start_time <= ? AND end_time > ?`,
        [lab.id, targetDate, currentTime, currentTime]
      );
      
      // Get next booking for today
      const [nextBooking] = await pool.execute(
        `SELECT start_time, end_time, purpose FROM bookings 
         WHERE lab_id = ? AND booking_date = ? AND status = 'confirmed'
         AND start_time > ? 
         ORDER BY start_time ASC LIMIT 1`,
        [lab.id, targetDate, currentTime]
      );
      
      // Determine real-time status
      let status = 'available';
      if (!lab.is_active) {
        status = 'restricted';
      } else if (currentBooking.length > 0) {
        status = 'occupied';
      } else if (bookings[0].booking_count >= 10) {
        status = 'fully_booked';
      }
      
      return {
        ...lab,
        today_bookings: bookings[0].booking_count,
        has_availability_today: bookings[0].booking_count < 10,
        is_booked: currentBooking.length > 0,
        current_booking: currentBooking[0] || null,
        next_booking: nextBooking[0] || null,
        real_time_status: status,
        current_time: currentTime,
        target_date: targetDate
      };
    }));

    res.json({ 
      success: true, 
      labs: enhancedLabs
    });
  } catch (error) {
    console.error('Get labs error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getLabById = async (req, res) => {
  try {
    const { labId } = req.params;
    
    const lab = await Lab.findById(labId);
    
    if (!lab) {
      return res.status(404).json({ success: false, message: 'Lab not found' });
    }

    res.json({ success: true, lab });
  } catch (error) {
    console.error('Get lab error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getLabAvailability = async (req, res) => {
  try {
    const { labId, date } = req.query;
    
    if (!labId || !date) {
      return res.status(400).json({ success: false, message: 'labId and date are required' });
    }

    const lab = await Lab.findById(labId);
    if (!lab) {
      return res.status(404).json({ success: false, message: 'Lab not found' });
    }

    const [bookings] = await pool.execute(
      `SELECT start_time, end_time FROM bookings 
       WHERE lab_id = ? AND booking_date = ? AND status = 'confirmed'
       ORDER BY start_time`,
      [labId, date]
    );

    const { generateTimeSlots } = require('../shared/utils/timeSlots');
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
    res.status(500).json({ success: false, message: error.message });
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
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAllLabs, getLabById, getLabAvailability, getBuildings };