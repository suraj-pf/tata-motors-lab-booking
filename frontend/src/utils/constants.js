// Time configuration
export const TIME_CONFIG = {
  START_HOUR: 6,
  START_MINUTE: 30,
  END_HOUR: 17,
  END_MINUTE: 0,
  SLOT_INTERVAL: 30,
  MAX_DURATION_MINUTES: 630, // 10.5 hours
}

// Booking rules
export const BOOKING_RULES = {
  MIN_DURATION: 30, // 30 minutes
  MAX_DURATION: 630, // 10.5 hours
  NO_SAME_DAY_CANCEL: true,
  RETENTION_YEARS: 3,
}

// Lab buildings
export const BUILDINGS = {
  HR_BUILDING: 'HR Building',
  SDC_WORKSHOP: 'SDC Workshop',
}

// User roles
export const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
}

// Status constants
export const STATUSES = {
  CONFIRMED: 'confirmed',
  PENDING: 'pending',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
}

// API endpoints
export const API_ENDPOINTS = {
  AUTH_LOGIN: '/auth/login',
  LABS: '/labs',
  BOOKINGS: '/bookings',
  ADMIN_USERS: '/admin/users',
  ADMIN_BOOKINGS: '/admin/bookings',
}

// Demo credentials
export const DEMO_CREDENTIALS = {
  USER: { username: 'staff1', password: 'user123' },
  ADMIN: { username: 'admin', password: 'admin123' },
}