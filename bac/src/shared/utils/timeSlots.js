// Parse time string to minutes since midnight
const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [hour, minute] = timeStr.split(':').map(Number);
  return hour * 60 + minute;
};

// Generate time slots (6:30 AM - 5:00 PM, 30min intervals)
const generateTimeSlots = () => {
  const slots = [];
  let hour = 6;
  let minute = 30;

  while (hour < 17 || (hour === 17 && minute === 0)) {
    const startStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    
    // Calculate end time (add 30 minutes)
    let endHour = hour;
    let endMinute = minute + 30;
    if (endMinute >= 60) {
      endHour += 1;
      endMinute = 0;
    }
    const endStr = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;

    slots.push({
      start: startStr,
      end: endStr,
      label: `${startStr} - ${endStr}`
    });

    minute += 30;
    if (minute >= 60) {
      minute = 0;
      hour++;
    }
  }
  
  return slots;
};

// Calculate duration in hours
const calculateDuration = (start, end) => {
  const startMinutes = parseTimeToMinutes(start);
  const endMinutes = parseTimeToMinutes(end);
  return (endMinutes - startMinutes) / 60;
};

// Check if a time slot is available
const isTimeSlotAvailable = (bookedSlots, start, end) => {
  const startMinutes = parseTimeToMinutes(start);
  const endMinutes = parseTimeToMinutes(end);
  
  for (const slot of bookedSlots) {
    const slotStart = parseTimeToMinutes(slot.start_time);
    const slotEnd = parseTimeToMinutes(slot.end_time);
    
    // Check for overlap
    if (startMinutes < slotEnd && endMinutes > slotStart) {
      return false; // Conflict found
    }
  }
  
  return true;
};

module.exports = { 
  generateTimeSlots, 
  calculateDuration,
  isTimeSlotAvailable,
  parseTimeToMinutes
};