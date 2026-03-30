import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { labsApi } from '../api/labs'
import { useSocket } from './useSocket'
import toast from 'react-hot-toast'

// PRODUCTION: Utility - Check if lab is currently occupied based on time
const isCurrentlyOccupied = (lab) => {
  if (!lab.current_booking && !lab.is_booked) return false
  
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  
  // Check current_booking with real-time overlap
  if (lab.current_booking) {
    const [startH, startM] = (lab.current_booking.start_time || '00:00').split(':').map(Number)
    const [endH, endM] = (lab.current_booking.end_time || '00:00').split(':').map(Number)
    const bookingStart = startH * 60 + startM
    const bookingEnd = endH * 60 + endM
    
    if (currentMinutes >= bookingStart && currentMinutes < bookingEnd) {
      return true
    }
  }
  
  return lab.is_booked // Fallback to static flag
}

// PRODUCTION: Utility - Check if lab has future bookings
const hasFutureBookings = (lab) => {
  if (!lab.bookings || lab.bookings.length === 0) return false
  const now = new Date()
  return lab.bookings.some(booking => {
    const bookingStart = new Date(`${booking.booking_date}T${booking.start_time}`)
    return bookingStart > now
  })
}

// PRODUCTION: Compute real-time lab status
const computeLabStatus = (lab) => {
  if (!lab.is_active) return 'restricted'
  if (isCurrentlyOccupied(lab)) return 'occupied'
  if (hasFutureBookings(lab)) return 'booked'
  return 'available'
}

// PRODUCTION: Deduplicate labs by ID, keeping newest
const deduplicateLabs = (labs) => {
  const seen = new Map()
  labs.forEach(lab => {
    const existing = seen.get(lab.id)
    if (!existing || (lab.updated_at && existing.updated_at && new Date(lab.updated_at) > new Date(existing.updated_at))) {
      seen.set(lab.id, { ...lab, _computedStatus: computeLabStatus(lab) })
    }
  })
  return Array.from(seen.values())
}

// PRODUCTION: Normalize labs with computed status
const normalizeLabs = (labs) => {
  return deduplicateLabs(labs)
}

// PRODUCTION: Compare timestamps to ignore outdated events
const isUpdateNewer = (newLab, existingLab) => {
  if (!existingLab) return true
  if (!newLab.updated_at) return true
  if (!existingLab.updated_at) return true
  return new Date(newLab.updated_at) >= new Date(existingLab.updated_at)
}

