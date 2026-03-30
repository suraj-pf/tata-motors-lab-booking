/**
 * Global Booking Rules Engine
 * Centralized validation logic for all booking operations
 */

export const bookingRules = {
  /**
   * Validate booking time constraints (06:30 AM - 05:30 PM)
   * @param {string} startTime - Start time (HH:MM)
   * @param {string} endTime - End time (HH:MM)
   * @returns {Object} Validation result
   */
  validateTimeConstraints: (startTime, endTime) => {
    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)
    
    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin
    
    // Convert constraints to minutes: 06:30 AM = 390, 05:30 PM = 1050
    const MIN_START_TIME = 6 * 60 + 30 // 06:30 AM = 390 minutes
    const MAX_END_TIME = 17 * 60 + 30 // 05:30 PM = 1050 minutes
    
    const isValidStart = startMinutes >= MIN_START_TIME
    const isValidEnd = endMinutes <= MAX_END_TIME
    const isValid = isValidStart && isValidEnd
    
    return {
      isValid,
      error: isValid ? null : (
        !isValidStart 
          ? 'Booking cannot start before 06:30 AM.'
          : 'Booking cannot end after 05:30 PM.'
      ),
      startMinutes,
      endMinutes,
      MIN_START_TIME,
      MAX_END_TIME
    }
  },

  /**
   * Validate current time constraints for booking
   * @param {string} bookingDate - Booking date (YYYY-MM-DD)
   * @param {string} startTime - Start time (HH:MM)
   * @param {Date} currentTime - Current system time
   * @returns {Object} Validation result
   */
  validateCurrentTimeConstraints: (bookingDate, startTime, currentTime = new Date()) => {
    const now = new Date(currentTime)
    const bookingDateObj = new Date(bookingDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    bookingDateObj.setHours(0, 0, 0, 0)
    
    // If booking is for a future date, no current time constraints
    if (bookingDateObj > today) {
      return { isValid: true, error: null }
    }
    
    // If booking is for today, check current time constraints
    if (bookingDateObj.getTime() === today.getTime()) {
      const [startHour, startMin] = startTime.split(':').map(Number)
      const bookingStartMinutes = startHour * 60 + startMin
      const currentMinutes = now.getHours() * 60 + now.getMinutes()
      
      // Get current hour slot for flexible booking
      const currentSlot = bookingRules.getCurrentHourSlot(now)
      const currentSlotMinutes = currentSlot.hour * 60
      
      // Allow booking if:
      // 1. Start time is in the current hour and within first 30 minutes
      // 2. Start time is in a future hour
      const isValidCurrentTime = 
        (bookingStartMinutes >= currentSlotMinutes && bookingStartMinutes < currentSlotMinutes + 30) ||
        (bookingStartMinutes > currentMinutes)
      
      return {
        isValid: isValidCurrentTime,
        error: isValidCurrentTime ? null : (
          bookingStartMinutes < currentMinutes
            ? 'Cannot book past time slots.'
            : 'Current hour booking must be within first 30 minutes.'
        ),
        currentMinutes,
        bookingStartMinutes,
        currentSlotMinutes
      }
    }
    
    // Past date booking is not allowed
    return {
      isValid: false,
      error: 'Cannot book for past dates.'
    }
  },

  /**
   * Get current hour booking slot (rounds down to nearest hour)
   * @param {Date} currentTime - Current system time
   * @returns {Object} Current hour slot info
   */
  getCurrentHourSlot: (currentTime = new Date()) => {
    const now = new Date(currentTime)
    const currentHour = now.getHours()
    const currentMin = now.getMinutes()
    
    // Round down to nearest hour
    const slotHour = currentHour
    const slotTime = `${slotHour.toString().padStart(2, '0')}:00`
    const slotMinutes = slotHour * 60
    
    return {
      slotHour,
      slotTime,
      slotMinutes,
      currentMinutes: currentHour * 60 + currentMin,
      canBookCurrentHour: currentMin < 30 // Allow if within first 30 minutes of hour
    }
  },

  /**
   * Validate if a booking time is in the future or current hour
   * @param {string} bookingDate - Date string (YYYY-MM-DD)
   * @param {string} startTime - Time string (HH:MM)
   * @param {Date} currentTime - Current system time (optional, defaults to now)
   * @returns {Object} Validation result
   */
  isFutureBooking: (bookingDate, startTime, currentTime = new Date()) => {
    const bookingDateTime = new Date(`${bookingDate}T${startTime}`)
    const now = new Date(currentTime)
    const today = now.toISOString().split('T')[0]
    
    // If booking is for today, check current hour logic
    if (bookingDate === today) {
      const currentSlot = bookingRules.getCurrentHourSlot(currentTime)
      const [startHour] = startTime.split(':').map(Number)
      const startMinutes = startHour * 60
      
      // Allow booking if it's the current hour or future
      const isValid = startMinutes >= currentSlot.slotMinutes
      
      return {
        isValid,
        error: isValid ? null : 'Booking must be for current hour or future time.',
        bookingDateTime,
        currentTime: now,
        currentSlot
      }
    }
    
    // For future dates, standard future check
    const isFuture = bookingDateTime >= now
    
    return {
      isValid: isFuture,
      error: isFuture ? null : 'Booking must be scheduled for current or future time only.',
      bookingDateTime,
      currentTime: now
    }
  },

  /**
   * Validate time range
   * @param {string} startTime - Start time (HH:MM)
   * @param {string} endTime - End time (HH:MM)
   * @returns {Object} Validation result
   */
  validateTimeRange: (startTime, endTime) => {
    if (!startTime || !endTime) {
      return {
        isValid: false,
        error: 'Both start and end times are required.'
      }
    }

    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)
    
    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin
    
    const isValid = endMinutes > startMinutes
    const duration = endMinutes - startMinutes
    
    return {
      isValid,
      error: isValid ? null : 'End time must be after start time.',
      duration,
      durationHours: duration / 60
    }
  },

  /**
   * Validate booking duration
   * @param {number} durationMinutes - Duration in minutes
   * @param {number} minMinutes - Minimum allowed minutes (default: 30)
   * @param {number} maxMinutes - Maximum allowed minutes (default: 630 for 10.5 hours)
   * @returns {Object} Validation result
   */
  validateDuration: (durationMinutes, minMinutes = 30, maxMinutes = 630) => {
    const isValid = durationMinutes >= minMinutes && durationMinutes <= maxMinutes
    
    return {
      isValid,
      error: isValid ? null : 
        durationMinutes < minMinutes 
          ? 'Minimum booking duration is 30 minutes.'
          : 'Maximum booking duration is 10.5 hours.'
    }
  },

  /**
   * Check if date is today
   * @param {string} bookingDate - Date string (YYYY-MM-DD)
   * @returns {boolean}
   */
  isToday: (bookingDate) => {
    const today = new Date().toISOString().split('T')[0]
    return bookingDate === today
  },

  /**
   * Get available time slots for a given date (06:30 AM - 05:30 PM)
   * @param {string} bookingDate - Date string (YYYY-MM-DD)
   * @param {Date} currentTime - Current system time
   * @returns {Array} Available time slots
   */
  getAvailableTimeSlots: (bookingDate, currentTime = new Date()) => {
    // Updated slots: 06:30 AM to 05:30 PM in 30-minute intervals
    const allSlots = [
      '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
      '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
      '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
      '16:00', '16:30', '17:00', '17:30'
    ]

    // If booking is for today, filter based on current time
    if (bookingRules.isToday(bookingDate)) {
      const currentSlot = bookingRules.getCurrentHourSlot(currentTime)
      
      return allSlots.filter(slot => {
        const [hour, min] = slot.split(':').map(Number)
        const slotMinutes = hour * 60 + min
        
        // Allow current hour slot if within first 30 minutes
        if (slotMinutes === currentSlot.slotMinutes) {
          return currentSlot.canBookCurrentHour
        }
        
        // Otherwise must be future slots
        return slotMinutes > currentSlot.slotMinutes
      })
    }

    return allSlots
  },

  /**
   * Get end time options based on start time
   * @param {string} startTime - Start time (HH:MM)
   * @param {string} bookingDate - Date string (YYYY-MM-DD)
   * @param {Date} currentTime - Current system time
   * @returns {Array} Available end time slots
   */
  getAvailableEndTimes: (startTime, bookingDate, currentTime = new Date()) => {
    const allSlots = bookingRules.getAvailableTimeSlots(bookingDate, currentTime)
    const startIndex = allSlots.indexOf(startTime)
    
    if (startIndex === -1) return []
    
    // Return times after start time (max 10.5 hours = 21 slots of 30 min)
    return allSlots.slice(startIndex + 1, startIndex + 22)
  },

  /**
   * Comprehensive booking validation
   * @param {Object} bookingData - Booking data
   * @param {Object} existingBookings - Existing bookings for conflict check
   * @param {Date} currentTime - Current system time
   * @returns {Object} Complete validation result
   */
  validateBooking: (bookingData, existingBookings = [], currentTime = new Date()) => {
    const { booking_date, start_time, end_time } = bookingData
    
    // Rule 1: Time constraints (06:30 AM - 05:00 PM)
    const timeConstraintsCheck = bookingRules.validateTimeConstraints(start_time, end_time)
    if (!timeConstraintsCheck.isValid) {
      return timeConstraintsCheck
    }

    // Rule 2: No past booking (with current hour flexibility)
    const futureCheck = bookingRules.isFutureBooking(booking_date, start_time, currentTime)
    if (!futureCheck.isValid) {
      return futureCheck
    }

    // Rule 3: Time range validation
    const timeRangeCheck = bookingRules.validateTimeRange(start_time, end_time)
    if (!timeRangeCheck.isValid) {
      return timeRangeCheck
    }

    // Rule 4: Duration validation
    const durationCheck = bookingRules.validateDuration(timeRangeCheck.duration)
    if (!durationCheck.isValid) {
      return durationCheck
    }

    // Rule 5: Conflict check with existing bookings
    const conflictCheck = bookingRules.checkBookingConflict(
      bookingData,
      existingBookings
    )
    if (!conflictCheck.isValid) {
      return conflictCheck
    }

    return {
      isValid: true,
      error: null,
      bookingDateTime: futureCheck.bookingDateTime,
      duration: timeRangeCheck.duration,
      durationHours: timeRangeCheck.durationHours
    }
  },

  /**
   * Check for booking conflicts
   * @param {Object} newBooking - New booking data
   * @param {Array} existingBookings - Existing bookings
   * @returns {Object} Conflict check result
   */
  checkBookingConflict: (newBooking, existingBookings) => {
    const { booking_date, start_time, end_time, lab_id } = newBooking
    
    // Convert times to minutes for comparison
    const [startHour, startMin] = start_time.split(':').map(Number)
    const [endHour, endMin] = end_time.split(':').map(Number)
    const newStartMinutes = startHour * 60 + startMin
    const newEndMinutes = endHour * 60 + endMin

    // Check for conflicts with confirmed bookings
    const conflict = existingBookings.find(booking => {
      // Skip if different lab or different date
      if (booking.lab_id !== lab_id || booking.booking_date !== booking_date) {
        return false
      }

      // Skip if not confirmed
      if (booking.status !== 'confirmed') {
        return false
      }

      // Convert existing booking times to minutes
      const [existingStartHour, existingStartMin] = booking.start_time.split(':').map(Number)
      const [existingEndHour, existingEndMin] = booking.end_time.split(':').map(Number)
      const existingStartMinutes = existingStartHour * 60 + existingStartMin
      const existingEndMinutes = existingEndHour * 60 + existingEndMin

      // Check for overlap: (Start1 < End2) AND (End1 > Start2)
      return (newStartMinutes < existingEndMinutes) && (newEndMinutes > existingStartMinutes)
    })

    return {
      isValid: !conflict,
      error: conflict ? 'Time slot conflicts with existing booking.' : null,
      conflictingBooking: conflict || null
    }
  },

  /**
   * Get minimum date for booking (today)
   * @returns {string} Today's date in YYYY-MM-DD format
   */
  getMinBookingDate: () => {
    return new Date().toISOString().split('T')[0]
  },

  /**
   * Format time for display
   * @param {string} time - Time string (HH:MM)
   * @returns {string} Formatted time
   */
  formatTime: (time) => {
    const [hour, minute] = time.split(':')
    const hourInt = parseInt(hour)
    const ampm = hourInt >= 12 ? 'PM' : 'AM'
    const displayHour = hourInt > 12 ? hourInt - 12 : (hourInt === 0 ? 12 : hourInt)
    return `${displayHour}:${minute} ${ampm}`
  },

  /**
   * Check if user can modify booking (admin rules)
   * @param {Object} booking - Booking object
   * @param {Date} currentTime - Current system time
   * @returns {Object} Permission check result
   */
  canModifyBooking: (booking, currentTime = new Date()) => {
    const bookingDateTime = new Date(`${booking.booking_date}T${booking.start_time}`)
    const isFuture = bookingDateTime >= currentTime
    
    return {
      canEdit: isFuture,
      canCancel: isFuture,
      error: isFuture ? null : 'Cannot modify past bookings.'
    }
  }
}

export default bookingRules
