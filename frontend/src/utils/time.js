/**
 * Time Utilities - IST (Indian Standard Time) & UTC Standardization
 * All frontend time handling consolidated here
 * 
 * IST is UTC+5:30
 * Key principle: Store dates in UTC, display in IST
 */

const IST_OFFSET_MS = 330 * 60 * 1000; // 5 hours 30 minutes in milliseconds

/**
 * Get current time adjusted to IST
 * @returns {Date} Current time in IST
 */
export const getNowIST = () => {
  const now = new Date();
  // Create IST time by adding offset to UTC
  return new Date(now.getTime() + IST_OFFSET_MS);
};

/**
 * Get today's date string in IST (YYYY-MM-DD)
 * @returns {string} Today's date in IST
 */
export const getTodayIST = () => {
  const ist = getNowIST();
  return ist.toISOString().split('T')[0];
};

/**
 * Parse date and time to create an IST Date object
 * @param {string} dateStr - Date (YYYY-MM-DD)
 * @param {string} timeStr - Time (HH:MM)
 * @returns {Date} IST Date object
 */
export const parseISTDateTime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null;
  const [hours, minutes] = timeStr.split(':').map(Number);
  // Parse as UTC first, then adjust
  const utcDate = new Date(dateStr + 'T00:00:00Z');
  utcDate.setUTCHours(hours, minutes, 0, 0);
  // Return as IST (add offset)
  return new Date(utcDate.getTime() + IST_OFFSET_MS);
};

/**
 * Check if booking end time is in the past (IST)
 * @param {string} dateStr - Date (YYYY-MM-DD)
 * @param {string} endTimeStr - End time (HH:MM)
 * @returns {boolean}
 */
export const isPast = (dateStr, endTimeStr) => {
  const now = getNowIST();
  const endTime = parseISTDateTime(dateStr, endTimeStr);
  if (!endTime) return false;
  return now > endTime;
};

/**
 * Check if booking is upcoming (end time is in future)
 * @param {string} dateStr - Date (YYYY-MM-DD)
 * @param {string} endTimeStr - End time (HH:MM)
 * @returns {boolean}
 */
export const isUpcoming = (dateStr, endTimeStr) => {
  return !isPast(dateStr, endTimeStr);
};

/**
 * Check if booking is currently ongoing
 * @param {string} dateStr - Date (YYYY-MM-DD)
 * @param {string} startTimeStr - Start time (HH:MM)
 * @param {string} endTimeStr - End time (HH:MM)
 * @returns {boolean}
 */
export const isOngoing = (dateStr, startTimeStr, endTimeStr) => {
  const now = getNowIST();
  const start = parseISTDateTime(dateStr, startTimeStr);
  const end = parseISTDateTime(dateStr, endTimeStr);
  if (!start || !end) return false;
  return now >= start && now <= end;
};

/**
 * Get booking status classification
 * @param {Object} booking - { booking_date, start_time, end_time, status }
 * @returns {string} 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
 */
export const getBookingStatus = (booking) => {
  if (booking.status === 'cancelled') return 'cancelled';
  
  const now = getNowIST();
  const start = parseISTDateTime(booking.booking_date, booking.start_time);
  const end = parseISTDateTime(booking.booking_date, booking.end_time);
  
  if (!start || !end) return 'unknown';

  if (now > end) return 'completed';
  if (now >= start && now <= end) return 'ongoing';
  return 'upcoming';
};

/**
 * Format date for display (IST)
 * @param {string} dateStr - Date (YYYY-MM-DD)
 * @returns {string} Formatted date
 */
export const formatDateIST = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Format time for display (IST)
 * @param {string} timeStr - Time (HH:MM)
 * @returns {string} Formatted time (e.g., "02:30 PM")
 */
export const formatTimeIST = (timeStr) => {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Get current time position for timeline (minutes from midnight IST)
 * @returns {number} Minutes from midnight
 */
export const getCurrentTimeMinutes = () => {
  const now = getNowIST();
  return now.getHours() * 60 + now.getMinutes();
};

/**
 * Compare two dates (IST)
 * @param {string} dateA - Date 1 (YYYY-MM-DD)
 * @param {string} dateB - Date 2 (YYYY-MM-DD)
 * @returns {number} -1, 0, 1
 */
export const compareDates = (dateA, dateB) => {
  const d1 = new Date(dateA + 'T00:00:00');
  const d2 = new Date(dateB + 'T00:00:00');
  if (d1 < d2) return -1;
  if (d1 > d2) return 1;
  return 0;
};

/**
 * Check if date is today (IST)
 * @param {string} dateStr - Date (YYYY-MM-DD)
 * @returns {boolean}
 */
export const isToday = (dateStr) => {
  return dateStr === getTodayIST();
};

/**
 * Convert IST Date to UTC ISO string for API calls
 * @param {Date} istDate - Date in IST
 * @returns {string} UTC ISO string
 */
export const toUTCISOString = (istDate) => {
  const utcTime = new Date(istDate.getTime() - IST_OFFSET_MS);
  return utcTime.toISOString();
};

export default {
  getNowIST,
  getTodayIST,
  parseISTDateTime,
  isPast,
  isUpcoming,
  isOngoing,
  getBookingStatus,
  formatDateIST,
  formatTimeIST,
  getCurrentTimeMinutes,
  compareDates,
  isToday,
  toUTCISOString
};
  return utcTime.toISOString();
};

export default {
  getNowIST,
  getTodayIST,
  parseISTDateTime,
  isPast,
  isUpcoming,
  isOngoing,
  getBookingStatus,
  formatDateIST,
  formatTimeIST,
  getCurrentTimeMinutes,
  compareDates,
  isToday,
  toUTCISOString
};
