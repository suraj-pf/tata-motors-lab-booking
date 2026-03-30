import { io } from 'socket.io-client'

let socket = null

export const initSocket = (token, userId = null, userRole = null) => {
  if (socket) {
    socket.close()
  }

  socket = io(import.meta.env.VITE_SOCKET_URL || '', {
    auth: { token },
    query: { userId, role: userRole },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  })

  return socket
}

export const getSocket = () => socket

export const closeSocket = () => {
  if (socket) {
    socket.close()
    socket = null
  }
}