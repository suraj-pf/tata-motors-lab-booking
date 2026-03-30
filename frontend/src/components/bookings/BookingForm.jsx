import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { bookingsApi } from '../../api/bookings'
import { generateTimeSlots, calculateDuration, isValidDuration, parseTimeToMinutes } from '../../utils/timeUtils'
import { Calendar, Clock, User, FileText, AlertCircle, Info, Loader2, AlertTriangle, ExternalLink } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useSocket } from '../../hooks/useSocket'
import toast from 'react-hot-toast'

const BookingForm = ({ labId, lab, onSubmit }) => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { socket, connected } = useSocket()
  
  const [loading, setLoading] = useState(false)
  const [fetchingAvailability, setFetchingAvailability] = useState(false)
  const [availability, setAvailability] = useState([])
  const [formData, setFormData] = useState({
    booking_date: new Date().toISOString().split('T')[0],
    start_time: '',
    end_time: '',
    bc_number: user?.bc_number || '',
    purpose: '',
  })
  const [errors, setErrors] = useState({})
  const [conflictError, setConflictError] = useState(null)

  const timeSlots = useMemo(() => generateTimeSlots(), [])

  // Get current time info - FIXED: allow current hour booking with 30-min cutoff
  const getCurrentTimeInfo = useCallback(() => {
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTimeStr = now.toTimeString().slice(0, 5)
    
    // Calculate if current hour should be disabled (>30 min passed)
    const currentHourDisabled = currentMinute > 30
    
    return {
      currentTime: currentTimeStr,
      currentHour,
      currentMinute,
      currentHourStart: `${currentHour.toString().padStart(2, '0')}:00`,
      currentHourEnd: `${currentHour.toString().padStart(2, '0')}:30`,
      currentHourDisabled, // NEW: disable current hour if >30 min passed
    }
  }, [])

  const isToday = useCallback((date) => {
    const today = new Date().toISOString().split('T')[0]
    return date === today
  }, [])

  // Fetch availability when date changes
  useEffect(() => {
    const fetchAvailability = async () => {
      setFetchingAvailability(true)
      try {
        const response = await bookingsApi.checkAvailability({
          labId,
          date: formData.booking_date,
        })
        setAvailability(response.data.bookedSlots || [])
      } catch (error) {
        console.error('Failed to fetch availability:', error)
        toast.error('Failed to load availability')
      } finally {
        setFetchingAvailability(false)
      }
    }

    if (formData.booking_date) {
      fetchAvailability()
    }
  }, [formData.booking_date, labId])

  // Real-time sync via WebSocket with form validation
  useEffect(() => {
    if (!socket || !connected) return

    const handleBookingCreated = (data) => {
      if (data.booking?.lab_id === labId && data.booking?.booking_date === formData.booking_date) {
        setAvailability(prev => [...prev, data.booking])
        toast.info('Availability updated - new booking added')
        
        // NEW: Real-time form validation - check if selected slots are still valid
        if (formData.start_time || formData.end_time) {
          const newBookingStart = parseTimeToMinutes(data.booking.start_time)
          const newBookingEnd = parseTimeToMinutes(data.booking.end_time)
          const selectedStart = formData.start_time ? parseTimeToMinutes(formData.start_time) : null
          const selectedEnd = formData.end_time ? parseTimeToMinutes(formData.end_time) : null
          
          // Check if new booking conflicts with selected time
          if (selectedStart && selectedEnd) {
            if (selectedStart < newBookingEnd && selectedEnd > newBookingStart) {
              // Conflict detected - reset form
              setFormData(prev => ({ ...prev, start_time: '', end_time: '' }))
              setErrors(prev => ({ ...prev, start_time: 'This slot was just booked' }))
              toast.warning('Your selected time is no longer available')
            }
          }
        }
      }
    }

    const handleBookingCancelled = (data) => {
      if (data.lab_id === labId) {
        setAvailability(prev => prev.filter(b => b.id !== data.bookingId))
        toast.info('Availability updated - booking cancelled')
      }
    }

    socket.on('booking-created', handleBookingCreated)
    socket.on('booking-cancelled', handleBookingCancelled)

    return () => {
      socket.off('booking-created', handleBookingCreated)
      socket.off('booking-cancelled', handleBookingCancelled)
    }
  }, [socket, connected, labId, formData.booking_date, formData.start_time, formData.end_time])

  // FIXED: Time logic - allow current hour booking with 30-min cutoff
  const getFilteredTimeSlots = useMemo(() => {
    if (!isToday(formData.booking_date)) {
      return timeSlots.slice(0, -1) // All slots for future dates
    }

    const { currentHour, currentHourDisabled } = getCurrentTimeInfo()
    
    // Allow current hour and future hours
    // If >30 min passed in current hour, disable current hour slots
    return timeSlots.filter(slot => {
      const slotHour = parseInt(slot.value.split(':')[0])
      // If current hour is disabled (after 30 min), only show future hours
      if (currentHourDisabled && slotHour === currentHour) {
        return false
      }
      return slotHour >= currentHour
    })
  }, [formData.booking_date, timeSlots, isToday, getCurrentTimeInfo])

  // Check slot status with exact booking ranges (available, booked, partial)
  const getSlotStatus = useCallback((slotValue) => {
    const slotStart = parseTimeToMinutes(slotValue)
    const slotEnd = slotStart + 30 // 30 min slots

    const conflictingBookings = availability.filter(booking => {
      const bookingStart = parseTimeToMinutes(booking.start_time)
      const bookingEnd = parseTimeToMinutes(booking.end_time)
      // Correct overlap logic: (startA < endB) AND (endA > startB)
      return slotStart < bookingEnd && slotEnd > bookingStart
    })

    if (conflictingBookings.length === 0) {
      return { status: 'available', color: 'bg-green-500', bookings: [] }
    }

    // Calculate exact booked minutes within this slot
    const bookedRanges = conflictingBookings.map(booking => {
      const bookingStart = parseTimeToMinutes(booking.start_time)
      const bookingEnd = parseTimeToMinutes(booking.end_time)
      const overlapStart = Math.max(bookingStart, slotStart)
      const overlapEnd = Math.min(bookingEnd, slotEnd)
      return {
        start: Math.floor(overlapStart / 60).toString().padStart(2, '0') + ':' + (overlapStart % 60).toString().padStart(2, '0'),
        end: Math.floor(overlapEnd / 60).toString().padStart(2, '0') + ':' + (overlapEnd % 60).toString().padStart(2, '0'),
        user: booking.user_name || 'Unknown'
      }
    })

    // Check if fully booked (all 30 mins)
    const totalBookedMinutes = conflictingBookings.reduce((acc, booking) => {
      const bookingStart = Math.max(parseTimeToMinutes(booking.start_time), slotStart)
      const bookingEnd = Math.min(parseTimeToMinutes(booking.end_time), slotEnd)
      return acc + (bookingEnd - bookingStart)
    }, 0)

    if (totalBookedMinutes >= 30) {
      return { status: 'booked', color: 'bg-red-500', bookings: conflictingBookings, ranges: bookedRanges }
    }

    // IMPROVED: Show partial with exact ranges
    return { 
      status: 'partial', 
      color: 'bg-yellow-500', 
      bookings: conflictingBookings,
      ranges: bookedRanges,
      availableMinutes: 30 - totalBookedMinutes
    }
  }, [availability])

  // FIXED: Calculate available end times based on start time with correct overlap logic
  const availableEndSlots = useMemo(() => {
    if (!formData.start_time) return []

    const startIndex = timeSlots.findIndex(slot => slot.value === formData.start_time)
    const startMinutes = parseTimeToMinutes(formData.start_time)
    const maxEndIndex = startIndex + 21 // 10.5 hours = 21 slots

    return timeSlots.slice(startIndex + 1, Math.min(maxEndIndex + 1, timeSlots.length)).filter(slot => {
      const slotStart = parseTimeToMinutes(slot.value)
      const slotEnd = slotStart + 30

      // FIXED: Correct overlap detection
      // Two slots overlap if: (startA < endB) AND (endA > startB)
      return !availability.some(booking => {
        const bookingStart = parseTimeToMinutes(booking.start_time)
        const bookingEnd = parseTimeToMinutes(booking.end_time)
        return startMinutes < bookingEnd && slotEnd > bookingStart
      })
    })
  }, [formData.start_time, availability, timeSlots])

  // Get booked ranges for display
  const bookedRanges = useMemo(() => {
    return availability.map(booking => ({
      start: booking.start_time?.substring(0, 5),
      end: booking.end_time?.substring(0, 5),
      user: booking.user_name || 'Unknown'
    }))
  }, [availability])

  const validateForm = () => {
    const newErrors = {}
    const { currentHour } = getCurrentTimeInfo()

    // Date validation
    if (!formData.booking_date) {
      newErrors.booking_date = 'Date is required'
    } else {
      const selectedDate = new Date(formData.booking_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (selectedDate < today) {
        newErrors.booking_date = 'Cannot book past dates'
      }
    }

    // FIXED: Start time validation - allow current hour
    if (!formData.start_time) {
      newErrors.start_time = 'Start time is required'
    } else if (isToday(formData.booking_date)) {
      const selectedHour = parseInt(formData.start_time.split(':')[0])
      // Only block if trying to book before current hour
      if (selectedHour < currentHour) {
        newErrors.start_time = 'Cannot book past hours'
      }
    }

    // End time validation
    if (!formData.end_time) {
      newErrors.end_time = 'End time is required'
    }

    // Duration validation
    if (formData.start_time && formData.end_time) {
      if (!isValidDuration(formData.start_time, formData.end_time)) {
        newErrors.duration = 'Duration must be between 30 minutes and 10.5 hours'
      } else if (formData.end_time <= formData.start_time) {
        newErrors.duration = 'End time must be after start time'
      }
    }

    // BC Number validation
    if (!formData.bc_number) {
      newErrors.bc_number = 'BC Number is required'
    }

    return newErrors
  }

  const [optimisticBlockedSlots, setOptimisticBlockedSlots] = useState([])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setConflictError(null)
    
    const newErrors = validateForm()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      toast.error('Please fix the errors in the form')
      return
    }

    // OPTIMISTIC UI: Temporarily block selected slots
    const blockedSlot = {
      id: 'temp-' + Date.now(),
      start_time: formData.start_time,
      end_time: formData.end_time,
      booking_date: formData.booking_date,
      user_name: user?.name || 'You (pending)',
      isOptimistic: true
    }
    setOptimisticBlockedSlots(prev => [...prev, blockedSlot])
    
    setLoading(true)
    try {
      await onSubmit(formData)
      toast.success('Booking created successfully!')
      // Clear optimistic block on success (real booking will replace it)
      setOptimisticBlockedSlots(prev => prev.filter(s => s.id !== blockedSlot.id))
    } catch (error) {
      // Revert optimistic block on error
      setOptimisticBlockedSlots(prev => prev.filter(s => s.id !== blockedSlot.id))
      
      // Handle conflict error
      if (error.response?.status === 409 || error.response?.data?.conflict) {
        setConflictError({
          message: 'This slot was just booked by someone else',
          date: formData.booking_date,
          labId: labId,
          startTime: formData.start_time,
          endTime: formData.end_time
        })
        toast.error('Booking conflict - slot no longer available')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setErrors(prev => ({ ...prev, [name]: '', duration: '' }))
    setConflictError(null)

    // Clear end time if start time changes
    if (name === 'start_time') {
      setFormData(prev => ({ ...prev, end_time: '' }))
    }
  }

  // Dynamic duration calculation
  const duration = useMemo(() => {
    if (formData.start_time && formData.end_time) {
      return calculateDuration(formData.start_time, formData.end_time)
    }
    return null
  }, [formData.start_time, formData.end_time])

  // Format conflict date for timeline link with context
  const getTimelineLink = () => {
    if (!conflictError) return '/timeline'
    const params = new URLSearchParams()
    params.set('date', conflictError.date)
    params.set('lab', conflictError.labId)
    if (conflictError.startTime) params.set('slot', conflictError.startTime)
    return `/timeline?${params.toString()}`
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white/95 backdrop-blur-xl rounded-2xl p-6 md:p-8 shadow-2xl">
      <h2 className="text-2xl font-bold text-ocean mb-6">Book This Lab</h2>

      {/* Conflict Error Banner */}
      {conflictError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900 mb-1">
                {conflictError.message}
              </p>
              <button
                type="button"
                onClick={() => navigate(getTimelineLink())}
                className="inline-flex items-center gap-1 text-sm text-red-700 hover:text-red-900 font-medium"
              >
                View Timeline
                <ExternalLink size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Current Time Indicator */}
      {isToday(formData.booking_date) && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-start gap-3">
            <Info size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900 mb-1">Booking for Today</p>
              <p className="text-sm text-blue-800">
                Current time: {getCurrentTimeInfo().currentTime} - You can book from the current hour onwards
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Date Selection */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-ocean mb-2 flex items-center gap-2">
          <Calendar size={18} className="text-teal" />
          Booking Date
        </label>
        <input
          type="date"
          name="booking_date"
          value={formData.booking_date}
          onChange={handleChange}
          min={new Date().toISOString().split('T')[0]}
          disabled={fetchingAvailability}
          className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-4 transition-all disabled:opacity-50 ${
            errors.booking_date
              ? 'border-tata-red focus:border-tata-red focus:ring-tata-red/10'
              : 'border-teal/20 focus:border-teal focus:ring-teal/10'
          }`}
        />
        {fetchingAvailability && (
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
            <Loader2 size={14} className="animate-spin" />
            Loading availability...
          </div>
        )}
        {errors.booking_date && (
          <p className="mt-1 text-sm text-tata-red flex items-center gap-1">
            <AlertCircle size={14} />
            {errors.booking_date}
          </p>
        )}
      </div>

      {/* Booked Ranges Display */}
      {bookedRanges.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 rounded-xl">
          <p className="text-sm font-medium text-gray-700 mb-2">Booked today:</p>
          <div className="flex flex-wrap gap-2">
            {bookedRanges.map((range, idx) => (
              <span key={idx} className="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 text-xs rounded-md">
                {range.start} - {range.end}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Time Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-semibold text-ocean mb-2 flex items-center gap-2">
            <Clock size={18} className="text-teal" />
            Start Time
            {isToday(formData.booking_date) && (
              <span className="text-xs text-blue-600 font-normal">(From current hour)</span>
            )}
          </label>
          <select
            name="start_time"
            value={formData.start_time}
            onChange={handleChange}
            disabled={fetchingAvailability}
            className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              errors.start_time
                ? 'border-tata-red focus:border-tata-red focus:ring-tata-red/10'
                : 'border-teal/20 focus:border-teal focus:ring-teal/10'
            }`}
          >
            <option value="">Select start time</option>
            {getFilteredTimeSlots.map(slot => {
              const slotStatus = getSlotStatus(slot.value)
              const isBooked = slotStatus.status === 'booked'
              
              return (
                <option 
                  key={slot.value} 
                  value={slot.value} 
                  disabled={isBooked}
                  className={isBooked ? 'text-red-500' : 'text-green-600'}
                >
                  {slot.label} {isBooked && '(Booked)'}
                </option>
              )
            })}
          </select>
          
          {/* Slot Status Legend */}
          <div className="mt-2 flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Available
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              Booked
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
              Partial
            </span>
          </div>
          
          {errors.start_time && (
            <p className="mt-1 text-sm text-tata-red flex items-center gap-1">
              <AlertCircle size={14} />
              {errors.start_time}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-ocean mb-2 flex items-center gap-2">
            <Clock size={18} className="text-teal" />
            End Time
          </label>
          <select
            name="end_time"
            value={formData.end_time}
            onChange={handleChange}
            disabled={!formData.start_time || fetchingAvailability}
            className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              errors.end_time
                ? 'border-tata-red focus:border-tata-red focus:ring-tata-red/10'
                : 'border-teal/20 focus:border-teal focus:ring-teal/10'
            } ${!formData.start_time ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <option value="">Select end time</option>
            {availableEndSlots.map(slot => (
              <option key={slot.value} value={slot.value}>
                {slot.label}
              </option>
            ))}
          </select>
          {formData.start_time && availableEndSlots.length === 0 && (
            <p className="mt-1 text-sm text-orange-600">
              No available slots after this start time
            </p>
          )}
          {errors.end_time && (
            <p className="mt-1 text-sm text-tata-red flex items-center gap-1">
              <AlertCircle size={14} />
              {errors.end_time}
            </p>
          )}
        </div>
      </div>

      {/* Dynamic Duration Display */}
      {duration !== null && (
        <div className="mb-6 p-4 bg-teal/5 rounded-xl border border-teal/20">
          <p className="text-sm text-teal font-medium flex items-center gap-2">
            <Clock size={16} />
            Duration: {duration} hour{duration !== 1 ? 's' : ''}
          </p>
          {formData.start_time && formData.end_time && !isValidDuration(formData.start_time, formData.end_time) && (
            <p className="text-xs text-orange-600 mt-1">
              Maximum allowed duration is 10.5 hours
            </p>
          )}
        </div>
      )}

      {errors.duration && (
        <p className="mb-4 text-sm text-tata-red flex items-center gap-1">
          <AlertCircle size={14} />
          {errors.duration}
        </p>
      )}

      {/* BC Number */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-ocean mb-2 flex items-center gap-2">
          <User size={18} className="text-teal" />
          BC Number
        </label>
        <input
          type="text"
          name="bc_number"
          value={formData.bc_number}
          onChange={handleChange}
          placeholder="Enter your BC number"
          className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-4 transition-all ${
            errors.bc_number
              ? 'border-tata-red focus:border-tata-red focus:ring-tata-red/10'
              : 'border-teal/20 focus:border-teal focus:ring-teal/10'
          }`}
        />
        {errors.bc_number && (
          <p className="mt-1 text-sm text-tata-red flex items-center gap-1">
            <AlertCircle size={14} />
            {errors.bc_number}
          </p>
        )}
      </div>

      {/* Purpose */}
      <div className="mb-8">
        <label className="block text-sm font-semibold text-ocean mb-2 flex items-center gap-2">
          <FileText size={18} className="text-teal" />
          Purpose (Optional)
        </label>
        <textarea
          name="purpose"
          value={formData.purpose}
          onChange={handleChange}
          rows="3"
          placeholder="Enter the purpose of booking..."
          className="w-full px-4 py-3 rounded-xl border-2 border-teal/20 focus:border-teal focus:outline-none focus:ring-4 focus:ring-teal/10 transition-all resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => navigate('/labs')}
          className="flex-1 px-6 py-3 rounded-xl border-2 border-teal/20 text-ocean font-semibold hover:bg-teal/10 transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || fetchingAvailability}
          className="flex-1 tata-btn py-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Booking...
            </>
          ) : (
            'Confirm Booking'
          )}
        </button>
      </div>
    </form>
  )
}

export default BookingForm