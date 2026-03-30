/**
 * Time Utilities - UTC Internal / IST Display
 * 
 * Rules:
 * - ALL calculations → UTC minutes from midnight
 * - ALL display → IST 12-hour format
 * - IST is UTC+5:30
 */

const IST_OFFSET_MINUTES = 330; // 5 hours 30 minutes

// Timeline constants - 6:30 AM to 5:00 PM
export const START_TIME_MINUTES = 390; // 6:30 AM = 6*60 + 30
export const END_TIME_MINUTES = 1020; // 5:00 PM = 17*60
export const TIMELINE_DURATION = END_TIME_MINUTES - START_TIME_MINUTES; // 630 minutes

/**
 * Get current UTC time in minutes from midnight
 */
export const getNowUTCMinutes = () => {
  const now = new Date();
  return now.getUTCHours() * 60 + now.getUTCMinutes();
};

/**
 * Get current IST time in minutes from midnight
 */
export const getNowISTMinutes = () => {
  const utcMinutes = getNowUTCMinutes();
  let istMinutes = utcMinutes + IST_OFFSET_MINUTES;
  if (istMinutes >= 1440) istMinutes -= 1440; // Handle day wrap
  return istMinutes;
};

/**
 * Convert datetime to UTC minutes from midnight
 * @param {string|Date} datetime - ISO datetime string or Date object
 */
export const toUTCMinutes = (datetime) => {
  if (!datetime) return null;
  const date = new Date(datetime);
  if (isNaN(date.getTime())) return null;
  return date.getUTCHours() * 60 + date.getUTCMinutes();
};

/**
 * Convert datetime to IST minutes from midnight
 * @param {string|Date} datetime - ISO datetime string or Date object
 */
export const toISTMinutes = (datetime) => {
  const utcMinutes = toUTCMinutes(datetime);
  if (utcMinutes === null) return null;
  let istMinutes = utcMinutes + IST_OFFSET_MINUTES;
  if (istMinutes >= 1440) istMinutes -= 1440;
  return istMinutes;
};

/**
 * Format datetime to IST 12-hour display string
 * @param {string|Date} datetime - ISO datetime string or Date object
 */
export const formatIST = (datetime) => {
  if (!datetime) return '';
  const date = new Date(datetime);
  if (isNaN(date.getTime())) return '';
  
  return date.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Format time (HH:MM) to IST 12-hour display
 * @param {string} timeStr - Time in HH:MM format
 */
export const formatTimeIST = (timeStr) => {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return '';
  
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
 * Format date for display (IST)
 * @param {string} dateStr - Date (YYYY-MM-DD)
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
 * Get today's date string in IST (YYYY-MM-DD)
 */
export const getTodayIST = () => {
  const now = new Date();
  const istDate = new Date(now.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
  return istDate.toISOString().split('T')[0];
};

/**
 * Parse date and time to create UTC minutes
 * @param {string} dateStr - Date (YYYY-MM-DD)
 * @param {string} timeStr - Time (HH:MM)
 */
export const parseToUTCMinutes = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null;
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

/**
 * Check if current time is within timeline bounds
 */
export const isCurrentTimeInTimeline = () => {
  const istMinutes = getNowISTMinutes();
  return istMinutes >= START_TIME_MINUTES && istMinutes <= END_TIME_MINUTES;
};

/**
 * Get current time position percentage within timeline (0-100)
 * Returns -1 if outside bounds
 */
export const getCurrentTimePosition = () => {
  if (!isCurrentTimeInTimeline()) return -1;
  const istMinutes = getNowISTMinutes();
  return ((istMinutes - START_TIME_MINUTES) / TIMELINE_DURATION) * 100;
};

/**
 * Generate timeline slots for display (hourly from 6:30 AM to 5:00 PM)
 * @returns {Array} Array of {time, minutes, label} objects
 */
export const generateTimelineSlots = () => {
  const slots = [];
  // Start at 6:30, then hourly until 17:00
  slots.push({ time: '06:30', minutes: 390, label: formatTimeIST('06:30') });
  
  for (let hour = 7; hour <= 17; hour++) {
    const timeStr = `${String(hour).padStart(2, '0')}:00`;
    slots.push({
      time: timeStr,
      minutes: hour * 60,
      label: formatTimeIST(timeStr)
    });
  }
  return slots;
};

/**
 * Check if booking is currently ongoing (not cancelled, time overlaps now)
 * @param {Object} booking - { booking_date, start_time, end_time, status }
 */
export const isBookingOngoing = (booking) => {
  if (booking.status === 'cancelled') return false;
  
  const today = getTodayIST();
  if (booking.booking_date !== today) return false;
  
  const nowIST = getNowISTMinutes();
  const startIST = toISTMinutes(new Date(`${booking.booking_date}T${booking.start_time}`));
  const endIST = toISTMinutes(new Date(`${booking.booking_date}T${booking.end_time}`));
  
  if (startIST === null || endIST === null) return false;
  return nowIST >= startIST && nowIST <= endIST;
};

/**
 * Get booking status classification
 * @param {Object} booking - { booking_date, start_time, end_time, status }
 */
export const getBookingStatus = (booking) => {
  if (booking.status === 'cancelled') return 'cancelled';
  
  const today = getTodayIST();
  const nowIST = getNowISTMinutes();
  const endIST = toISTMinutes(new Date(`${booking.booking_date}T${booking.end_time}`));
  const startIST = toISTMinutes(new Date(`${booking.booking_date}T${booking.start_time}`));
  
  if (endIST === null || startIST === null) return 'unknown';
  
  if (booking.booking_date < today || (booking.booking_date === today && nowIST > endIST)) {
    return 'completed';
  }
  if (booking.booking_date === today && nowIST >= startIST && nowIST <= endIST) {
    return 'ongoing';
  }
  return 'upcoming';
};

/**
 * Compare two dates
 * @param {string} dateA - Date 1 (YYYY-MM-DD)
 * @param {string} dateB - Date 2 (YYYY-MM-DD)
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
 */
export const isToday = (dateStr) => {
  return dateStr === getTodayIST();
};

export default {
  getNowUTCMinutes,
  getNowISTMinutes,
  toUTCMinutes,
  toISTMinutes,
  formatIST,
  formatTimeIST,
  formatDateIST,
  getTodayIST,
  parseToUTCMinutes,
  isCurrentTimeInTimeline,
  getCurrentTimePosition,
  generateTimelineSlots,
  isBookingOngoing,
  getBookingStatus,
  compareDates,
  isToday,
  START_TIME_MINUTES,
  END_TIME_MINUTES,
  TIMELINE_DURATION
};
