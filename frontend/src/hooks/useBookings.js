import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { bookingsApi } from '../api/bookings'
import { useSocket } from './useSocket'
import toast from 'react-hot-toast'

// PRODUCTION: Utility - Deduplicate bookings by ID, keeping newest
const deduplicateBookings = (bookings) => {
  const seen = new Map()
  bookings.forEach(booking => {
    const existing = seen.get(booking.id)
    if (!existing || (booking.updated_at && existing.updated_at && new Date(booking.updated_at) > new Date(existing.updated_at))) {
      seen.set(booking.id, booking)
    }
  })
  return Array.from(seen.values())
}

// PRODUCTION: Utility - Sort bookings by start time (chronological)
const sortBookingsByTime = (bookings) => {
  return [...bookings].sort((a, b) => {
    const dateA = new Date(`${a.booking_date}T${a.start_time}`)
    const dateB = new Date(`${b.booking_date}T${b.start_time}`)
    return dateA - dateB
  })
}

// PRODUCTION: Normalize and process bookings
const normalizeBookings = (bookings) => {
  return sortBookingsByTime(deduplicateBookings(bookings))
}

// PRODUCTION: Check if booking time has passed
const isBookingCompleted = (booking) => {
  const now = new Date()
  const bookingEnd = new Date(`${booking.booking_date}T${booking.end_time}`)
  return now > bookingEnd
}

// PRODUCTION: Classify booking into category
const classifyBooking = (booking) => {
  if (booking.status === 'cancelled') return 'cancelled'
  if (isBookingCompleted(booking)) return 'completed'
  return 'upcoming'
}

