const db = require('../shared/config/database');

class TimelineController {
  // Optimized query for day view (hourly slots)
  async getDayView(req, res) {
    try {
      const { date } = req.query;
      
      if (!date) {
        return res.status(400).json({ error: 'Date parameter is required' });
      }

      // Get all labs with their booking counts for the day
      const labsQuery = `
        SELECT 
          l.id,
          l.name,
          l.building,
          l.capacity,
          l.is_ac,
          l.is_active,
          l.hourly_charges,
          l.facilities,
          l.lab_owner,
          COUNT(b.id) as today_bookings,
          SUM(CASE WHEN b.status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_bookings
        FROM labs l
        LEFT JOIN bookings b ON l.id = b.lab_id 
          AND b.booking_date = ? 
          AND b.status IN ('confirmed', 'pending')
        WHERE l.is_active = 1
        GROUP BY l.id, l.name, l.building, l.capacity, l.is_ac, l.is_active, l.hourly_charges, l.facilities, l.lab_owner
        ORDER BY l.building, l.name
      `;

      const [labs] = await db.execute(labsQuery, [date]);

      // Get bookings for the day with user details
      const bookingsQuery = `
        SELECT 
          b.id,
          b.lab_id,
          b.user_id,
          b.start_time,
          b.end_time,
          b.booking_date,
          b.status,
          b.purpose,
          b.duration_hours,
          b.created_at,
          u.name as user_name,
          u.bc_number,
          l.name as lab_name,
          l.building
        FROM bookings b
        JOIN labs l ON b.lab_id = l.id
        JOIN users u ON b.user_id = u.id
        WHERE b.booking_date = ?
          AND b.status IN ('confirmed', 'pending')
        ORDER BY b.start_time ASC, l.building, l.name
      `;

      const [bookings] = await db.execute(bookingsQuery, [date]);

      // Generate time slots (6:30 AM to 5:00 PM, 30-minute intervals)
      const timeSlots = [];
      const startHour = 6;
      const startMinute = 30;
      const endHour = 17;
      
      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          if (hour === startHour && minute < startMinute) continue;
          
          const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          timeSlots.push(timeStr);
        }
      }

      // Group bookings by lab
      const bookingsByLab = {};
      bookings.forEach(booking => {
        if (!bookingsByLab[booking.lab_id]) {
          bookingsByLab[booking.lab_id] = [];
        }
        bookingsByLab[booking.lab_id].push(booking);
      });

