import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { initSocket } from '../config/socket'
import { useAuth } from './AuthContext'
import { getAccessToken } from '../utils/auth'
import toast from 'react-hot-toast'

const SocketContext = createContext()

export { SocketContext }

export const SocketProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth()
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const [notifications, setNotifications] = useState([])
  

  useEffect(() => {
    if (!isAuthenticated || !user) return

    const token = getAccessToken()
    const newSocket = initSocket(token, user.id, user.role)

    newSocket.on('connect', () => {
      setConnected(true)
      console.log('Socket connected')

      // Join user's personal room (also done automatically by backend)
      newSocket.emit('join-user-room', user.id)

      // Join admin room if user is admin (also done automatically by backend)
      if (user.role === 'admin') {
        newSocket.emit('join-admin-room')
      }
    })

    newSocket.on('booking-confirmed', (data) => {
      toast.success(`Booking confirmed for ${data.lab_name}`)
      setNotifications(prev => [data, ...prev.slice(0, 9)])
    })

    newSocket.on('booking-cancelled', (data) => {
      toast.error(`Booking cancelled: ${data.lab_name}`)
      setNotifications(prev => [data, ...prev.slice(0, 9)])
    })

    newSocket.on('booking-auto-approved', (data) => {
      toast.success(`Booking auto-approved for ${data.lab_name}`)
      setNotifications(prev => [data, ...prev.slice(0, 9)])
    })

    newSocket.on('lab-updated', (data) => {
      console.log('Lab updated:', data)
    })

    newSocket.on('admin-notification', (data) => {
      if (user.role === 'admin') {
        toast(data.message, { icon: '🔔' })
        setNotifications(prev => [data, ...prev.slice(0, 9)])
      }
    })

    newSocket.on('disconnect', () => {
      setConnected(false)
      console.log('Socket disconnected')
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [isAuthenticated, user])

  const emit = useCallback((event, data) => {
    if (socket && connected) {
      socket.emit(event, data)
    }
  }, [socket, connected])

  const joinLabRoom = useCallback((labId) => {
    if (socket && connected && labId) {
      console.log('Joining lab room:', labId)
      socket.emit('join-lab-room', labId)
    }
  }, [socket, connected])

  const leaveLabRoom = useCallback((labId) => {
    if (socket && connected && labId) {
      console.log('Leaving lab room:', labId)
      socket.emit('leave-lab-room', labId)
    }
  }, [socket, connected])

  const joinLabs = useCallback((labIds = []) => {
    if (socket && connected && labIds.length > 0) {
      console.log('Joining labs:', labIds)
      socket.emit('join-labs', labIds)
    }
  }, [socket, connected])

  const value = {
    socket,
    connected,
    notifications,
    emit,
    joinLabRoom,
    leaveLabRoom,
    joinLabs,
  }

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}