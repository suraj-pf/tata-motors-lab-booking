const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

/**
 * Authentication Middleware
 * Validates JWT access_token from Authorization: Bearer header
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        message: 'No token provided',
        code: 'AUTH_NO_TOKEN'
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token format',
        code: 'AUTH_INVALID_FORMAT'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify user still exists and is active
    const [users] = await pool.execute(
      'SELECT id, username, name, bc_number, role FROM users WHERE id = ? AND is_active = 1',
      [decoded.id]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ 
        success: false,
        message: 'User not found or inactive',
        code: 'AUTH_USER_INVALID'
      });
    }

    // Attach user to request
    req.user = users[0];
    next();
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token expired',
        code: 'AUTH_TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token',
        code: 'AUTH_TOKEN_INVALID'
      });
    }
    
    console.error('[Auth Middleware Error]:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Admin Role Middleware
 * Must be used after authMiddleware
 */
const adminMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      message: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false,
      message: 'Admin access required',
      code: 'AUTH_ADMIN_REQUIRED'
    });
  }
  
  next();
};

/**
 * Optional Auth Middleware
 * Attaches user if token valid, but doesn't require it
 */
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without user
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const [users] = await pool.execute(
      'SELECT id, username, name, bc_number, role FROM users WHERE id = ? AND is_active = 1',
      [decoded.id]
    );
    
    if (users.length > 0) {
      req.user = users[0];
    }
    
    next();
  } catch (error) {
    // Silent fail - continue without user
    next();
  }
};

module.exports = { 
  authMiddleware, 
  adminMiddleware, 
  optionalAuthMiddleware,
  authenticateToken: authMiddleware 
};