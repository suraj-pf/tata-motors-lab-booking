import api from './axios'

export const bookingsApi = {
  getUserBookings: (params) => api.get('/bookings', { params }),
  getById: (id) => api.get(`/bookings/${id}`),
  create: (data) => api.post('/bookings', data),
  update: (id, data) => api.patch(`/bookings/${id}`, data), // Use PATCH for updates
  cancel: (id) => api.delete(`/bookings/${id}`),
  checkAvailability: (params) => api.get('/bookings/check-availability', { params }),
  getUpcoming: () => api.get('/bookings/upcoming'),
  getHistory: (params) => api.get('/bookings/history', { params }),
  getTodayBookings: () => api.get('/bookings/today')
}