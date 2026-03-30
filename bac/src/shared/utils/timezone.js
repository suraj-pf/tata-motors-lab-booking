/**
 * Timezone Utility for Lab Booking System
 * 
 * CRITICAL: All times stored in UTC, converted to local time for display
 * All database storage uses UTC, frontend handles timezone conversion
 */

const TIMEZONE_CONFIG = {
  // System operates in IST (India Standard Time) for Tata Motors
  SYSTEM_TIMEZONE: 'Asia/Kolkata',
  UTC_OFFSET_HOURS: 5.5, // IST is UTC+5:30
};

/**
 * Convert local time string (HH:MM) to UTC time string
 * Used when storing booking times to database
 * @param {string} localTime - Local time in HH:MM format
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Object} - { utcTime: string, utcDate: string }
 */
const localToUTC = (localTime, date) => {
  if (!localTime || !date) return { utcTime: null, utcDate: null };
  
  const [hours, minutes] = localTime.split(':').map(Number);
  
  // Create date object in local timezone
  const localDateTime = new Date(`${date}T${localTime}:00`);
  
  // Convert to UTC
  const utcDateTime = new Date(localDateTime.getTime() - (TIMEZONE_CONFIG.UTC_OFFSET_HOURS * 60 * 60 * 1000));
  
  // Format UTC time
  const utcHours = utcDateTime.getUTCHours().toString().padStart(2, '0');
  const utcMinutes = utcDateTime.getUTCMinutes().toString().padStart(2, '0');
  const utcTime = `${utcHours}:${utcMinutes}`;
  
  // Format UTC date
  const utcYear = utcDateTime.getUTCFullYear();
  const utcMonth = (utcDateTime.getUTCMonth() + 1).toString().padStart(2, '0');
  const utcDay = utcDateTime.getUTCDate().toString().padStart(2, '0');
  const utcDateStr = `${utcYear}-${utcMonth}-${utcDay}`;
  
  return { utcTime, utcDate: utcDateStr };
};

/**
 * Convert UTC time string to local time string
 * Used when displaying times to users
 * @param {string} utcTime - UTC time in HH:MM format
 * @param {string} utcDate - UTC date in YYYY-MM-DD format
 * @returns {Object} - { localTime: string, localDate: string }
 */
const utcToLocal = (utcTime, utcDate) => {
  if (!utcTime || !utcDate) return { localTime: null, localDate: null };
  
  // Create UTC date object
  const utcDateTime = new Date(`${utcDate}T${utcTime}:00Z`);
  
  // Convert to local (IST)
  const localDateTime = new Date(utcDateTime.getTime() + (TIMEZONE_CONFIG.UTC_OFFSET_HOURS * 60 * 60 * 1000));
  
  // Format local time
  const localHours = localDateTime.getHours().toString().padStart(2, '0');
  const localMinutes = localDateTime.getMinutes().toString().padStart(2, '0');
  const localTime = `${localHours}:${localMinutes}`;
  
  // Format local date
  const localYear = localDateTime.getFullYear();
  const localMonth = (localDateTime.getMonth() + 1).toString().padStart(2, '0');
  const localDay = localDateTime.getDate().toString().padStart(2, '0');
  const localDateStr = `${localYear}-${localMonth}-${localDay}`;
  
  return { localTime, localDate: localDateStr };
};

/**
 * Get current UTC timestamp
 * @returns {Date} - Current UTC time
 */
const getCurrentUTC = () => {
  return new Date();
};

/**
 * Get current date in UTC (YYYY-MM-DD)
 * @returns {string} - Current UTC date
 */
const getCurrentUTCDate = () => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

/**
 * Get current time in UTC (HH:MM)
 * @returns {string} - Current UTC time
 */
const getCurrentUTCTime = () => {
  const now = new Date();
  return now.toISOString().split('T')[1].slice(0, 5);
};

/**
 * Validate if a booking time is in the future (UTC comparison)
 * @param {string} utcDate - UTC date (YYYY-MM-DD)
 * @param {string} utcTime - UTC time (HH:MM)
 * @returns {boolean} - True if future, false if past
 */
const isFutureBookingUTC = (utcDate, utcTime) => {
  const bookingUTC = new Date(`${utcDate}T${utcTime}:00Z`);
  const nowUTC = new Date();
  return bookingUTC.getTime() > nowUTC.getTime();
};

/**
 * Validate operating hours in UTC
 * @param {string} utcTime - UTC time (HH:MM)
 * @returns {boolean} - True if within operating hours
 */
const isWithinOperatingHoursUTC = (utcTime) => {
  // Convert UTC time to local time for validation
  const { localTime } = utcToLocal(utcTime, getCurrentUTCDate());
  
  const [hours, minutes] = localTime.split(':').map(Number);
  const timeInMinutes = hours * 60 + minutes;
  
  const START_MINUTES = 6 * 60 + 30; // 06:30 AM
  const END_MINUTES = 17 * 60 + 30;  // 05:30 PM
  
  return timeInMinutes >= START_MINUTES && timeInMinutes <= END_MINUTES;
};

/**
 * Format datetime for API responses (always in local time)
 * @param {Date} date - JavaScript Date object
 * @returns {Object} - Formatted datetime components
 */
const formatDateTimeResponse = (date) => {
  const d = new Date(date);
  
  return {
    utc: d.toISOString(),
    local: {
      date: d.toLocaleDateString('en-IN', { timeZone: TIMEZONE_CONFIG.SYSTEM_TIMEZONE }),
      time: d.toLocaleTimeString('en-IN', { 
        timeZone: TIMEZONE_CONFIG.SYSTEM_TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }),
      full: d.toLocaleString('en-IN', { timeZone: TIMEZONE_CONFIG.SYSTEM_TIMEZONE })
    },
    timestamp: d.getTime()
  };
};

module.exports = {
  TIMEZONE_CONFIG,
  localToUTC,
  utcToLocal,
  getCurrentUTC,
  getCurrentUTCDate,
  getCurrentUTCTime,
  isFutureBookingUTC,
  isWithinOperatingHoursUTC,
  formatDateTimeResponse
};
