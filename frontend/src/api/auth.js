import api from './axios'

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  refresh: (refreshToken) => api.post('/auth/refresh', { refresh_token: refreshToken }),
  refreshToken: (data) => api.post('/auth/refresh', data),
  getProfile: () => api.get('/auth/profile'),
}