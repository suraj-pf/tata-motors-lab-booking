import api from './axios'

export const labsApi = {
  getAll: (params) => api.get('/labs', { params }),
  getLabs: () => api.get('/labs'),
  getLabById: (id) => api.get(`/labs/${id}`),
  createLab: (labData) => api.post('/labs', labData),
  updateLab: (id, labData) => api.put(`/labs/${id}`, labData),
  deleteLab: (id) => api.delete(`/labs/${id}`),
  toggleStatus: (id) => api.patch(`/labs/${id}/toggle`),
  getLabAvailability: (id, date) => api.get(`/labs/${id}/availability?date=${date}`),
  getAvailability: (id, params) => api.get(`/labs/${id}/availability`, { params }),
  getStatistics: (params) => api.get('/labs/statistics', { params })
}

export const bookingsApi = {
  getUserBookings: (params) => api.get('/bookings', { params }),
  getById: (id) => api.get(`/bookings/${id}`),
  create: (data) => api.post('/bookings', data),
  update: (id, data) => api.patch(`/bookings/${id}`, data),
  cancel: (id) => api.delete(`/bookings/${id}`),
  checkAvailability: (params) => api.get('/bookings/check-availability', { params }),
  getUpcoming: () => api.get('/bookings/upcoming'),
  getHistory: (params) => api.get('/bookings/history', { params }),
  getTodayBookings: () => api.get('/bookings/today')
}