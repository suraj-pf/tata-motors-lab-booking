import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import api from '../api/axios'
import { useSocket } from './useSocket'
import toast from 'react-hot-toast'

// PRODUCTION: Normalize activity feed - deduplicate by ID
const deduplicateActivities = (activities) => {
  const seen = new Map()
  activities.forEach(activity => {
    const existing = seen.get(activity.id)
    if (!existing || new Date(activity.timestamp) > new Date(existing.timestamp)) {
      seen.set(activity.id, activity)
    }
  })
  return Array.from(seen.values())
}

// PRODUCTION: Sort activities by timestamp (newest first)
const sortActivitiesByTime = (activities) => {
  return [...activities].sort((a, b) => 
    new Date(b.timestamp) - new Date(a.timestamp)
  )
}

// PRODUCTION: Normalize activities with size limit
const normalizeActivities = (activities, maxSize = 100) => {
  const normalized = sortActivitiesByTime(deduplicateActivities(activities))
  return normalized.slice(0, maxSize)
}

// PRODUCTION: Compute stats from unified state
const computeStats = (bookings, labs, users) => {
  const now = new Date()
  
  // Active bookings: currently in progress
  const activeBookings = bookings.filter(b => {
    const start = new Date(`${b.booking_date}T${b.start_time}`)
    const end = new Date(`${b.booking_date}T${b.end_time}`)
    return b.status !== 'cancelled' && now >= start && now < end
  })
  
  // Today's bookings
  const today = now.toISOString().split('T')[0]
  const todayBookings = bookings.filter(b => 
    b.booking_date === today && b.status !== 'cancelled'
  )
  
  // Utilization: percentage of labs currently occupied
  const occupiedLabs = labs.filter(l => 
    l.status === 'occupied' || l._computedStatus === 'occupied'
  ).length
  const totalLabs = labs.length
  const utilization = totalLabs > 0 ? (occupiedLabs / totalLabs) * 100 : 0
  
  // User stats
  const activeUsers = users.filter(u => u.is_active !== false).length
  const totalUsers = users.length
  
  return {
    activeBookings: activeBookings.length,
    todayBookings: todayBookings.length,
    totalBookings: bookings.length,
    utilization: Math.round(utilization),
    occupiedLabs,
    totalLabs,
    activeUsers,
    totalUsers,
    pendingApprovals: bookings.filter(b => b.status === 'pending').length
  }
}

