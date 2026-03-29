const validateUser = (userData) => {
  const errors = [];
  
  if (!userData.username || userData.username.length < 3) {
    errors.push('Username must be at least 3 characters');
  }
  
  if (!userData.password || userData.password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }
  
  if (!userData.name || userData.name.trim().length === 0) {
    errors.push('Name is required');
  }
  
  if (!userData.bc_number || userData.bc_number.trim().length === 0) {
    errors.push('BC Number is required');
  }
  
  return errors;
};

const validateBookingTime = (startTime, endTime) => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  
  if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
    return {
      isValid: false,
      error: 'Invalid time format'
    };
  }
  
  const start = startTime.split(':').map(Number);
  const end = endTime.split(':').map(Number);
  const startMin = start[0] * 60 + start[1];
  const endMin = end[0] * 60 + end[1];
  
  const operatingStart = 6 * 60 + 30;
  const operatingEnd = 17 * 60;
  
  if (startMin < operatingStart || endMin > operatingEnd) {
    return {
      isValid: false,
      error: 'Time must be between 6:30 AM and 5:00 PM'
    };
  }
  
  if (endMin <= startMin) {
    return {
      isValid: false,
      error: 'End time must be after start time'
    };
  }
  
  const duration = (endMin - startMin) / 60;
  
  return {
    isValid: true,
    duration
  };
};

const validateDate = (date) => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return {
      isValid: false,
      error: 'Invalid date format'
    };
  }
  
  const today = new Date().toISOString().split('T')[0];
  if (date < today) {
    return {
      isValid: false,
      error: 'Cannot book past dates'
    };
  }
  
  return { isValid: true };
};

module.exports = { 
  validateUser, 
  validateBookingTime,
  validateDate 
};