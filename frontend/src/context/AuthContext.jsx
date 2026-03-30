import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import { 
  getAccessToken, 
  getRefreshToken, 
  setTokens, 
  clearTokens,
  isTokenExpired,
  scheduleTokenRefresh,
  parseToken
} from '../utils/auth'
import { setAuthErrorHandler } from '../api/axios'
import toast from 'react-hot-toast'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const refreshTimerRef = useRef(null)

  // PRODUCTION: Multi-tab synchronization
  useEffect(() => {
    const handleStorageChange = (e) => {
      // If access_token was removed in another tab, logout this tab
      if (e.key === 'access_token' && !e.newValue) {
        console.log('[Auth] Token removed in another tab, logging out')
        setUser(null)
        setIsAuthenticated(false)
        if (refreshTimerRef.current) {
          clearTimeout(refreshTimerRef.current)
        }
        navigate('/login', { replace: true })
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [navigate])

  // PRODUCTION: Handle auth errors from axios interceptor
  const handleAuthError = useCallback(() => {
    clearTokens()
    setUser(null)
    setIsAuthenticated(false)
    toast.error('Session expired. Please login again.')
    navigate('/login')
  }, [navigate])

  // Register auth error handler with axios
  useEffect(() => {
    setAuthErrorHandler(handleAuthError)
  }, [handleAuthError])

  // PRODUCTION: Schedule proactive token refresh
  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
    }
    
    const token = getAccessToken()
    if (!token || isTokenExpired(token)) return

    // Refresh 2 minutes before expiration
    refreshTimerRef.current = scheduleTokenRefresh(async () => {
      try {
        const refreshToken = getRefreshToken()
        if (!refreshToken) {
          handleAuthError()
          return
        }

        const response = await authApi.refreshToken({ refresh_token: refreshToken })
        const { access_token, refresh_token } = response.data
        
        setTokens(access_token, refresh_token)
        
        // Reschedule next refresh
        scheduleRefresh()
      } catch (error) {
        console.error('Proactive token refresh failed:', error)
        handleAuthError()
      }
    }, 120)
  }, [handleAuthError])

  // Initialize auth state on mount - ONLY ONCE
  useEffect(() => {
    const initAuth = async () => {
      console.log('[Auth] Initializing auth state...')
      let is401Error = false
      try {
        const token = getAccessToken()
        const refreshToken = getRefreshToken()
        
        console.log('[Auth] Token exists:', !!token, 'Refresh exists:', !!refreshToken)
        
        if (!token && !refreshToken) {
          console.log('[Auth] No tokens found, staying logged out')
          setLoading(false)
          return
        }
        
        // Try to fetch profile - axios interceptor will handle 401/refresh automatically
        console.log('[Auth] Fetching profile...')
        const response = await authApi.getProfile()
        
        if (response.data?.success && response.data.user) {
          console.log('[Auth] Profile loaded for:', response.data.user.username)
          setUser(response.data.user)
          setIsAuthenticated(true)
          // Update tokens with user ID
          const currentToken = getAccessToken()
          const currentRefresh = getRefreshToken()
          if (currentToken && currentRefresh) {
            setTokens(currentToken, currentRefresh, response.data.user.id)
          }
          scheduleRefresh()
        } else {
          console.log('[Auth] Invalid profile response')
          clearTokens()
        }
      } catch (error) {
        // Don't clear tokens on 401 - let axios interceptor handle refresh
        if (error.response?.status === 401) {
          is401Error = true
          console.log('[Auth] 401 on init - interceptor should handle refresh')
          // Wait a bit for interceptor to potentially succeed
          setTimeout(() => {
            const token = getAccessToken()
            if (!token) {
              console.log('[Auth] No token after 401, clearing')
              setUser(null)
              setIsAuthenticated(false)
            } else {
              // Interceptor succeeded, try to get user from token
              const payload = parseToken(token)
              if (payload) {
                setUser({ id: payload.id, username: payload.username, role: payload.role })
                setIsAuthenticated(true)
                scheduleRefresh()
              }
            }
            setLoading(false)
          }, 500)
          return
        }
        
        console.error('[Auth] Init error:', error.message)
        clearTokens()
        setUser(null)
        setIsAuthenticated(false)
      } finally {
        // Only set loading false if not handled by 401 timeout
        if (!is401Error) {
          setLoading(false)
        }
        console.log('[Auth] Init complete')
      }
    }

    initAuth()
    
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run ONLY ONCE on mount

  // PRODUCTION: Login with token management
  const login = useCallback(async (credentials) => {
    try {
      const response = await authApi.login(credentials)
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Login failed')
      }

      const { access_token, refresh_token, user: userData } = response.data

      setTokens(access_token, refresh_token, userData.id)
      
      setUser(userData)
      setIsAuthenticated(true)
      
      // Schedule proactive refresh
      scheduleRefresh()
      
      toast.success(`Welcome back, ${userData.name}!`)
      return { success: true, user: userData }
    } catch (error) {
      const message = error.response?.data?.error || error.message || 'Login failed'
      toast.error(message)
      throw new Error(message)
    }
  }, [scheduleRefresh])

  // Signup (no login after signup)
  const signup = useCallback(async (userData) => {
    try {
      const response = await authApi.register(userData)
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Registration failed')
      }

      toast.success('Account created successfully! Please login to continue.')
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.error || error.message || 'Registration failed'
      toast.error(message)
      throw new Error(message)
    }
  }, [])

  // PRODUCTION: Improved logout with context and navigation
  const logout = useCallback(async () => {
    // Clear scheduled refresh
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
    
    // Note: Socket disconnect is handled by SocketContext when isAuthenticated changes
    
    // Clear all auth data
    clearTokens()
    setUser(null)
    setIsAuthenticated(false)
    
    toast.success('Logged out successfully')
    
    // Navigate to login using React Router
    navigate('/login', { replace: true })
  }, [navigate])

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    signup,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}