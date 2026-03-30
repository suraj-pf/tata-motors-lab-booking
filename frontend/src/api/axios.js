import axios from 'axios'
import { 
  getAccessToken, 
  getRefreshToken, 
  setTokens, 
  clearTokens,
  isTokenExpired 
} from '../utils/auth'

// PRODUCTION: Create axios instance with configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// PRODUCTION: Global auth state for handling logout
let onAuthError = null

export const setAuthErrorHandler = (handler) => {
  onAuthError = handler
}

// PRODUCTION: Refresh token queue
let isRefreshing = false
let refreshSubscribers = []

const subscribeTokenRefresh = (callback) => {
  refreshSubscribers.push(callback)
}

const onTokenRefreshed = (newToken) => {
  refreshSubscribers.forEach(callback => callback(newToken))
  refreshSubscribers = []
}

// PRODUCTION: Request interceptor - attach Authorization header
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken()
    
    // Skip auth header for auth endpoints
    const isAuthEndpoint = config.url?.includes('/auth/') && !config.url?.includes('/auth/me')
    
    if (token && !isAuthEndpoint) {
      // Always attach token - let backend validate
      // Response interceptor will handle 401 refresh
      config.headers.Authorization = `Bearer ${token}`
      console.log('[API] Attaching auth token to:', config.url)
    } else if (!token && !isAuthEndpoint) {
      console.warn('[API] No token available for:', config.url)
    }
    
    return config
  },
  (error) => Promise.reject(error)
)

// PRODUCTION: Response interceptor - handle 401 with refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // If no response or not 401, reject immediately
    if (!error.response || error.response.status !== 401) {
      return Promise.reject(error)
    }

    console.log('[API] 401 received for:', originalRequest.url)

    // Prevent infinite loops - if we already retried, reject
    if (originalRequest._retry) {
      console.error('[API] Already retried, logging out')
      clearTokens()
      if (onAuthError) {
        onAuthError()
      }
      return Promise.reject(error)
    }

    // Skip retry for auth endpoints (login, register, refresh)
    if (originalRequest.url?.includes('/auth/')) {
      console.log('[API] Auth endpoint 401, not retrying')
      return Promise.reject(error)
    }

    originalRequest._retry = true
    console.log('[API] Attempting token refresh...')

    // PRODUCTION: Token refresh with queue
    if (!isRefreshing) {
      isRefreshing = true

      try {
        const refreshToken = getRefreshToken()
        
        if (!refreshToken) {
          throw new Error('No refresh token available')
        }

        console.log('[API] Calling refresh endpoint...')

        // Call refresh endpoint - use base URL without additional /api since env var includes it
        const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
        const response = await axios.post(
          `${baseURL}/auth/refresh`,
          { refresh_token: refreshToken },
          { 
            withCredentials: true,
            headers: { 'Content-Type': 'application/json' }
          }
        )

        const { access_token, refresh_token } = response.data
        console.log('[API] Token refresh successful')

        // Store new tokens
        setTokens(access_token, refresh_token)

        // Notify subscribers
        onTokenRefreshed(access_token)

        isRefreshing = false

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${access_token}`
        return api(originalRequest)

      } catch (refreshError) {
        isRefreshing = false
        refreshSubscribers = []

        // Refresh failed - clear tokens and logout
        console.error('[API] Token refresh failed:', refreshError.message)
        clearTokens()
        
        if (onAuthError) {
          onAuthError()
        }

        return Promise.reject(refreshError)
      }
    }

    // PRODUCTION: If already refreshing, queue the request
    return new Promise((resolve) => {
      subscribeTokenRefresh((newToken) => {
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        resolve(api(originalRequest))
      })
    })
  }
)

// PRODUCTION: Manual token refresh for proactive refreshing
export const refreshAccessToken = async () => {
  try {
    const refreshToken = getRefreshToken()
    
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
    const response = await axios.post(
      `${baseURL}/auth/refresh`,
      { refresh_token: refreshToken },
      { 
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' }
      }
    )

    const { access_token, refresh_token } = response.data
    setTokens(access_token, refresh_token)
    
    return { success: true, accessToken: access_token }
  } catch (error) {
    console.error('Manual token refresh failed:', error)
    clearTokens()
    return { success: false, error: error.message }
  }
}

// PRODUCTION: Check if request should skip auth
export const shouldSkipAuth = (url) => {
  const skipUrls = [
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
  ]
  return skipUrls.some(skipUrl => url?.includes(skipUrl))
}

export default api