      res.json({
        success: true,
        data: {
          date,
          labs,
          timeSlots,
          bookings,
          bookingsByLab,
          view: 'day'
        }
      });

    } catch (error) {
      console.error('Error in getDayView:', error);
      res.status(500).json({ error: 'Failed to fetch day view data' });
    }
  }

  // Optimized query for week view (daily slots)
  async getWeekView(req, res) {
    try {
      const { start_date, end_date } = req.query;
      
      if (!start_date || !end_date) {
        return res.status(400).json({ error: 'Start date and end date parameters are required' });
      }

      // Get all active labs
      const labsQuery = `
        SELECT 
          l.id,
          l.name,
          l.building,
          l.capacity,
          l.is_ac,
          l.is_active,
          l.hourly_charges,
          l.facilities,
          l.lab_owner
        FROM labs l
        WHERE l.is_active = 1
        ORDER BY l.building, l.name
      `;

      const [labs] = await db.execute(labsQuery);

      // Get bookings for the week with daily aggregation
      const bookingsQuery = `
        SELECT 
          b.id,
          b.lab_id,
          b.user_id,
          b.start_time,
          b.end_time,
          b.booking_date,
          b.status,
          b.purpose,
          b.duration_hours,
          u.name as user_name,
          u.bc_number,
          l.name as lab_name,
          l.building,
          DATE(b.booking_date) as date_only
        FROM bookings b
        JOIN labs l ON b.lab_id = l.id
        JOIN users u ON b.user_id = u.id
        WHERE b.booking_date BETWEEN ? AND ?
          AND b.status IN ('confirmed', 'pending')
        ORDER BY b.booking_date ASC, b.start_time ASC, l.building, l.name
      `;

      const [bookings] = await db.execute(bookingsQuery, [start_date, end_date]);

      // Get daily statistics
      const dailyStatsQuery = `
        SELECT 
          DATE(b.booking_date) as date,
          b.lab_id,
          COUNT(*) as daily_bookings,
          SUM(b.duration_hours) as total_hours,
          COUNT(DISTINCT b.user_id) as unique_users,
          GROUP_CONCAT(DISTINCT b.id) as booking_ids
        FROM bookings b
        WHERE b.booking_date BETWEEN ? AND ?
          AND b.status = 'confirmed'
        GROUP BY DATE(b.booking_date), b.lab_id
        ORDER BY DATE(b.booking_date), b.lab_id
      `;

      const [dailyStats] = await db.execute(dailyStatsQuery, [start_date, end_date]);

      // Generate date range
      const dates = [];
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        dates.push(date.toISOString().split('T')[0]);
      }

      // Group bookings by lab and date
      const bookingsByLab = {};
      const statsByLab = {};
      
      labs.forEach(lab => {
        bookingsByLab[lab.id] = {};
        statsByLab[lab.id] = {};
        
        dates.forEach(date => {
          bookingsByLab[lab.id][date] = [];
          statsByLab[lab.id][date] = {
            bookings_count: 0,
            total_hours: 0,
            unique_users: 0
          };
        });
      });

      // Populate bookings
      bookings.forEach(booking => {
        const date = booking.date_only;
        if (bookingsByLab[booking.lab_id] && bookingsByLab[booking.lab_id][date]) {
          bookingsByLab[booking.lab_id][date].push(booking);
        }
      });

      // Populate stats
      dailyStats.forEach(stat => {
        if (statsByLab[stat.lab_id] && statsByLab[stat.lab_id][stat.date]) {
          statsByLab[stat.lab_id][stat.date] = {
            bookings_count: stat.daily_bookings,
            total_hours: stat.total_hours,
            unique_users: stat.unique_users
          };
        }
      });

      res.json({
        success: true,
        data: {
          start_date,
          end_date,
          dates,
          labs,
          bookings,
          bookingsByLab,
          dailyStats: statsByLab,
          view: 'week'
        }
      });

    } catch (error) {
      console.error('Error in getWeekView:', error);
      res.status(500).json({ error: 'Failed to fetch week view data' });
    }
  }

  // Optimized query for month view with aggregation
  async getMonthView(req, res) {
    try {
      const { year, month } = req.query;
      
      if (!year || !month) {
        return res.status(400).json({ error: 'Year and month parameters are required' });
      }

      // Calculate date range for the month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // Last day of month
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Get all active labs
      const labsQuery = `
        SELECT 
          l.id,
          l.name,
          l.building,
          l.capacity,
          l.is_ac,
          l.is_active,
          l.hourly_charges,
          l.facilities,
          l.lab_owner
        FROM labs l
        WHERE l.is_active = 1
        ORDER BY l.building, l.name
      `;

      const [labs] = await db.execute(labsQuery);

      // Get aggregated monthly data
      const monthlyDataQuery = `
        SELECT 
          b.lab_id,
          DATE(b.booking_date) as date,
          COUNT(*) as bookings_count,
          SUM(b.duration_hours) as total_hours,
          COUNT(DISTINCT b.user_id) as unique_users,
          AVG(b.duration_hours) as avg_duration,
          MAX(b.duration_hours) as max_duration,
          MIN(b.duration_hours) as min_duration,
          GROUP_CONCAT(DISTINCT b.user_id) as user_ids
        FROM bookings b
        WHERE b.booking_date BETWEEN ? AND ?
          AND b.status = 'confirmed'
        GROUP BY b.lab_id, DATE(b.booking_date)
        ORDER BY DATE(b.booking_date), b.lab_id
      `;

      const [monthlyData] = await db.execute(monthlyDataQuery, [startDateStr, endDateStr]);

      // Get monthly summary per lab
      const monthlySummaryQuery = `
        SELECT 
          b.lab_id,
          COUNT(*) as total_bookings,
          SUM(b.duration_hours) as total_hours,
          COUNT(DISTINCT b.user_id) as unique_users,
          AVG(b.duration_hours) as avg_duration,
          SUM(b.duration_hours * l.hourly_charges) as total_revenue,
          COUNT(CASE WHEN b.status = 'pending' THEN 1 END) as pending_bookings,
          COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings
        FROM bookings b
        JOIN labs l ON b.lab_id = l.id
        WHERE b.booking_date BETWEEN ? AND ?
        GROUP BY b.lab_id
        ORDER BY total_bookings DESC
      `;

      const [monthlySummary] = await db.execute(monthlySummaryQuery, [startDateStr, endDateStr]);

      // Generate all dates in the month
      const dates = [];
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        dates.push(date.toISOString().split('T')[0]);
      }

      // Group data by lab and date
      const dataByLab = {};
      const summaryByLab = {};
      
      labs.forEach(lab => {
        dataByLab[lab.id] = {};
        summaryByLab[lab.id] = {
          total_bookings: 0,
          total_hours: 0,
          unique_users: 0,
          avg_duration: 0,
          total_revenue: 0,
          pending_bookings: 0,
          cancelled_bookings: 0
        };
        
        dates.forEach(date => {
          dataByLab[lab.id][date] = {
            bookings_count: 0,
            total_hours: 0,
            unique_users: 0,
            avg_duration: 0,
            user_ids: []
          };
        });
      });

      // Populate daily data
      monthlyData.forEach(data => {
        if (dataByLab[data.lab_id] && dataByLab[data.lab_id][data.date]) {
          dataByLab[data.lab_id][data.date] = {
            bookings_count: data.bookings_count,
            total_hours: data.total_hours,
            unique_users: data.unique_users,
            avg_duration: data.avg_duration,
            user_ids: data.user_ids ? data.user_ids.split(',') : []
          };
        }
      });

      // Populate summary data
      monthlySummary.forEach(summary => {
        if (summaryByLab[summary.lab_id]) {
          summaryByLab[summary.lab_id] = {
            total_bookings: summary.total_bookings,
            total_hours: summary.total_hours,
            unique_users: summary.unique_users,
            avg_duration: summary.avg_duration,
            total_revenue: summary.total_revenue,
            pending_bookings: summary.pending_bookings,
            cancelled_bookings: summary.cancelled_bookings
          };
        }
      });

      res.json({
        success: true,
        data: {
          year,
          month,
          start_date: startDateStr,
          end_date: endDateStr,
          dates,
          labs,
          monthlyData: dataByLab,
          monthlySummary: summaryByLab,
          view: 'month'
        }
      });

    } catch (error) {
      console.error('Error in getMonthView:', error);
      res.status(500).json({ error: 'Failed to fetch month view data' });
    }
  }

  // Real-time availability check with optimized query
  async checkAvailability(req, res) {
    try {
      const { lab_id, booking_date, start_time, end_time, exclude_booking_id } = req.query;
      
      if (!lab_id || !booking_date || !start_time || !end_time) {
        return res.status(400).json({ 
          error: 'lab_id, booking_date, start_time, and end_time are required' 
        });
      }

      let availabilityQuery = `
        SELECT 
          b.id,
          b.start_time,
          b.end_time,
          b.status,
          u.name as user_name,
          b.purpose
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        WHERE b.lab_id = ?
          AND b.booking_date = ?
          AND b.status = 'confirmed'
          AND (
            (b.start_time < ? AND b.end_time > ?) OR
            (b.start_time >= ? AND b.start_time < ?) OR
            (b.end_time > ? AND b.end_time <= ?)
          )
      `;

      const params = [lab_id, booking_date, end_time, start_time, start_time, end_time, start_time, end_time];
      
      if (exclude_booking_id) {
        availabilityQuery += ' AND b.id != ?';
        params.push(exclude_booking_id);
      }

      availabilityQuery += ' ORDER BY b.start_time ASC';

      const [conflicts] = await db.execute(availabilityQuery, params);

      // Get lab details
      const labQuery = `
        SELECT id, name, building, capacity, is_active, hourly_charges
        FROM labs 
        WHERE id = ? AND is_active = 1
      `;
      
      const [labData] = await db.execute(labQuery, [lab_id]);

      if (labData.length === 0) {
        return res.status(404).json({ error: 'Lab not found or inactive' });
      }

      // Check if lab is available during the requested time
      const isAvailable = conflicts.length === 0;

      // Get available time slots around the requested time
      const availableSlotsQuery = `
        SELECT 
          TIME_FORMAT(time_slot, '%H:%i') as available_time
        FROM (
          SELECT 
            ADDTIME('06:30:00', INTERVAL (seq * 30) MINUTE) as time_slot
          FROM (
            SELECT 0 as seq UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION
            SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION
            SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION
            SELECT 18 UNION SELECT 19 UNION SELECT 20
          ) as sequences
          WHERE ADDTIME('06:30:00', INTERVAL (seq * 30) MINUTE) < '17:00:00'
        ) as all_slots
        WHERE time_slot NOT IN (
          SELECT DISTINCT start_time
          FROM bookings 
          WHERE lab_id = ? 
            AND booking_date = ? 
            AND status = 'confirmed'
            AND (
              (start_time < ? AND end_time > ?) OR
              (start_time >= ? AND start_time < ?) OR
              (end_time > ? AND end_time <= ?)
            )
          ${exclude_booking_id ? 'AND id != ?' : ''}
        )
        ORDER BY time_slot
      `;

      const availableSlotsParams = [lab_id, booking_date, end_time, start_time, start_time, end_time, start_time, end_time];
      if (exclude_booking_id) {
        availableSlotsParams.push(exclude_booking_id);
      }

      const [availableSlots] = await db.execute(availableSlotsQuery, availableSlotsParams);

      res.json({
        success: true,
        data: {
          lab: labData[0],
          is_available: isAvailable,
          conflicts: conflicts,
          available_slots: availableSlots.map(slot => slot.available_time),
          requested_time: {
            start_time,
            end_time,
            booking_date
          }
        }
      });

    } catch (error) {
      console.error('Error in checkAvailability:', error);
      res.status(500).json({ error: 'Failed to check availability' });
    }
  }

  // Get timeline analytics
  async getTimelineAnalytics(req, res) {
    try {
      const { start_date, end_date, lab_id } = req.query;
      
      if (!start_date || !end_date) {
        return res.status(400).json({ error: 'Start date and end date are required' });
      }

      let whereClause = 'WHERE b.booking_date BETWEEN ? AND ?';
      let params = [start_date, end_date];
      
      if (lab_id) {
        whereClause += ' AND b.lab_id = ?';
        params.push(lab_id);
      }

      // Get utilization analytics
      const utilizationQuery = `
        SELECT 
          l.id as lab_id,
          l.name as lab_name,
          l.building,
          l.capacity,
          COUNT(b.id) as total_bookings,
          SUM(CASE WHEN b.status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_bookings,
          SUM(CASE WHEN b.status = 'pending' THEN 1 ELSE 0 END) as pending_bookings,
          SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings,
          SUM(b.duration_hours) as total_hours,
          COUNT(DISTINCT b.user_id) as unique_users,
          SUM(b.duration_hours * l.hourly_charges) as total_revenue,
          ROUND(
            (SUM(b.duration_hours) / (DATEDIFF(?, ?) + 1) * 10.5) * 100 / l.capacity, 
            2
          ) as utilization_percentage
        FROM labs l
        LEFT JOIN bookings b ON l.id = b.lab_id
        ${whereClause}
        GROUP BY l.id, l.name, l.building, l.capacity
        ORDER BY utilization_percentage DESC
      `;

      const [utilization] = await db.execute(utilizationQuery, [...params, end_date, start_date]);

      // Get daily trends
      const trendsQuery = `
        SELECT 
          DATE(b.booking_date) as date,
          COUNT(*) as bookings_count,
          SUM(b.duration_hours) as total_hours,
          COUNT(DISTINCT b.lab_id) as labs_used,
          COUNT(DISTINCT b.user_id) as unique_users,
          SUM(CASE WHEN b.status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_bookings
        FROM bookings b
        ${whereClause}
        GROUP BY DATE(b.booking_date)
        ORDER BY date ASC
      `;

      const [trends] = await db.execute(trendsQuery, params);

      // Get peak hours analysis
      const peakHoursQuery = `
        SELECT 
          b.start_time,
          COUNT(*) as booking_count,
          COUNT(DISTINCT b.lab_id) as labs_used,
          COUNT(DISTINCT b.user_id) as unique_users
        FROM bookings b
        ${whereClause}
        GROUP BY b.start_time
        ORDER BY booking_count DESC
        LIMIT 10
      `;

      const [peakHours] = await db.execute(peakHoursQuery, params);

      res.json({
        success: true,
        data: {
          utilization,
          trends,
          peakHours,
          period: { start_date, end_date, lab_id }
        }
      });

    } catch (error) {
      console.error('Error in getTimelineAnalytics:', error);
      res.status(500).json({ error: 'Failed to fetch timeline analytics' });
    }
  }
}

module.exports = new TimelineController();
