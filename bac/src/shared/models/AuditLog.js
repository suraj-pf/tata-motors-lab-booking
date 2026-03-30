const { pool } = require('../config/database');

const AuditLog = {
  logAction: async (userId, action, labId, bookingId, oldData, newData, ipAddress, userAgent) => {
    await pool.execute(
      `INSERT INTO audit_logs (user_id, action, lab_id, booking_id, old_data, new_data, ip_address, user_agent) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, action, labId, bookingId, 
       oldData ? JSON.stringify(oldData) : null, 
       newData ? JSON.stringify(newData) : null,
       ipAddress, userAgent]
    );
  },

  getByUser: async (userId) => {
    const [logs] = await pool.execute(
      'SELECT * FROM audit_logs WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    return logs;
  },

  getByAction: async (action) => {
    const [logs] = await pool.execute(
      'SELECT * FROM audit_logs WHERE action = ? ORDER BY created_at DESC',
      [action]
    );
    return logs;
  }
};

module.exports = AuditLog;