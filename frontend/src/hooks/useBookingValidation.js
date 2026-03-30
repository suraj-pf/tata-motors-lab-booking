import { useState, useCallback, useMemo } from 'react'
import { bookingRules } from '../utils/bookingRules'
import { bookingsApi } from '../api/bookings'
import { useSocket } from './useSocket'
import toast from 'react-hot-toast'

export const useBookingValidation = () => {
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState(null)
  const { socket, connected } = useSocket()

  /**
   * Validate booking data
   * @param {Object} bookingData - Booking data to validate
   * @param {Array} existingBookings - Existing bookings for conflict check
   * @returns {Promise<Object>} Validation result
   */
  const validateBooking = useCallback(async (bookingData, existingBookings = []) => {
    setValidating(true)
    setValidationResult(null)

    try {
      // Client-side validation
      const clientValidation = bookingRules.validateBooking(bookingData, existingBookings)
      
      if (!clientValidation.isValid) {
        setValidationResult(clientValidation)
        return clientValidation
      }

      // Server-side validation (additional safety)
      const serverResponse = await bookingsApi.checkAvailability({
        lab_id: bookingData.lab_id,
        booking_date: bookingData.booking_date,
        start_time: bookingData.start_time,
        end_time: bookingData.end_time
      })

      // Check server response for conflicts
      if (serverResponse.data.conflicts && serverResponse.data.conflicts.length > 0) {
        const serverValidation = {
          isValid: false,
          error: 'Time slot conflicts with existing booking.',
          conflictingBooking: serverResponse.data.conflicts[0]
        }
        setValidationResult(serverValidation)
        return serverValidation
      }

      // All validations passed
      const validResult = {
        isValid: true,
        error: null,
        bookingDateTime: clientValidation.bookingDateTime,
        duration: clientValidation.duration,
        durationHours: clientValidation.durationHours
      }

      setValidationResult(validResult)
      return validResult

    } catch (error) {
      const errorResult = {
        isValid: false,
        error: error.response?.data?.error || 'Validation failed. Please try again.'
      }
      setValidationResult(errorResult)
      return errorResult
    } finally {
      setValidating(false)
    }
  }, [])

  /**
   * Create booking with validation
   * @param {Object} bookingData - Booking data
   * @param {Object} room - Room object
   * @returns {Promise<Object>} Booking result
   */
  const createValidatedBooking = useCallback(async (bookingData, room) => {
    setValidating(true)

    try {
      // First validate the booking
      const validation = await validateBooking(bookingData)
      
      if (!validation.isValid) {
        toast.error(validation.error)
        return { success: false, error: validation.error }
      }

      // Create the booking
      const bookingResponse = await bookingsApi.create(bookingData)
      
      // Emit real-time update if socket is connected
      if (socket && connected) {
        socket.emit('booking-created', {
          roomId: room.id,
          roomName: room.name,
          status: 'booked',
          booking: bookingResponse.data.booking
        })
      }

      toast.success('Booking confirmed successfully!')
      return { success: true, booking: bookingResponse.data.booking }

    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to create booking'
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setValidating(false)
    }
  }, [validateBooking, socket, connected])

  /**
   * Get available time slots for a date
   * @param {string} bookingDate - Booking date
   * @returns {Array} Available time slots
   */
  const getAvailableTimeSlots = useCallback((bookingDate) => {
    return bookingRules.getAvailableTimeSlots(bookingDate)
  }, [])

  /**
   * Get end time options based on start time
   * @param {string} startTime - Start time
   * @param {string} bookingDate - Booking date
   * @returns {Array} Available end times
   */
  getAvailableEndTimes: useCallback((startTime, bookingDate) => {
    return bookingRules.getAvailableEndTimes(startTime, bookingDate)
  }, [])

  /**
   * Check if a specific time slot is valid
   * @param {string} bookingDate - Booking date
   * @param {string} startTime - Start time
   * @param {string} endTime - End time
   * @returns {Object} Validation result
   */
  const isTimeSlotValid = useCallback((bookingDate, startTime, endTime) => {
    const bookingData = { booking_date: bookingDate, start_time: startTime, end_time: endTime }
    return bookingRules.validateBooking(bookingData)
  }, [])

  /**
   * Clear validation result
   */
  const clearValidation = useCallback(() => {
    setValidationResult(null)
  }, [])

  // Memoized computed values
  const computedValues = useMemo(() => ({
    minBookingDate: bookingRules.getMinBookingDate(),
    isToday: bookingRules.isToday,
    formatTime: bookingRules.formatTime,
    canModifyBooking: bookingRules.canModifyBooking
  }), [])

  return {
    // State
    validating,
    validationResult,

    // Methods
    validateBooking,
    createValidatedBooking,
    getAvailableTimeSlots,
    getAvailableEndTimes,
    isTimeSlotValid,
    clearValidation,

    // Computed values
    ...computedValues
  }
}

export default useBookingValidation
