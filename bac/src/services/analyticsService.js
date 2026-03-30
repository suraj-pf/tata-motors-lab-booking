const pool = require('../config/db');

// IST timezone offset (UTC+5:30)
const IST_OFFSET_MINUTES = 330;

/**
 * Convert UTC date to IST
 */
const toIST = (utcDate) => {
  if (!utcDate) return null;
  const date = new Date(utcDate);
  return new Date(date.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
};

/**
 * Get current time in IST
 */
const getCurrentIST = () => {
  return toIST(new Date());
};

/**
 * Format date for MySQL (UTC)
 */
const toMySQLDateTime = (date) => {
  const d = new Date(date);
  return d.toISOString().slice(0, 19).replace('T', ' ');
};

/**
 * Get current UTC time for database queries
 */
const getCurrentUTC = () => {
  return new Date();
};

/**
 * Compute full analytics from ALL bookings
 */
const computeFullAnalytics = async () => {
  try {
    const nowUTC = getCurrentUTC();
    const nowMySQL = toMySQLDateTime(nowUTC);

    // Get ALL bookings (no date limit)
    const [allBookings] = await pool.execute(`
      SELECT 
        b.*,
        l.name as lab_name,
        l.building,
        l.capacity,
        l.hourly_charges,
        u.name as user_name,
        u.department
      FROM bookings b
      JOIN labs l ON b.lab_id = l.id
      JOIN users u ON b.user_id = u.id
      ORDER BY b.booking_date DESC, b.start_time DESC
    `);

    // Get ALL labs
    const [allLabs] = await pool.execute(`
      SELECT id, name, building, capacity, hourly_charges, is_active
      FROM labs
      ORDER BY id
    `);

    // Compute status counts
    const totalBookings = allBookings.length;
    const cancelledBookings = allBookings.filter(b => b.status === 'cancelled').length;
    const completedBookings = allBookings.filter(b => b.status === 'completed').length;
    const confirmedBookings = allBookings.filter(b => b.status === 'confirmed').length;
    const pendingBookings = allBookings.filter(b => b.status === 'pending').length;

    // Compute active bookings (start <= now <= end AND status != cancelled)
    const activeBookings = allBookings.filter(b => {
      if (b.status === 'cancelled') return false;
      const bookingDate = b.booking_date;
      const startTime = b.start_time;
      const endTime = b.end_time;
      
      // Create full datetime strings
      const startDateTime = new Date(`${bookingDate}T${startTime}`);
      const endDateTime = new Date(`${bookingDate}T${endTime}`);
      
      return startDateTime <= nowUTC && nowUTC <= endDateTime;
    });

    // Compute upcoming bookings (start > now AND status != cancelled)
    const upcomingBookings = allBookings.filter(b => {
      if (b.status === 'cancelled') return false;
      const bookingDate = b.booking_date;
      const startTime = b.start_time;
      const startDateTime = new Date(`${bookingDate}T${startTime}`);
      return startDateTime > nowUTC;
    });

    // Compute active labs (unique labs with active bookings)
    const activeLabIds = new Set(activeBookings.map(b => b.lab_id));
    const activeLabs = activeLabIds.size;

    // Compute per-lab metrics
    const labMetrics = allLabs.map(lab => {
      const labBookings = allBookings.filter(b => b.lab_id === lab.id);
      const activeLabBookings = activeBookings.filter(b => b.lab_id === lab.id);
      
      // Total booked hours for this lab (excluding cancelled)
      const totalBookedHours = labBookings
        .filter(b => b.status !== 'cancelled')
        .reduce((sum, b) => sum + (parseFloat(b.duration_hours) || 0), 0);
      
      // Total available hours since lab creation (approximation)
      // Assuming lab is available 10.5 hours/day, 7 days/week
      const hoursPerDay = 10.5;
      const daysSinceLabCreated = 365; // Assume 1 year for now
      const totalAvailableHours = daysSinceLabCreated * hoursPerDay;
      
      // Utilization percentage
      const utilization = totalAvailableHours > 0
        ? ((totalBookedHours / totalAvailableHours) * 100).toFixed(2)
        : 0;

      return {
        lab_id: lab.id,
        name: lab.name,
        building: lab.building,
        capacity: lab.capacity,
        is_active: lab.is_active,
        total_bookings: labBookings.length,
        active_bookings: activeLabBookings.length,
        total_booked_hours: totalBookedHours.toFixed(2),
        total_available_hours: totalAvailableHours,
        utilization_percentage: parseFloat(utilization),
        revenue: labBookings
          .filter(b => b.status !== 'cancelled')
          .reduce((sum, b) => sum + (parseFloat(lab.hourly_charges) * parseFloat(b.duration_hours) || 0), 0)
          .toFixed(2)
      };
    });

    // Find most used lab
    const mostUsedLab = [...labMetrics]
      .sort((a, b) => b.total_bookings - a.total_bookings)[0] || null;

    // Compute peak hour from all bookings
    const hourDistribution = {};
    allBookings
      .filter(b => b.status !== 'cancelled')
      .forEach(b => {
        const hour = parseInt(b.start_time.split(':')[0]);
        hourDistribution[hour] = (hourDistribution[hour] || 0) + 1;
      });
    
    const peakHour = Object.entries(hourDistribution)
      .sort((a, b) => b[1] - a[1])[0];

    // Compute average duration
    const nonCancelledBookings = allBookings.filter(b => b.status !== 'cancelled');
    const avgDuration = nonCancelledBookings.length > 0
      ? (nonCancelledBookings.reduce((sum, b) => sum + parseFloat(b.duration_hours), 0) / nonCancelledBookings.length).toFixed(2)
      : 0;

    // Booking distribution by status
    const statusDistribution = {
      total: totalBookings,
      active: activeBookings.length,
      upcoming: upcomingBookings.length,
      completed: completedBookings,
      cancelled: cancelledBookings,
      confirmed: confirmedBookings,
      pending: pendingBookings
    };

    // Booking distribution by hour (for heatmap)
    const hourlyDistribution = Array(24).fill(0).map((_, hour) => ({
      hour,
      count: hourDistribution[hour] || 0
    }));

    // Booking distribution by day of week
    const dayDistribution = {};
    allBookings
      .filter(b => b.status !== 'cancelled')
      .forEach(b => {
        const date = new Date(b.booking_date);
        const day = date.getDay();
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayName = dayNames[day];
        dayDistribution[dayName] = (dayDistribution[dayName] || 0) + 1;
      });

    // Recent 24 hours activity
    const last24Hours = new Date(nowUTC.getTime() - 24 * 60 * 60 * 1000);
    const recent24hBookings = allBookings.filter(b => {
      const createdAt = new Date(b.created_at);
      return createdAt >= last24Hours;
    });

    // Current active bookings with IST display times
    const activeBookingsIST = activeBookings.map(b => ({
      ...b,
      start_time_ist: toIST(`${b.booking_date}T${b.start_time}`)?.toISOString(),
      end_time_ist: toIST(`${b.booking_date}T${b.end_time}`)?.toISOString()
    }));

    return {
      success: true,
      timestamp: {
        utc: nowUTC.toISOString(),
        ist: getCurrentIST().toISOString()
      },
      overview: {
        total_bookings: totalBookings,
        active_bookings: activeBookings.length,
        upcoming_bookings: upcomingBookings.length,
        completed_bookings: completedBookings,
        cancelled_bookings: cancelledBookings,
        confirmed_bookings: confirmedBookings,
        pending_bookings: pendingBookings,
        active_labs: activeLabs,
        total_labs: allLabs.length,
        avg_duration_hours: parseFloat(avgDuration)
      },
      lab_metrics: labMetrics.sort((a, b) => b.utilization_percentage - a.utilization_percentage),
      most_used_lab: mostUsedLab,
      peak_hour: peakHour ? {
        hour: parseInt(peakHour[0]),
        count: peakHour[1],
        formatted: `${String(peakHour[0]).padStart(2, '0')}:00 - ${String(parseInt(peakHour[0]) + 1).padStart(2, '0')}:00`
      } : null,
      status_distribution: statusDistribution,
      hourly_distribution: hourlyDistribution,
      day_distribution: dayDistribution,
      active_bookings_now: {
        count: activeBookings.length,
        bookings: activeBookingsIST,
        labs_in_use: activeLabs
      },
      recent_activity_24h: {
        new_bookings: recent24hBookings.filter(b => b.status !== 'cancelled').length,
        cancelled: recent24hBookings.filter(b => b.status === 'cancelled').length,
        total: recent24hBookings.length
      }
    };
  } catch (error) {
    console.error('[ANALYTICS] Error computing full analytics:', error);
    throw error;
  }
};

/**
 * Get real-time snapshot of currently active bookings
 */
const getRealtimeSnapshot = async () => {
  try {
    const nowUTC = getCurrentUTC();
    const nowMySQL = toMySQLDateTime(nowUTC);

    // Get currently active bookings
    const [activeBookings] = await pool.execute(`
      SELECT 
        b.*,
        l.name as lab_name,
        l.building,
        u.name as user_name,
        u.department
      FROM bookings b
      JOIN labs l ON b.lab_id = l.id
      JOIN users u ON b.user_id = u.id
      WHERE b.status != 'cancelled'
      AND CONCAT(b.booking_date, ' ', b.start_time) <= ?
      AND CONCAT(b.booking_date, ' ', b.end_time) >= ?
      ORDER BY b.end_time ASC
    `, [nowMySQL, nowMySQL]);

    // Get active labs
    const activeLabIds = [...new Set(activeBookings.map(b => b.lab_id))];
    const activeLabs = activeLabIds.length;

    // Get today's stats
    const today = nowUTC.toISOString().split('T')[0];
    const [todayBookings] = await pool.execute(`
      SELECT 
        status,
        COUNT(*) as count
      FROM bookings
      WHERE booking_date = ?
      GROUP BY status
    `, [today]);

    return {
      success: true,
      timestamp: {
        utc: nowUTC.toISOString(),
        ist: getCurrentIST().toISOString()
      },
      active_bookings: {
        count: activeBookings.length,
        list: activeBookings.map(b => ({
          ...b,
          start_time_ist: toIST(`${b.booking_date}T${b.start_time}`)?.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          end_time_ist: toIST(`${b.booking_date}T${b.end_time}`)?.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        }))
      },
      active_labs: activeLabs,
      today_stats: todayBookings.reduce((acc, row) => {
        acc[row.status] = row.count;
        return acc;
      }, {})
    };
  } catch (error) {
    console.error('[ANALYTICS] Error getting realtime snapshot:', error);
    throw error;
  }
};

module.exports = {
  computeFullAnalytics,
  getRealtimeSnapshot,
  toIST,
  getCurrentIST,
  toMySQLDateTime,
  getCurrentUTC
};
