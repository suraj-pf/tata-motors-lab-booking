import { TIME_CONFIG } from './constants'

// Generate time slots (6:30 AM - 5:00 PM, 30min intervals)
export const generateTimeSlots = () => {
  const slots = []
  let hour = TIME_CONFIG.START_HOUR
  let minute = TIME_CONFIG.START_MINUTE

  while (hour < TIME_CONFIG.END_HOUR || (hour === TIME_CONFIG.END_HOUR && minute === 0)) {
    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    slots.push({
      value: timeStr,
      label: formatTime(timeStr),
      hour,
      minute,
    })

    minute += TIME_CONFIG.SLOT_INTERVAL
    if (minute === 60) {
      minute = 0
      hour++
    }
  }
  return slots
}

// Parse HH:MM string to minutes since midnight
export const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return 0
  const [hour, minute] = timeStr.split(':').map(Number)
  return hour * 60 + minute
}

// Format time for display
export const formatTime = (timeStr) => {
  if (!timeStr) return ''
  const [hour, minute] = timeStr.split(':').map(Number)
  const hour12 = hour % 12 || 12
  const ampm = hour >= 12 ? 'PM' : 'AM'
  return `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`
}

// Calculate duration in hours
export const calculateDuration = (startTime, endTime) => {
  const start = parseTimeToMinutes(startTime)
  const end = parseTimeToMinutes(endTime)
  return (end - start) / 60
}

// Validate booking duration
export const isValidDuration = (startTime, endTime) => {
  const duration = calculateDuration(startTime, endTime)
  return duration > 0 && duration <= TIME_CONFIG.MAX_DURATION_MINUTES / 60
}

// Check time overlap
export const hasOverlap = (existingBookings, newStart, newEnd) => {
  const newStartMinutes = parseTimeToMinutes(newStart)
  const newEndMinutes = parseTimeToMinutes(newEnd)

  return existingBookings.some(booking => {
    const bookingStart = parseTimeToMinutes(booking.start_time)
    const bookingEnd = parseTimeToMinutes(booking.end_time)
    
    return newStartMinutes < bookingEnd && newEndMinutes > bookingStart
  })
}

// Get available slots for a lab
export const getAvailableSlots = (bookedSlots = []) => {
  const allSlots = generateTimeSlots()
  
  return allSlots.filter(slot => {
    const slotMinutes = parseTimeToMinutes(slot.value)
    return !bookedSlots.some(booking => {
      const start = parseTimeToMinutes(booking.start_time)
      const end = parseTimeToMinutes(booking.end_time)
      return slotMinutes >= start && slotMinutes < end
    })
  })
}