import { TIME_CONFIG, BOOKING_RULES } from './constants'

// Validate email format
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Validate password strength
export const isStrongPassword = (password) => {
  return password.length >= 6
}

// Validate BC number format
export const isValidBCNumber = (bcNumber) => {
  const bcRegex = /^BC\d{3,}$/i
  return bcRegex.test(bcNumber)
}

// Validate booking time
export const isValidBookingTime = (startTime, endTime) => {
  const start = parseTimeToMinutes(startTime)
  const end = parseTimeToMinutes(endTime)
  const duration = (end - start) / 60

  if (duration <= 0 || duration > BOOKING_RULES.MAX_DURATION) return false

  const minStart = TIME_CONFIG.START_HOUR * 60 + TIME_CONFIG.START_MINUTE
  const maxEnd = TIME_CONFIG.END_HOUR * 60 + TIME_CONFIG.END_MINUTE

  return start >= minStart && end <= maxEnd
}

// Validate booking date
export const isValidBookingDate = (dateStr) => {
  const date = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  return date >= today
}

// Validate required fields
export const validateRequired = (data, fields) => {
  const errors = {}
  fields.forEach(field => {
    if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
      errors[field] = `${field} is required`
    }
  })
  return errors
}