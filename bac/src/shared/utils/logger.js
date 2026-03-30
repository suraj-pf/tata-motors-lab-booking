/**
 * Structured Logger for Lab Booking System
 * Replaces console.log with structured JSON logging for production
 */

const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

const CURRENT_LOG_LEVEL = process.env.LOG_LEVEL || LOG_LEVELS.INFO;

/**
 * Create structured log entry
 * @param {string} level - Log level
 * @param {string} event - Event name/category
 * @param {Object} data - Additional data
 * @param {Error} error - Optional error object
 */
const createLogEntry = (level, event, data = {}, error = null) => {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    service: 'lab-booking-api',
    version: '1.1.0',
    ...data
  };

  if (error) {
    entry.error = {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      code: error.code
    };
  }

  return entry;
};

/**
 * Log booking operations
 * @param {string} action - Action type (created, cancelled, updated, conflict)
 * @param {Object} details - Booking details
 */
const logBooking = (action, details) => {
  const entry = createLogEntry(LOG_LEVELS.INFO, `booking_${action}`, {
    booking_id: details.booking_id,
    user_id: details.user_id,
    lab_id: details.lab_id,
    start_time: details.start_time,
    end_time: details.end_time,
    booking_date: details.booking_date,
    duration_hours: details.duration_hours,
    bc_number: details.bc_number,
    purpose: details.purpose,
    ip_address: details.ip_address,
    user_agent: details.user_agent
  });

  console.log(JSON.stringify(entry));
};

/**
 * Log booking conflict/rejection
 * @param {string} reason - Rejection reason
 * @param {Object} details - Attempt details
 */
const logBookingRejection = (reason, details) => {
  const entry = createLogEntry(LOG_LEVELS.WARN, 'booking_rejected', {
    reason,
    user_id: details.user_id,
    lab_id: details.lab_id,
    attempted_time: `${details.start_time}-${details.end_time}`,
    attempted_date: details.booking_date,
    existing_booking_id: details.existing_booking_id,
    ip_address: details.ip_address
  });

  console.log(JSON.stringify(entry));
};

/**
 * Log admin operations
 * @param {string} action - Admin action
 * @param {Object} details - Operation details
 */
const logAdmin = (action, details) => {
  const entry = createLogEntry(LOG_LEVELS.INFO, `admin_${action}`, {
    admin_id: details.admin_id,
    target_id: details.target_id,
    target_type: details.target_type,
    changes: details.changes,
    ip_address: details.ip_address
  });

  console.log(JSON.stringify(entry));
};

/**
 * Log authentication events
 * @param {string} action - Auth action (login, logout, refresh, failed)
 * @param {Object} details - Auth details
 */
const logAuth = (action, details) => {
  const level = action === 'failed' ? LOG_LEVELS.WARN : LOG_LEVELS.INFO;
  const entry = createLogEntry(level, `auth_${action}`, {
    user_id: details.user_id,
    username: details.username,
    role: details.role,
    ip_address: details.ip_address,
    user_agent: details.user_agent,
    failure_reason: details.failure_reason
  });

  console.log(JSON.stringify(entry));
};

/**
 * Log errors with full context
 * @param {string} component - Component name
 * @param {string} operation - Operation being performed
 * @param {Error} error - Error object
 * @param {Object} context - Additional context
 */
const logError = (component, operation, error, context = {}) => {
  const entry = createLogEntry(LOG_LEVELS.ERROR, `${component}_${operation}_error`, {
    component,
    operation,
    ...context
  }, error);

  console.error(JSON.stringify(entry));
};

/**
 * Log WebSocket events
 * @param {string} event - Event name
 * @param {Object} details - Event details
 */
const logWebSocket = (event, details) => {
  const entry = createLogEntry(LOG_LEVELS.DEBUG, `websocket_${event}`, {
    socket_id: details.socket_id,
    user_id: details.user_id,
    room: details.room,
    event_type: details.event_type,
    payload_size: details.payload_size
  });

  console.log(JSON.stringify(entry));
};

/**
 * Log performance metrics
 * @param {string} operation - Operation name
 * @param {number} durationMs - Duration in milliseconds
 * @param {Object} details - Additional details
 */
const logPerformance = (operation, durationMs, details = {}) => {
  const entry = createLogEntry(LOG_LEVELS.INFO, 'performance_metric', {
    operation,
    duration_ms: durationMs,
    threshold_ms: details.threshold || 1000,
    exceeded_threshold: durationMs > (details.threshold || 1000),
    ...details
  });

  console.log(JSON.stringify(entry));
};

/**
 * Log security events
 * @param {string} event - Security event type
 * @param {Object} details - Event details
 */
const logSecurity = (event, details) => {
  const entry = createLogEntry(LOG_LEVELS.WARN, `security_${event}`, {
    event_type: event,
    user_id: details.user_id,
    ip_address: details.ip_address,
    resource: details.resource,
    action: details.action,
    blocked: details.blocked,
    reason: details.reason
  });

  console.log(JSON.stringify(entry));
};

module.exports = {
  LOG_LEVELS,
  logBooking,
  logBookingRejection,
  logAdmin,
  logAuth,
  logError,
  logWebSocket,
  logPerformance,
  logSecurity,
  createLogEntry
};
