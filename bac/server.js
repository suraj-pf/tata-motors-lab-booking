require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const helmet = require('helmet');
const mysql = require('mysql2/promise');
const { initSocket } = require('./src/shared/config/socket');
const { corsMiddleware } = require('./src/shared/middleware/cors');

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

// Apply CORS middleware
app.use(corsMiddleware);

// Security middleware
app.use(helmet());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Ensure database exists
async function ensureDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  });
  
  const dbName = process.env.DB_NAME || 'lab_booking_system';
  await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  console.log(`Database '${dbName}' ensured`);
  await connection.end();
}

// Start server
async function startServer() {
  try {
    await ensureDatabase();
    
    // Initialize database tables
    const { initDB } = require('./createTables');
    await initDB();
    
    // Import routes
    const authRoutes = require('./src/routes/auth');
    const labRoutes = require('./src/routes/labs');
    const bookingRoutes = require('./src/routes/bookings');
    const adminRoutes = require('./src/admin/routes/admin');
    const analyticsRoutes = require('./src/routes/analytics');
    const timelineRoutes = require('./src/routes/timeline');
    
    // Use routes
    app.use('/api/auth', authRoutes);
    app.use('/api/labs', labRoutes);
    app.use('/api/bookings', bookingRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/analytics', analyticsRoutes);
    app.use('/api/timeline', timelineRoutes);
    
    // 404 handler
    app.use('*', (req, res) => {
      res.status(404).json({ error: 'Route not found' });
    });
    
    // Error handler
    app.use((err, req, res, next) => {
      console.error('Server error:', err);
      
      // Handle CORS errors
      if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({ error: 'CORS not allowed' });
      }
      
      res.status(err.status || 500).json({ 
        error: err.message || 'Internal server error' 
      });
    });
    
    // Initialize Socket.IO with all handlers
    initSocket(httpServer);
    
    // Start server
    httpServer.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(`CORS enabled for: ${process.env.NODE_ENV === 'production' ? 'production origins' : 'localhost'}`);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', () => shutdown());
    process.on('SIGINT', () => shutdown());
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

async function shutdown() {
  console.log('Shutting down gracefully...');
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
}

startServer();