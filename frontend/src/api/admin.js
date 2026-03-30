import api from './axios'

export const adminApi = {
  getAnalytics: (params) => api.get('/admin/analytics', { params }),
  getFullAnalytics: () => api.get('/analytics/full'),
  getRealtimeMetrics: () => api.get('/analytics/realtime'),
  getAllBookings: (params) => api.get('/admin/bookings', { params }),
  updateBookingStatus: (id, statusData) => api.patch(`/admin/bookings/${id}`, statusData),
  autoCompleteExpiredBookings: () => api.post('/admin/bookings/auto-complete'),
  getUsers: (params) => api.get('/admin/users', { params }),
  createUser: (userData) => api.post('/admin/users', userData),
  updateUser: (id, userData) => api.put(`/admin/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  toggleUserStatus: (id) => api.patch(`/admin/users/${id}/toggle`),
  getAllLabs: (params) => api.get('/admin/labs', { params }),
  createLab: (labData) => api.post('/admin/labs', labData),
  updateLab: (id, labData) => api.put(`/admin/labs/${id}`, labData),
  deleteLab: (id) => api.delete(`/admin/labs/${id}`),
  toggleLabStatus: (id) => api.patch(`/admin/labs/${id}/toggle`),
  getPendingBookings: (params) => api.get('/admin/bookings/pending', { params }),
  approveBooking: (id, data) => api.patch(`/admin/bookings/${id}/approve`, data),
  cancelBooking: (id) => api.delete(`/admin/bookings/${id}`)
}