const { pool } = require('../config/database');
const { hashPassword, comparePassword, generateTokens, verifyRefreshToken } = require('../utils/auth');

const register = async (req, res) => {
  try {
    const { username, password, name, bc_number, department, role = 'user' } = req.body;

    if (!username || !password || !name || !bc_number) {
      return res.status(400).json({ 
        error: 'Missing required fields' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters' 
      });
    }

    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE username = ? OR bc_number = ?',
      [username, bc_number]
    );

    if (existing.length > 0) {
      return res.status(400).json({ 
        error: 'Username or BC number already exists' 
      });
    }

    const passwordHash = await hashPassword(password);

    const [result] = await pool.execute(
      `INSERT INTO users (username, password_hash, name, bc_number, department, role) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [username, passwordHash, name, bc_number, department || null, role]
    );

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      userId: result.insertId
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const [users] = await pool.execute(
      'SELECT * FROM users WHERE username = ? AND is_active = TRUE',
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    const isValid = await comparePassword(password, user.password_hash);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const tokens = generateTokens(user);

    const userResponse = {
      id: user.id,
      username: user.username,
      name: user.name,
      bc_number: user.bc_number,
      department: user.department,
      role: user.role
    };

    res.json({
      success: true,
      ...tokens,
      user: userResponse
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

const refreshToken = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const decoded = verifyRefreshToken(refresh_token);
    
    const [users] = await pool.execute(
      'SELECT id, username, name, bc_number, department, role FROM users WHERE id = ? AND is_active = TRUE',
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const tokens = generateTokens(users[0]);

    res.json({
      success: true,
      ...tokens
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

const getProfile = async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, username, name, bc_number, department, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: users[0]
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, department } = req.body;
    const userId = req.user.id;

    const [result] = await pool.execute(
      'UPDATE users SET name = ?, department = ? WHERE id = ?',
      [name, department, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [updatedUser] = await pool.execute(
      'SELECT id, username, name, bc_number, department, role, created_at FROM users WHERE id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser[0]
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const userId = req.user.id;

    if (!current_password || !new_password) {
      return res.status(400).json({ 
        error: 'Current password and new password are required' 
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ 
        error: 'New password must be at least 6 characters' 
      });
    }

    // Get current password hash
    const [users] = await pool.execute(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValid = await comparePassword(current_password, users[0].password_hash);
    if (!isValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(new_password);

    // Update password
    await pool.execute(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [newPasswordHash, userId]
    );

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

module.exports = { register, login, refreshToken, getProfile, updateProfile, changePassword };