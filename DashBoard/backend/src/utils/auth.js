const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

const generateTokens = (user) => {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_ACCESS_EXPIRY 
  });
  
  const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { 
    expiresIn: JWT_REFRESH_EXPIRY 
  });

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: JWT_ACCESS_EXPIRY
  };
};

const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, JWT_REFRESH_SECRET);
};

module.exports = {
  hashPassword,
  comparePassword,
  generateTokens,
  verifyToken,
  verifyRefreshToken
};