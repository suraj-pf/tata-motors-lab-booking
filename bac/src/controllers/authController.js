const { pool } = require('../shared/config/database');
const { hashPassword, comparePassword, generateTokens, verifyRefreshToken } = require('../shared/utils/auth');

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

    // Check if user already exists (only check username, BC numbers can duplicate)
    const [existingUser] = await pool.execute(
      'SELECT id, username FROM users WHERE username = ?',
      [username]
    );
    
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
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
    res.status(500).json({ 
      success: false, 
      message: 'Registration failed', 
      error: error.message 
    });
  }
};

const login = async (req, res) => {
  try {
    console.log('🔍 Login attempt:', req.body);
    const { username, password } = req.body;

    if (!username || !password) {
      console.log('❌ Missing credentials');
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password required' 
      });
    }

    console.log('🔍 Querying user:', username);
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE username = ? AND is_active = TRUE',
      [username]
    );

    console.log('🔍 Found users:', users.length, users[0]?.username, 'Active:', users[0]?.is_active);

    if (users.length === 0) {
      console.log('❌ No user found or inactive');
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    const user = users[0];
    console.log('🔍 Comparing password for user:', user.username);
    console.log('🔍 Received password:', password);
    console.log('🔍 Stored hash:', user.password_hash);
    const isValid = await comparePassword(password, user.password_hash);
    console.log('🔍 Password valid:', isValid);
    
    if (!isValid) {
      console.log('❌ Password comparison failed');
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
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
    res.status(500).json({ 
      success: false, 
      message: 'Login failed', 
      error: error.message 
    });
  }
};

const refreshToken = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ 
        success: false, 
        message: 'Refresh token required' 
      });
    }

    const decoded = verifyRefreshToken(refresh_token);
    
    const [users] = await pool.execute(
      'SELECT id, username, name, bc_number, department, role FROM users WHERE id = ? AND is_active = TRUE',
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const tokens = generateTokens(users[0]);

    res.json({
      success: true,
      ...tokens
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Invalid refresh token', 
      error: error.message 
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, username, name, bc_number, department, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      user: users[0]
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch profile', 
      error: error.message 
    });
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
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
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
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update profile', 
      error: error.message 
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const userId = req.user.id;

    if (!current_password || !new_password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Current password and new password are required' 
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'New password must be at least 6 characters' 
      });
    }

    // Get current password hash
    const [users] = await pool.execute(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Verify current password
    const isValid = await comparePassword(current_password, users[0].password_hash);
    if (!isValid) {
      return res.status(400).json({ 
        success: false, 
        message: 'Current password is incorrect' 
      });
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
    res.status(500).json({ 
      success: false, 
      message: 'Failed to change password', 
      error: error.message 
    });
  }
};

module.exports = { register, login, refreshToken, getProfile, updateProfile, changePassword };