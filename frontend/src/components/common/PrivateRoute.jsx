import React, { useEffect, useRef } from 'react'
import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import LoadingSpinner from './LoadingSpinner'

// PRODUCTION: Protected Route with role-based access
const ProtectedRoute = ({ requiredRole }) => {
  const { isAuthenticated, loading, user } = useAuth()
  const navigate = useNavigate()

  if (loading) {
    return <LoadingSpinner fullScreen message="Verifying authentication..." />
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Role check for admin pages
  if (requiredRole && user?.role !== requiredRole) {
    // Redirect non-admins away from admin pages
    return <Navigate to="/labs" replace />
  }

  return <Outlet />
}

export default ProtectedRoute