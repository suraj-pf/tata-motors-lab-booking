import { useState, useEffect, useCallback } from 'react'
import { labsApi } from '../api/labs'
import { useSocket } from './useSocket'

export const useLiveRoomData = () => {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const { socket, connected, joinLabs } = useSocket()

  const formatDate = (date) => {
    if (!date) return new Date().toISOString().split('T')[0]
    return new Date(date).toISOString().split('T')[0]
  }

  // Transform lab data to room format with real-time status
  const transformLabToRoom = (lab, bookings = []) => {
    const currentBooking = lab.current_booking || null
    const nextBooking = lab.next_booking || null

    // Use real-time status from backend, fallback to computed status
    let status = lab.real_time_status || 'available'
    
    // Fallback logic if real_time_status not available
    if (!lab.real_time_status) {
      if (!lab.is_active) status = 'restricted'
      else if (lab.is_booked || currentBooking) status = 'occupied'
      else if (lab.is_reserved_today) status = 'booked'
    }

    return {
      id: lab.id,
      name: lab.name,
      building: lab.building,
      seats: lab.capacity,
      isAc: lab.is_ac,
      facilities: lab.facilities ? (Array.isArray(lab.facilities) ? lab.facilities : lab.facilities.split(',').map(f => f.trim())) : [],
      owner: lab.lab_owner,
      hourlyRate: parseFloat(lab.hourly_charges) || 0,
      status,
      currentBooking,
      nextBooking,
      is_active: lab.is_active,
      has_availability_today: lab.has_availability_today,
      today_bookings: lab.today_bookings,
      is_booked: lab.is_booked || false,
      is_reserved_today: lab.is_reserved_today || false,
      current_time: lab.current_time,
      target_date: lab.target_date,
      selected_date: lab.selected_date || formatDate(selectedDate)
    }
  }

  // Fetch rooms data
  const fetchRooms = useCallback(async (date = selectedDate) => {
    try {
      setLoading(true)
      setError(null)

      const timestamp = new Date().getTime()
      const queryDate = formatDate(date)
      console.log('Fetching rooms with timestamp:', timestamp, 'date:', queryDate)
      const labsResponse = await labsApi.getAll({ _t: timestamp, date: queryDate })
      
      console.log('API response:', labsResponse.data)
      
      const labs = labsResponse.data.labs || []
      console.log('Labs fetched:', labs.length)

      // Transform labs to room format
      const transformedRooms = labs.map(lab => transformLabToRoom(lab, []))
      console.log('Transformed rooms:', transformedRooms.length)

      setRooms(transformedRooms)
      return transformedRooms
    } catch (err) {
      console.error('Failed to fetch rooms:', err)
      console.error('Error response:', err.response?.data)
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to load room data'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  // Refresh rooms data
  const refreshRooms = useCallback(async (date = selectedDate) => {
    console.log('Refreshing rooms data...', date)
    try {
      setSelectedDate(formatDate(date))
      return await fetchRooms(date)
    } catch (error) {
      console.error('Refresh failed:', error)
    }
  }, [fetchRooms, selectedDate])

  // Update single room status
  const updateRoomStatus = useCallback((roomId, updates) => {
    setRooms(prev => prev.map(room => 
      room.id === roomId ? { ...room, ...updates } : room
    ))
  }, [])

  // Get room by ID
  const getRoomById = useCallback((roomId) => {
    return rooms.find(room => room.id === roomId)
  }, [rooms])

  // Get rooms by status
  const getRoomsByStatus = useCallback((status) => {
    return rooms.filter(room => room.status === status)
  }, [rooms])

  // Get rooms by building
  const getRoomsByBuilding = useCallback((building) => {
    return rooms.filter(room => room.building === building)
  }, [rooms])

  // Initial/selected-date fetch
  useEffect(() => {
    fetchRooms(selectedDate)
  }, [fetchRooms, selectedDate])

  // Join lab rooms when rooms are loaded and socket is connected
  useEffect(() => {
    if (rooms.length > 0 && connected && joinLabs) {
      const labIds = rooms.map(room => room.id)
      console.log('Joining lab rooms for live data:', labIds)
      joinLabs(labIds)
    }
  }, [rooms, connected, joinLabs])

  // Real-time updates via socket
  useEffect(() => {
    if (!socket || !connected) return

    const resolveLabId = (data) => data.lab_id || data.labId || data.id

    const handleBookingCreated = (data) => {
      console.log('LiveRoomData: Received booking-created event:', data)
      const labId = resolveLabId(data)
      setRooms(prev => prev.map(room => 
        room.id === labId
          ? { 
              ...room, 
              status: 'occupied', 
              is_booked: true, 
              currentBooking: data.booking || data,
              today_bookings: room.today_bookings + 1
            }
          : room
      ))
    }

    const handleBookingCancelled = (data) => {
      console.log('LiveRoomData: Received booking-cancelled event:', data)
      const labId = resolveLabId(data)
      setRooms(prev => prev.map(room => 
        room.id === labId
          ? { 
              ...room, 
              status: 'available', 
              is_booked: false, 
              currentBooking: null,
              today_bookings: Math.max(0, room.today_bookings - 1)
            }
          : room
      ))
    }

    const handleRoomStatusUpdate = (data) => {
      console.log('LiveRoomData: Received room-status-update event:', data)
      const labId = resolveLabId(data)
      const status = data.status || (data.is_booked ? 'occupied' : data.is_active ? 'available' : 'restricted')
      setRooms(prev => prev.map(room => 
        room.id === labId
          ? { 
              ...room, 
              status,
              is_booked: status === 'occupied',
              currentBooking: status === 'available' ? null : room.currentBooking,
              real_time_status: status
            }
          : room
      ))
    }

    socket.on('booking-created', handleBookingCreated)
    socket.on('booking-cancelled', handleBookingCancelled)
    socket.on('room-status-update', handleRoomStatusUpdate)

    return () => {
      socket.off('booking-created', handleBookingCreated)
      socket.off('booking-cancelled', handleBookingCancelled)
      socket.off('room-status-update', handleRoomStatusUpdate)
    }
  }, [socket, connected])

  return {
    rooms,
    loading,
    error,
    selectedDate,
    setSelectedDate,
    refreshRooms,
    updateRoomStatus,
    getRoomById,
    getRoomsByStatus,
    getRoomsByBuilding
  }
}