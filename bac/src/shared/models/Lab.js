const { pool } = require('../config/database');

const Lab = {
  findAll: async (filters = {}) => {
    let query = 'SELECT * FROM labs WHERE is_active = TRUE';
    const params = [];
    
    if (filters.building) {
      query += ' AND building = ?';
      params.push(filters.building);
    }
    
    if (filters.is_ac !== undefined) {
      query += ' AND is_ac = ?';
      params.push(filters.is_ac);
    }
    
    query += ' ORDER BY building, name';
    
    const [labs] = await pool.execute(query, params);
    return labs;
  },
  
  findById: async (id) => {
    const [labs] = await pool.execute(
      'SELECT * FROM labs WHERE id = ? AND is_active = TRUE', 
      [id]
    );
    return labs[0];
  },

  getAvailability: async (labId, date) => {
    const [bookings] = await pool.execute(
      `SELECT start_time, end_time FROM bookings 
       WHERE lab_id = ? AND booking_date = ? AND status = 'confirmed'
       ORDER BY start_time`,
      [labId, date]
    );
    return bookings;
  },

  getBuildings: async () => {
    const [buildings] = await pool.execute(
      'SELECT DISTINCT building FROM labs WHERE is_active = TRUE ORDER BY building'
    );
    return buildings.map(b => b.building);
  }
};

module.exports = Lab;