export const useDashboard = () => {
  // Unified state from system
  const [bookings, setBookings] = useState([])
  const [labs, setLabs] = useState([])
  const [users, setUsers] = useState([])
  const [activities, setActivities] = useState([])
  
  // System status
  const [systemStatus, setSystemStatus] = useState({
    api: 'unknown',
    socket: 'unknown',
    database: 'unknown',
    lastCheck: null
  })
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { socket, connected } = useSocket()
  
  // PRODUCTION: Debounce refs for socket events
  const debounceTimer = useRef(null)
  const pendingUpdates = useRef([])
  const lastFetchTime = useRef(0)

  // PRODUCTION: Fetch unified data with caching
  const fetchDashboardData = useCallback(async (force = false) => {
    // Cache for 30 seconds unless forced
    const now = Date.now()
    if (!force && now - lastFetchTime.current < 30000) {
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      
      const [bookingsRes, labsRes, usersRes, recentRes] = await Promise.all([
        api.get('/admin/bookings'),
        api.get('/labs'),
        api.get('/admin/users'),
        api.get('/admin/bookings/recent')
      ])
      
      setBookings(bookingsRes.data.bookings || [])
      setLabs(labsRes.data.labs || [])
      setUsers(usersRes.data.users || [])
      
      // Convert recent bookings to activities
      const recentBookings = recentRes.data.bookings || []
      const activitiesFromBookings = recentBookings.map(b => ({
        id: `booking-${b.id}`,
        type: 'booking',
        action: b.status === 'confirmed' ? 'created' : b.status,
        user: b.user_name || 'Unknown',
        lab: b.lab_name || 'Unknown Lab',
        timestamp: b.created_at || new Date().toISOString()
      }))
      setActivities(normalizeActivities(activitiesFromBookings))
      
      lastFetchTime.current = now
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Failed to load dashboard'
      setError(errorMessage)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initialize on mount
  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // PRODUCTION: System status checks
  useEffect(() => {
    const checkSystemStatus = async () => {
      const status = {
        api: 'unknown',
        socket: connected ? 'connected' : 'disconnected',
        database: 'unknown',
        lastCheck: new Date().toISOString()
      }
      
      // API ping check
      try {
        const start = Date.now()
        await api.get('/health')
        const latency = Date.now() - start
        status.api = latency < 1000 ? 'healthy' : 'slow'
      } catch {
        status.api = 'error'
      }
      
      // DB health (included in /health usually)
      status.database = status.api === 'healthy' ? 'healthy' : 'unknown'
      
      setSystemStatus(status)
    }
    
    checkSystemStatus()
    const interval = setInterval(checkSystemStatus, 30000) // Every 30 seconds
    
    return () => clearInterval(interval)
  }, [connected])

  // PRODUCTION: Process pending socket updates with debouncing
  const processPendingUpdates = useCallback(() => {
    if (pendingUpdates.current.length === 0) return
    
    pendingUpdates.current.forEach(update => {
      switch (update.type) {
        case 'booking-created':
          setBookings(prev => {
            const exists = prev.some(b => b.id === update.data.id)
            if (exists) return prev
            return [...prev, update.data]
          })
          addActivity({
            id: `booking-${update.data.id}`,
            type: 'booking',
            action: 'created',
            user: update.data.user_name,
            lab: update.data.lab_name,
            timestamp: update.data.created_at || new Date().toISOString(),
            details: update.data
          })
          break
          
        case 'booking-updated':
          setBookings(prev => prev.map(b => 
            b.id === update.data.id ? { ...b, ...update.data } : b
          ))
          addActivity({
            id: `booking-update-${update.data.id}-${Date.now()}`,
            type: 'booking',
            action: 'updated',
            user: update.data.user_name,
            lab: update.data.lab_name,
            timestamp: new Date().toISOString(),
            details: update.data
          })
          break
          
        case 'booking-cancelled':
          setBookings(prev => prev.map(b => 
            b.id === update.data.id ? { ...b, status: 'cancelled' } : b
          ))
          addActivity({
            id: `booking-cancel-${update.data.id}`,
            type: 'booking',
            action: 'cancelled',
            user: update.data.user_name,
            lab: update.data.lab_name,
            timestamp: new Date().toISOString(),
            details: update.data
          })
          break
          
        case 'user-created':
          setUsers(prev => {
            const exists = prev.some(u => u.id === update.data.id)
            if (exists) return prev
            return [...prev, update.data]
          })
          addActivity({
            id: `user-${update.data.id}`,
            type: 'user',
            action: 'created',
            user: update.data.name || update.data.email,
            timestamp: update.data.created_at || new Date().toISOString(),
            details: update.data
          })
          break
          
        case 'user-updated':
          setUsers(prev => prev.map(u => 
            u.id === update.data.id ? { ...u, ...update.data } : u
          ))
          addActivity({
            id: `user-update-${update.data.id}-${Date.now()}`,
            type: 'user',
            action: 'updated',
            user: update.data.name || update.data.email,
            timestamp: new Date().toISOString(),
            details: update.data
          })
          break
          
        case 'user-deleted':
          setUsers(prev => prev.filter(u => u.id !== update.data.id))
          addActivity({
            id: `user-delete-${update.data.id}`,
            type: 'user',
            action: 'deleted',
            user: update.data.name || update.data.email,
            timestamp: new Date().toISOString(),
            details: update.data
          })
          break
          
        case 'lab-updated':
          setLabs(prev => prev.map(l => 
            l.id === update.data.id ? { ...l, ...update.data } : l
          ))
          addActivity({
            id: `lab-update-${update.data.id}-${Date.now()}`,
            type: 'lab',
            action: 'updated',
            lab: update.data.name,
            timestamp: new Date().toISOString(),
            details: update.data
          })
          break
      }
    })
    
    pendingUpdates.current = []
  }, [])

  // Helper to add activity
  const addActivity = useCallback((activity) => {
    setActivities(prev => normalizeActivities([activity, ...prev]))
  }, [])

  // Debounced update handler (150ms)
  const queueUpdate = useCallback((update) => {
    pendingUpdates.current.push(update)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => processPendingUpdates(), 150)
  }, [processPendingUpdates])

  // PRODUCTION: Full socket support
  useEffect(() => {
    if (!socket || !connected) return

    const handleBookingCreated = (data) => {
      queueUpdate({ type: 'booking-created', data: data.booking })
    }

    const handleBookingUpdated = (data) => {
      queueUpdate({ type: 'booking-updated', data: data.booking })
    }

    const handleBookingCancelled = (data) => {
      queueUpdate({ type: 'booking-cancelled', data: data.booking || { id: data.bookingId } })
    }

    const handleUserCreated = (data) => {
      queueUpdate({ type: 'user-created', data: data.user })
    }

    const handleUserUpdated = (data) => {
      queueUpdate({ type: 'user-updated', data: data.user })
    }

    const handleUserDeleted = (data) => {
      queueUpdate({ type: 'user-deleted', data: data.user || { id: data.userId } })
    }

    const handleLabUpdated = (data) => {
      queueUpdate({ type: 'lab-updated', data: data.lab })
    }

    socket.on('booking-created', handleBookingCreated)
    socket.on('booking-updated', handleBookingUpdated)
    socket.on('booking-cancelled', handleBookingCancelled)
    socket.on('user-created', handleUserCreated)
    socket.on('user-updated', handleUserUpdated)
    socket.on('user-deleted', handleUserDeleted)
    socket.on('lab-updated', handleLabUpdated)

    return () => {
      socket.off('booking-created', handleBookingCreated)
      socket.off('booking-updated', handleBookingUpdated)
      socket.off('booking-cancelled', handleBookingCancelled)
      socket.off('user-created', handleUserCreated)
      socket.off('user-updated', handleUserUpdated)
      socket.off('user-deleted', handleUserDeleted)
      socket.off('lab-updated', handleLabUpdated)
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [socket, connected, queueUpdate])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [])

  // PRODUCTION: Memoized derived stats
  const stats = useMemo(() => 
    computeStats(bookings, labs, users),
    [bookings, labs, users]
  )

  // PRODUCTION: Memoized activities
  const normalizedActivities = useMemo(() => 
    normalizeActivities(activities),
    [activities]
  )

  return {
    // Unified state
    bookings,
    labs,
    users,
    activities: normalizedActivities,
    // Derived stats
    stats,
    // System status
    systemStatus,
    // Loading states
    loading,
    error,
    // Actions
    refetch: () => fetchDashboardData(true),
    // Utilities
    addActivity
  }
}
