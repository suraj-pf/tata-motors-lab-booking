module.exports = {
  TIME_SLOTS: [
    '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00',
    '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00',
    '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
  ],
  ROLES: ['user', 'admin'],
  BUILDINGS: ['HR Building', 'SDC Workshop'],
  BOOKING_STATUS: ['confirmed', 'cancelled', 'completed', 'pending'],
  MAX_BOOKING_DURATION: 10.5,
  MIN_BOOKING_DURATION: 0.5,
  OPERATING_HOURS: {
    start: '06:30',
    end: '17:00'
  }
};