export const useBookings = () => {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState({}) // Track individual action loading states
  const { socket, connected } = useSocket()
  
  // PRODUCTION: Debounce refs for socket events
  const debounceTimer = useRef(null)
  const pendingUpdates = useRef([])

  // PRODUCTION: Fetch all bookings (no backend status filter)
  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      // Fetch ALL bookings, classify in frontend
      const response = await bookingsApi.getUserBookings({})
      const normalized = normalizeBookings(response.data.bookings || [])
      setBookings(normalized)
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Failed to load bookings'
      setError(errorMessage)
      toast.error('Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initialize on mount
  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  // PRODUCTION: Process pending socket updates with debouncing
  const processPendingUpdates = useCallback(() => {
    if (pendingUpdates.current.length === 0) return
    
    setBookings(prevBookings => {
      let newBookings = [...prevBookings]
      
      pendingUpdates.current.forEach(update => {
        switch (update.type) {
          case 'created':
            // Only add if doesn't exist
            const exists = newBookings.some(b => b.id === update.booking.id)
            if (!exists) newBookings.push(update.booking)
            break
            
          case 'updated':
            // Merge update into existing booking
            newBookings = newBookings.map(b => 
              b.id === update.booking.id ? { ...b, ...update.booking } : b
            )
            break
            
          case 'cancelled':
            // Update status to cancelled instead of removing
            newBookings = newBookings.map(b => 
              b.id === update.bookingId ? { ...b, status: 'cancelled' } : b
            )
            break
        }
      })
      
      pendingUpdates.current = []
      return normalizeBookings(newBookings)
    })
  }, [])

  // Debounced update handler (150ms)
  const queueUpdate = useCallback((update) => {
    pendingUpdates.current.push(update)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => processPendingUpdates(), 150)
  }, [processPendingUpdates])

  // PRODUCTION: Full socket support with proper merging
  useEffect(() => {
    if (!socket || !connected) return

    const handleBookingCreated = (data) => {
      const userId = localStorage.getItem('userId')
      if (data.booking?.user_id?.toString() === userId) {
        queueUpdate({ type: 'created', booking: data.booking })
        toast.success('New booking confirmed!')
        window.dispatchEvent(new CustomEvent('bookingCreated', { detail: data.booking }))
      }
    }

    const handleBookingUpdated = (data) => {
      const userId = localStorage.getItem('userId')
      const isMyBooking = bookings.some(b => b.id === data.booking?.id)
      if (isMyBooking || data.booking?.user_id?.toString() === userId) {
        queueUpdate({ type: 'updated', booking: data.booking })
        toast.info('Booking updated')
        window.dispatchEvent(new CustomEvent('bookingUpdated', { detail: data.booking }))
      }
    }

    const handleBookingCancelled = (data) => {
      const userId = localStorage.getItem('userId')
      const bookingId = data.booking?.id || data.bookingId
      const isMyBooking = bookings.some(b => b.id === bookingId)
      if (isMyBooking || data.booking?.user_id?.toString() === userId) {
        queueUpdate({ type: 'cancelled', bookingId })
        toast.info('Booking cancelled')
        window.dispatchEvent(new CustomEvent('bookingCancelled', { detail: data.booking || { id: bookingId } }))
      }
    }

    socket.on('booking-created', handleBookingCreated)
    socket.on('booking-updated', handleBookingUpdated)
    socket.on('booking-cancelled', handleBookingCancelled)

    return () => {
      socket.off('booking-created', handleBookingCreated)
      socket.off('booking-updated', handleBookingUpdated)
      socket.off('booking-cancelled', handleBookingCancelled)
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [socket, connected, queueUpdate, bookings])

  // PRODUCTION: Time-based auto update (1 minute interval)
  useEffect(() => {
    const interval = setInterval(() => {
      setBookings(prev => normalizeBookings(prev))
    }, 60000)
    
    return () => clearInterval(interval)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [])

  // PRODUCTION: Create booking with loading state
  const createBooking = useCallback(async (bookingData) => {
    setActionLoading(prev => ({ ...prev, create: true }))
    try {
      const response = await bookingsApi.create(bookingData)
      const booking = response.data.booking
      
      // Add to local state immediately
      setBookings(prev => normalizeBookings([booking, ...prev]))
      
      if (booking.status === 'confirmed') toast.success('Booking confirmed!')
      else if (booking.status === 'pending') toast.success(`Queued! Position: ${booking.queue_position || 1}`)
      
      window.dispatchEvent(new CustomEvent('bookingCreated', { detail: booking }))
      return response.data
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data?.error || 'Failed to create booking'
      toast.error(message)
      throw new Error(message)
    } finally {
      setActionLoading(prev => ({ ...prev, create: false }))
    }
  }, [])

  // PRODUCTION: Cancel booking - update status instead of removing
  const cancelBooking = useCallback(async (id) => {
    setActionLoading(prev => ({ ...prev, [id]: true }))
    try {
      await bookingsApi.cancel(id)
      
      // Update status locally instead of removing
      setBookings(prev => 
        normalizeBookings(prev.map(b => 
          b.id === id ? { ...b, status: 'cancelled' } : b
        ))
      )
      
      toast.success('Booking cancelled')
      window.dispatchEvent(new CustomEvent('bookingCancelled', { detail: { id } }))
      return { success: true }
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data?.error || 'Failed to cancel booking'
      toast.error(message)
      return { success: false, error: message }
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }))
    }
  }, [])

  // PRODUCTION: Update booking with loading state
  const updateBooking = useCallback(async (id, updateData) => {
    setActionLoading(prev => ({ ...prev, [id]: true }))
    try {
      const response = await bookingsApi.update(id, updateData)
      const updatedBooking = response.data.booking
      
      // Merge update into local state
      setBookings(prev => 
        normalizeBookings(prev.map(b => 
          b.id === id ? { ...b, ...updatedBooking } : b
        ))
      )
      
      toast.success('Booking updated')
      window.dispatchEvent(new CustomEvent('bookingUpdated', { detail: updatedBooking }))
      return { success: true, booking: updatedBooking }
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data?.error || 'Failed to update booking'
      toast.error(message)
      return { success: false, error: message }
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }))
    }
  }, [])

  // PRODUCTION: Classified bookings (computed in frontend)
  const classifiedBookings = useMemo(() => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    sevenDaysAgo.setHours(0, 0, 0, 0)
    
    return bookings.reduce((acc, booking) => {
      const category = classifyBooking(booking)
      
      // For completed, only show last 7 days
      if (category === 'completed') {
        const bookingDate = new Date(booking.booking_date)
        if (bookingDate >= sevenDaysAgo) acc.completed.push(booking)
      } else {
        acc[category].push(booking)
      }
      return acc
    }, { upcoming: [], completed: [], cancelled: [] })
  }, [bookings])

  // PRODUCTION: Sorted bookings within each category
  const sortedClassifiedBookings = useMemo(() => {
    const now = new Date()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return {
      // Upcoming: Today's first, then chronological
      upcoming: [...classifiedBookings.upcoming].sort((a, b) => {
        const aDate = new Date(a.booking_date)
        const bDate = new Date(b.booking_date)
        const aIsToday = aDate.toDateString() === today.toDateString()
        const bIsToday = bDate.toDateString() === today.toDateString()
        
        if (aIsToday && !bIsToday) return -1
        if (!aIsToday && bIsToday) return 1
        return new Date(`${a.booking_date}T${a.start_time}`) - new Date(`${b.booking_date}T${b.start_time}`)
      }),
      
      // Completed: Most recent first
      completed: [...classifiedBookings.completed].sort((a, b) => {
        return new Date(`${b.booking_date}T${b.end_time}`) - new Date(`${a.booking_date}T${a.end_time}`)
      }),
      
      // Cancelled: Most recent first
      cancelled: [...classifiedBookings.cancelled].sort((a, b) => {
        return new Date(`${b.booking_date}T${b.start_time}`) - new Date(`${a.booking_date}T${a.start_time}`)
      })
    }
  }, [classifiedBookings])

  return {
    bookings,
    classifiedBookings: sortedClassifiedBookings,
    loading,
    error,
    actionLoading,
    refetch: fetchBookings,
    createBooking,
    cancelBooking,
    updateBooking,
    classifyBooking,
    isBookingCompleted
  }
}