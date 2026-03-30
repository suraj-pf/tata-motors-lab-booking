// Date manipulation utilities for timeline feature
import { addDays } from 'date-fns';

export const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

// Convert 24-hour time to 12-hour format with AM/PM
export const formatTime12Hour = (timeStr) => {
  if (!timeStr) return '';
  const [hour, minute] = timeStr.split(':');
  const hourNum = parseInt(hour);
  const period = hourNum >= 12 ? 'PM' : 'AM';
  const displayHour = hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum;
  return `${displayHour}:${minute} ${period}`;
};

export const calculateDateRange = (view, currentDate, customRange) => {
  switch (view) {
    case 'day':
      return {
        start: formatDate(currentDate),
        end: formatDate(currentDate)
      };
    case 'custom':
      return customRange;
    default:
      return {
        start: formatDate(new Date()),
        end: formatDate(addDays(new Date(), 6))
      };
  }
};

export const generateTimeSlots = (dateRange, view) => {
  // Only day view supported - hourly slots
  const slots = [];
  for (let hour = 6; hour <= 17; hour++) {
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    const endTime = hour === 17 ? '18:00' : `${(hour + 1).toString().padStart(2, '0')}:00`;
    slots.push({
      start: timeStr,
      end: endTime,
      label: `${formatTime12Hour(timeStr)} - ${formatTime12Hour(endTime)}`
    });
  }
  return slots;
};

export const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [hour, minute] = timeStr.split(':').map(Number);
  return hour * 60 + minute;
};

export const addTime = (date, view) => {
  switch (view) {
    case 'day': return addDays(date, 1);
    default: return date;
  }
};

export const subtractTime = (date, view) => {
  switch (view) {
    case 'day': return addDays(date, -1);
    default: return date;
  }
};
