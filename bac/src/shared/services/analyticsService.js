const { pool } = require('../config/database');

const analyticsService = {
  // Lab utilization analytics
  getLabUtilization: async ({ start_date, end_date, bc_number, building } = {}) => {
    let query = `
      SELECT 
        l.name, l.building, l.capacity, l.is_ac,
        COUNT(b.id) as total_bookings,
        SUM(b.duration_hours) as booked_hours,
        AVG(b.duration_hours) as avg_booking_duration,
        (SUM(b.duration_hours) / ((DATEDIFF(?, ?) + 1) * 10.5)) * 100 as utilization_pct
      FROM labs l 
      LEFT JOIN bookings b ON l.id = b.lab_id AND b.status = 'confirmed'
      WHERE l.is_active = TRUE
    `;
    const params = [end_date, start_date];

    if (bc_number) {
      query += ' AND b.bc_number = ?';
      params.push(bc_number);
    }
    if (building) {
      query += ' AND l.building = ?';
      params.push(building);
    }

    query += ' GROUP BY l.id ORDER BY utilization_pct DESC';

    const [analytics] = await pool.execute(query, params);
    return analytics;
  },

  // Top labs by bookings
  getTopLabs: async (period = 'week') => {
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 365;
    
    const [topLabs] = await pool.execute(`
      SELECT l.name, l.building, COUNT(b.id) as booking_count,
             SUM(b.duration_hours) as total_hours
      FROM labs l 
      JOIN bookings b ON l.id = b.lab_id 
      WHERE b.booking_date >= DATE_SUB(NOW(), INTERVAL ? DAY) AND b.status = 'confirmed'
      GROUP BY l.id 
      ORDER BY booking_count DESC 
      LIMIT 5
    `, [days]);

    return topLabs;
  },

  // BC Number analytics
  getBCUtilization: async (start_date, end_date) => {
    const [bcStats] = await pool.execute(`
      SELECT b.bc_number, 
             COUNT(*) as bookings,
             SUM(b.duration_hours) as total_hours,
             GROUP_CONCAT(DISTINCT l.building) as buildings
      FROM bookings b 
      JOIN labs l ON b.lab_id = l.id
      WHERE b.booking_date BETWEEN ? AND ? AND b.status = 'confirmed'
      GROUP BY b.bc_number
      ORDER BY bookings DESC
    `, [start_date, end_date]);

    return bcStats;
  }
};

module.exports = { analyticsService };
