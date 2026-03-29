const { pool } = require('../config/database');

const User = {
  findById: async (id) => {
    const [users] = await pool.execute(
      'SELECT id, username, name, bc_number, department, role, created_at FROM users WHERE id = ? AND is_active = TRUE',
      [id]
    );
    return users[0];
  },

  findByUsername: async (username) => {
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE username = ? AND is_active = TRUE',
      [username]
    );
    return users[0];
  },

  findByBCNumber: async (bcNumber) => {
    const [users] = await pool.execute(
      'SELECT id, username, name, bc_number, department, role FROM users WHERE bc_number = ? AND is_active = TRUE',
      [bcNumber]
    );
    return users[0];
  },

  create: async (userData) => {
    const [result] = await pool.execute(
      `INSERT INTO users (username, password_hash, name, bc_number, department, role) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userData.username, userData.passwordHash, userData.name, userData.bcNumber, userData.department, userData.role || 'user']
    );
    return result.insertId;
  },

  update: async (id, userData) => {
    const fields = [];
    const params = [];

    if (userData.username !== undefined) {
      fields.push('username = ?');
      params.push(userData.username);
    }
    if (userData.passwordHash !== undefined) {
      fields.push('password_hash = ?');
      params.push(userData.passwordHash);
    }
    if (userData.name !== undefined) {
      fields.push('name = ?');
      params.push(userData.name);
    }
    if (userData.bcNumber !== undefined) {
      fields.push('bc_number = ?');
      params.push(userData.bcNumber);
    }
    if (userData.department !== undefined) {
      fields.push('department = ?');
      params.push(userData.department);
    }
    if (userData.role !== undefined) {
      fields.push('role = ?');
      params.push(userData.role);
    }
    if (userData.isActive !== undefined) {
      fields.push('is_active = ?');
      params.push(userData.isActive);
    }

    if (fields.length === 0) {
      return false;
    }

    params.push(id);

    const [result] = await pool.execute(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      params
    );
    return result.affectedRows > 0;
  },

  deactivate: async (id) => {
    const [result] = await pool.execute(
      'UPDATE users SET is_active = FALSE WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }
};

module.exports = User;