export const useLabs = (filters = {}) => {
  const [labs, setLabs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [optimisticUpdates, setOptimisticUpdates] = useState({}) // Track optimistic updates
  const { socket, connected, joinLabs } = useSocket()
  
  // PRODUCTION: Debounce refs for socket events
  const debounceTimer = useRef(null)
  const pendingUpdates = useRef([])
  const joinedLabIds = useRef(new Set())

  // PRODUCTION: Fetch all labs with normalization - NO filters dependency to prevent infinite loop
  const fetchLabs = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await labsApi.getLabs(filters)
      const normalized = normalizeLabs(response.data.labs || [])
      setLabs(normalized)
      return normalized
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Failed to load labs'
      setError(errorMessage)
      toast.error('Failed to load labs')
      throw err
    } finally {
      setLoading(false)
    }
  }, []) // Empty deps - fetch once on mount only

  // Initialize on mount - ONLY run once
  useEffect(() => {
    fetchLabs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty array = run only on mount

  // PRODUCTION: Time-aware recomputation + visibility handler
  useEffect(() => {
    let interval
    
    const recomputeStatus = () => {
      setLabs(prev => normalizeLabs(prev))
    }
    
    interval = setInterval(recomputeStatus, 60000)
    
    const handleVisibilityChange = () => {
      if (!document.hidden) recomputeStatus()
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // PRODUCTION: Room joining with proper tracking
  useEffect(() => {
    if (labs.length > 0 && connected && joinLabs) {
      const labIds = labs.map(lab => lab.id)
      
      // Only re-join if labs changed
      const currentJoined = Array.from(joinedLabIds.current).sort().join(',')
      const newLabs = labIds.sort().join(',')
      
      if (currentJoined !== newLabs) {
        console.log('Joining lab rooms:', labIds)
        joinLabs(labIds)
        joinedLabIds.current = new Set(labIds)
      }
    }
  }, [labs, connected, joinLabs])

  // PRODUCTION: Process pending socket updates with debouncing
  const processPendingUpdates = useCallback(() => {
    if (pendingUpdates.current.length === 0) return
    
    setLabs(prevLabs => {
      let newLabs = [...prevLabs]
      
      pendingUpdates.current.forEach(update => {
        const existingIndex = newLabs.findIndex(l => l.id === update.labId)
        const existing = existingIndex >= 0 ? newLabs[existingIndex] : null
        
        // Ignore outdated events
        if (!isUpdateNewer(update.data, existing)) return
        
        switch (update.type) {
          case 'booking-created':
            if (existing) {
              newLabs[existingIndex] = {
                ...existing,
                is_booked: true,
                current_booking: update.data.booking,
                bookings: [...(existing.bookings || []), update.data.booking],
                updated_at: new Date().toISOString()
              }
            }
            break
            
          case 'booking-cancelled':
            if (existing) {
              const wasCurrentBooking = existing.current_booking?.id === update.data.bookingId
              newLabs[existingIndex] = {
                ...existing,
                is_booked: wasCurrentBooking ? false : existing.is_booked,
                current_booking: wasCurrentBooking ? null : existing.current_booking,
                bookings: (existing.bookings || []).filter(b => b.id !== update.data.bookingId),
                updated_at: new Date().toISOString()
              }
            }
            break
            
          case 'booking-updated':
            if (existing && update.data.booking) {
              newLabs[existingIndex] = {
                ...existing,
                current_booking: update.data.booking,
                bookings: (existing.bookings || []).map(b => 
                  b.id === update.data.booking.id ? { ...b, ...update.data.booking } : b
                ),
                updated_at: new Date().toISOString()
              }
            }
            break
            
          case 'room-status-update':
            if (existing) {
              newLabs[existingIndex] = {
                ...existing,
                is_booked: update.data.status === 'occupied',
                current_booking: update.data.current_booking || null,
                updated_at: update.data.timestamp || new Date().toISOString()
              }
            }
            break
        }
      })
      
      pendingUpdates.current = []
      return normalizeLabs(newLabs)
    })
  }, [])

  // Debounced update handler (150ms)
  const queueUpdate = useCallback((update) => {
    pendingUpdates.current.push(update)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => processPendingUpdates(), 150)
  }, [processPendingUpdates])

  // PRODUCTION: Full socket support with timestamp checking
  useEffect(() => {
    if (!socket || !connected) return

    const handleBookingCreated = (data) => {
      if (data.lab_id) {
        queueUpdate({ 
          type: 'booking-created', 
          labId: data.lab_id, 
          data: { booking: data.booking, timestamp: data.timestamp },
          receivedAt: Date.now()
        })
      }
    }

    const handleBookingCancelled = (data) => {
      if (data.lab_id || data.booking?.lab_id) {
        queueUpdate({ 
          type: 'booking-cancelled', 
          labId: data.lab_id || data.booking?.lab_id, 
          data: { bookingId: data.booking?.id || data.bookingId },
          receivedAt: Date.now()
        })
      }
    }

    const handleBookingUpdated = (data) => {
      if (data.lab_id) {
        queueUpdate({ 
          type: 'booking-updated', 
          labId: data.lab_id, 
          data: { booking: data.booking },
          receivedAt: Date.now()
        })
      }
    }

    const handleRoomStatusUpdate = (data) => {
      if (data.lab_id) {
        queueUpdate({ 
          type: 'room-status-update', 
          labId: data.lab_id, 
          data: { status: data.status, current_booking: data.current_booking, timestamp: data.timestamp },
          receivedAt: Date.now()
        })
      }
    }

    socket.on('booking-created', handleBookingCreated)
    socket.on('booking-cancelled', handleBookingCancelled)
    socket.on('booking-updated', handleBookingUpdated)
    socket.on('room-status-update', handleRoomStatusUpdate)

    return () => {
      socket.off('booking-created', handleBookingCreated)
      socket.off('booking-cancelled', handleBookingCancelled)
      socket.off('booking-updated', handleBookingUpdated)
      socket.off('room-status-update', handleRoomStatusUpdate)
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [socket, connected, queueUpdate])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [])

  // PRODUCTION: Optimistic update for user booking
  const optimisticBookLab = useCallback((labId, booking) => {
    setOptimisticUpdates(prev => ({ ...prev, [labId]: booking }))
    
    setLabs(prevLabs => {
      const index = prevLabs.findIndex(l => l.id === labId)
      if (index < 0) return prevLabs
      
      const updatedLab = {
        ...prevLabs[index],
        is_booked: true,
        current_booking: booking,
        bookings: [...(prevLabs[index].bookings || []), booking],
        _optimistic: true
      }
      
      return [...prevLabs.slice(0, index), updatedLab, ...prevLabs.slice(index + 1)]
    })
  }, [])

  // PRODUCTION: Revert optimistic update
  const revertOptimisticUpdate = useCallback((labId) => {
    setOptimisticUpdates(prev => {
      const { [labId]: _, ...rest } = prev
      return rest
    })
    fetchLabs()
  }, [fetchLabs])

  // PRODUCTION: Confirm optimistic update
  const confirmOptimisticUpdate = useCallback((labId) => {
    setOptimisticUpdates(prev => {
      const { [labId]: _, ...rest } = prev
      return rest
    })
    
    setLabs(prevLabs => {
      const index = prevLabs.findIndex(l => l.id === labId)
      if (index < 0) return prevLabs
      
      const { _optimistic, ...rest } = prevLabs[index]
      return [...prevLabs.slice(0, index), rest, ...prevLabs.slice(index + 1)]
    })
  }, [])

  // PRODUCTION: Labs with computed status (memoized)
  const labsWithStatus = useMemo(() => {
    return labs.map(lab => ({
      ...lab,
      status: optimisticUpdates[lab.id] ? 'occupied' : (lab._computedStatus || computeLabStatus(lab)),
      isOptimistic: !!optimisticUpdates[lab.id]
    }))
  }, [labs, optimisticUpdates])

  // PRODUCTION: Group labs by building (memoized)
  const labsByBuilding = useMemo(() => {
    const grouped = {}
    labsWithStatus.forEach(lab => {
      const building = lab.building || 'Unknown'
      if (!grouped[building]) grouped[building] = []
      grouped[building].push(lab)
    })
    return grouped
  }, [labsWithStatus])

  return {
    labs: labsWithStatus,
    labsByBuilding,
    loading,
    error,
    refetch: fetchLabs,
    // Optimistic update controls
    optimisticBookLab,
    revertOptimisticUpdate,
    confirmOptimisticUpdate,
    // Utilities
    computeLabStatus,
    isCurrentlyOccupied
  }
}