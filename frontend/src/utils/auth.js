/**
 * Auth Token Utilities
 * Centralized token management - no direct localStorage access elsewhere
 */

const ACCESS_TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'
const USER_ID_KEY = 'userId'

// PRODUCTION: Token management with validation
export const getAccessToken = () => {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  } catch (error) {
    console.error('Error reading access token:', error)
    return null
  }
}

export const getRefreshToken = () => {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  } catch (error) {
    console.error('Error reading refresh token:', error)
    return null
  }
}

export const getUserId = () => {
  try {
    return localStorage.getItem(USER_ID_KEY)
  } catch (error) {
    console.error('Error reading user ID:', error)
    return null
  }
}

// PRODUCTION: Set tokens atomically
export const setTokens = (accessToken, refreshToken, userId = null) => {
  try {
    if (accessToken) {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    }
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    }
    if (userId) {
      localStorage.setItem(USER_ID_KEY, userId.toString())
    }
    return true
  } catch (error) {
    console.error('Error setting tokens:', error)
    return false
  }
}

// PRODUCTION: Clear all auth data
export const clearTokens = () => {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_ID_KEY)
    return true
  } catch (error) {
    console.error('Error clearing tokens:', error)
    return false
  }
}

// PRODUCTION: Check if tokens exist
export const hasTokens = () => {
  return !!getAccessToken() && !!getRefreshToken()
}

// PRODUCTION: Parse JWT token (without verification - for client-side use only)
export const parseToken = (token) => {
  if (!token) return null
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (error) {
    console.error('Error parsing token:', error)
    return null
  }
}

// PRODUCTION: Check if token is expired
export const isTokenExpired = (token) => {
  const payload = parseToken(token)
  if (!payload || !payload.exp) return true
  return payload.exp * 1000 < Date.now()
}

// PRODUCTION: Get token expiration time
export const getTokenExpiration = (token) => {
  const payload = parseToken(token)
  if (!payload || !payload.exp) return null
  return new Date(payload.exp * 1000)
}

// PRODUCTION: Time until expiration in milliseconds
export const getTimeUntilExpiration = (token) => {
  const payload = parseToken(token)
  if (!payload || !payload.exp) return 0
  return Math.max(0, payload.exp * 1000 - Date.now())
}

// PRODUCTION: Token refresh scheduler
export const scheduleTokenRefresh = (callback, bufferSeconds = 60) => {
  const token = getAccessToken()
  if (!token) return null

  const timeUntilExpiry = getTimeUntilExpiration(token)
  const refreshTime = Math.max(0, timeUntilExpiry - bufferSeconds * 1000)

  if (refreshTime === 0) {
    // Token already expired or about to expire, refresh immediately
    callback()
    return null
  }

  return setTimeout(callback, refreshTime)
}
