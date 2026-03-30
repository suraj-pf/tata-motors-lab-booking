const { pool } = require('../shared/config/database');
const { analyticsService } = require('../shared/services/analyticsService');
const { getIO, emitToAdmins } = require('../shared/config/socket');

// IST timezone offset (UTC+5:30)
const IST_OFFSET_MINUTES = 330;

const toIST = (utcDate) => {
  if (!utcDate) return null;
  const date = new Date(utcDate);
  return new Date(date.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
};

const getCurrentIST = () => toIST(new Date());
const toMySQLDateTime = (date) => new Date(date).toISOString().slice(0, 19).replace('T', ' ');

/**
 * Compute full analytics from ALL bookings
 */
const computeFullAnalytics = async () => {
  const nowUTC = new Date();
  const nowMySQL = toMySQLDateTime(nowUTC);

  const [allBookings] = await pool.execute(`
    SELECT b.*, l.name as lab_name, l.building, l.capacity, l.hourly_charges,
           u.name as user_name, u.department
    FROM bookings b
    JOIN labs l ON b.lab_id = l.id
    JOIN users u ON b.user_id = u.id
    ORDER BY b.booking_date DESC, b.start_time DESC
  `);

  const [allLabs] = await pool.execute(`SELECT * FROM labs ORDER BY id`);

  // Status counts
  const totalBookings = allBookings.length;
  const cancelledBookings = allBookings.filter(b => b.status === 'cancelled').length;
  const completedBookings = allBookings.filter(b => b.status === 'completed').length;
  const confirmedBookings = allBookings.filter(b => b.status === 'confirmed').length;
  const pendingBookings = allBookings.filter(b => b.status === 'pending').length;

  // Active bookings (start <= now <= end AND status != cancelled)
  const activeBookings = allBookings.filter(b => {
    if (b.status === 'cancelled') return false;
    const startDT = new Date(`${b.booking_date}T${b.start_time}`);
    const endDT = new Date(`${b.booking_date}T${b.end_time}`);
    return startDT <= nowUTC && nowUTC <= endDT;
  });

  // Upcoming bookings (start > now AND status != cancelled)
  const upcomingBookings = allBookings.filter(b => {
    if (b.status === 'cancelled') return false;
    const startDT = new Date(`${b.booking_date}T${b.start_time}`);
    return startDT > nowUTC;
  });

  const activeLabIds = new Set(activeBookings.map(b => b.lab_id));

  // Lab metrics
  const labMetrics = allLabs.map(lab => {
    const labBookings = allBookings.filter(b => b.lab_id === lab.id);
    const activeLabBookings = activeBookings.filter(b => b.lab_id === lab.id);
    const totalBookedHours = labBookings
      .filter(b => b.status !== 'cancelled')
      .reduce((sum, b) => sum + (parseFloat(b.duration_hours) || 0), 0);
    
    const hoursPerDay = 10.5;
    const daysSinceCreated = 365;
    const totalAvailable = daysSinceCreated * hoursPerDay;
    const utilization = totalAvailable > 0 ? ((totalBookedHours / totalAvailable) * 100).toFixed(2) : 0;

    return {
      lab_id: lab.id,
      name: lab.name,
      building: lab.building,
      capacity: lab.capacity,
      total_bookings: labBookings.length,
      active_bookings: activeLabBookings.length,
      total_booked_hours: totalBookedHours.toFixed(2),
      utilization_percentage: parseFloat(utilization),
      revenue: labBookings
        .filter(b => b.status !== 'cancelled')
        .reduce((sum, b) => sum + ((parseFloat(lab.hourly_charges) || 0) * (parseFloat(b.duration_hours) || 0)), 0)
        .toFixed(2)
    };
  });

  const mostUsedLab = [...labMetrics].sort((a, b) => b.total_bookings - a.total_bookings)[0] || null;

  // Peak hour
  const hourDist = {};
  allBookings.filter(b => b.status !== 'cancelled').forEach(b => {
    const hour = parseInt(b.start_time.split(':')[0]);
    hourDist[hour] = (hourDist[hour] || 0) + 1;
  });
  const peakHour = Object.entries(hourDist).sort((a, b) => b[1] - a[1])[0];

  // Average duration
  const nonCancelled = allBookings.filter(b => b.status !== 'cancelled');
  const avgDuration = nonCancelled.length > 0
    ? (nonCancelled.reduce((sum, b) => sum + parseFloat(b.duration_hours || 0), 0) / nonCancelled.length).toFixed(2)
    : 0;

  // Hourly distribution
  const hourlyDistribution = Array(24).fill(0).map((_, h) => ({ hour: h, count: hourDist[h] || 0 }));

  return {
    success: true,
    timestamp: { utc: nowUTC.toISOString(), ist: getCurrentIST().toISOString() },
    overview: {
      total_bookings: totalBookings,
      active_bookings: activeBookings.length,
      upcoming_bookings: upcomingBookings.length,
      completed_bookings: completedBookings,
      cancelled_bookings: cancelledBookings,
      confirmed_bookings: confirmedBookings,
      pending_bookings: pendingBookings,
      active_labs: activeLabIds.size,
      total_labs: allLabs.length,
      avg_duration_hours: parseFloat(avgDuration)
    },
    lab_metrics: labMetrics.sort((a, b) => b.utilization_percentage - a.utilization_percentage),
    most_used_lab: mostUsedLab,
    peak_hour: peakHour ? { hour: parseInt(peakHour[0]), count: peakHour[1], formatted: `${String(peakHour[0]).padStart(2, '0')}:00 IST` } : null,
    status_distribution: { total: totalBookings, active: activeBookings.length, upcoming: upcomingBookings.length, completed: completedBookings, cancelled: cancelledBookings, confirmed: confirmedBookings, pending: pendingBookings },
    hourly_distribution: hourlyDistribution,
    active_bookings_now: {
      count: activeBookings.length,
      bookings: activeBookings.map(b => ({
        id: b.id,
        lab_name: b.lab_name,
        building: b.building,
        user_name: b.user_name,
        department: b.department,
        start_time_ist: toIST(`${b.booking_date}T${b.start_time}`)?.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        end_time_ist: toIST(`${b.booking_date}T${b.end_time}`)?.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
      })),
      labs_in_use: activeLabIds.size
    }
  };
};

/**
 * Get full analytics API
 */
const getFullAnalytics = async (req, res) => {
  try {
    const analytics = await computeFullAnalytics();
    res.json(analytics);
  } catch (error) {
    console.error('[ANALYTICS] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get realtime metrics snapshot
 */
const getRealtimeMetrics = async (req, res) => {
  try {
    const nowUTC = new Date();
    const nowMySQL = toMySQLDateTime(nowUTC);

    const [activeBookings] = await pool.execute(`
      SELECT b.*, l.name as lab_name, l.building, u.name as user_name
      FROM bookings b
      JOIN labs l ON b.lab_id = l.id
      JOIN users u ON b.user_id = u.id
      WHERE b.status != 'cancelled'
      AND CONCAT(b.booking_date, ' ', b.start_time) <= ?
      AND CONCAT(b.booking_date, ' ', b.end_time) >= ?
    `, [nowMySQL, nowMySQL]);

    res.json({
      success: true,
      timestamp: { utc: nowUTC.toISOString(), ist: getCurrentIST().toISOString() },
      active_bookings: activeBookings.length,
      active_labs: new Set(activeBookings.map(b => b.lab_id)).size,
      bookings: activeBookings.map(b => ({
        ...b,
        start_time_ist: toIST(`${b.booking_date}T${b.start_time}`)?.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        end_time_ist: toIST(`${b.booking_date}T${b.end_time}`)?.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Broadcast analytics update to all admins
 */
const broadcastAnalyticsUpdate = async () => {
  try {
    const analytics = await computeFullAnalytics();
    emitToAdmins('analytics-update', { ...analytics, update_type: 'full' });
    console.log('[ANALYTICS] Broadcasted update');
  } catch (error) {
    console.error('[ANALYTICS] Broadcast error:', error);
  }
};

// Legacy endpoints
const getLabUtilization = async (req, res) => {
  try {
    const analytics = await computeFullAnalytics();
    res.json({ success: true, utilization: analytics.lab_metrics });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getTopLabs = async (req, res) => {
  try {
    const analytics = await computeFullAnalytics();
    res.json({ success: true, top_labs: analytics.lab_metrics.slice(0, 5) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getFullAnalytics, getRealtimeMetrics, broadcastAnalyticsUpdate, getLabUtilization, getTopLabs };
