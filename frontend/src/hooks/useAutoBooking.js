import { useState } from 'react'
import { bookingsApi } from '../api/bookings'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export const useAutoBooking = () => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  const createAutoBooking = async (labId, labName, purpose) => {
    setIsSubmitting(true)
    
    try {
      // Calculate booking times - start from next hour
      const now = new Date()
      const startTime = new Date(now)
      startTime.setMinutes(0, 0, 0) // Round to current hour
      startTime.setHours(startTime.getHours() + 1) // Move to next hour
      
      const endTime = new Date(startTime)
      endTime.setHours(endTime.getHours() + 1) // +1 hour duration
      
      const startTimeStr = startTime.toTimeString().slice(0, 5) // HH:MM format
      const endTimeStr = endTime.toTimeString().slice(0, 5)
      const bookingDate = startTime.toISOString().split('T')[0] // YYYY-MM-DD

      // Create booking data
      const bookingData = {
        lab_id: parseInt(labId),
        start_time: startTimeStr,
        end_time: endTimeStr,
        booking_date: bookingDate,
        purpose: purpose || 'Auto-booking via Lab Map'
      }

      console.log('Creating auto booking:', bookingData)

      // Call booking API
      const response = await bookingsApi.create(bookingData)
      
      if (response.data.success) {
        const booking = response.data.booking
        
        // Show success message
        toast.success(`Booking confirmed for ${labName}!`)
        
        // Redirect to success page
        navigate(`/booking-success/${booking.id}`, {
          state: { 
            booking: booking,
            labName: labName
          }
        })
        
        return { success: true, booking }
      } else {
        throw new Error(response.data.error || 'Booking failed')
      }
      
    } catch (error) {
      console.error('Auto booking error:', error)
      
      // Show specific error messages
      if (error.response?.data?.error) {
        toast.error(error.response.data.error)
      } else if (error.message) {
        toast.error(error.message)
      } else {
        toast.error('Failed to create booking. Please try again.')
      }
      
      return { success: false, error: error.message }
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    createAutoBooking,
    isSubmitting
  }
}
