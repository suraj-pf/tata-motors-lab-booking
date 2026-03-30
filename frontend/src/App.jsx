import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Header from './components/common/Header'
import LoadingSpinner from './components/common/LoadingSpinner'
import PrivateRoute from './components/common/PrivateRoute'
import ErrorBoundary from './components/common/ErrorBoundary'
import './App.css'

// Lazy load pages for better performance
const Login = lazy(() => import('./pages/Login'))
const Labs = lazy(() => import('./pages/Labs'))
const Bookings = lazy(() => import('./pages/Bookings'))
const MyBookings = lazy(() => import('./pages/MyBookings'))
const BookingCreate = lazy(() => import('./pages/BookingCreate'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const ProfessionalDashboard = lazy(() => import('./pages/ProfessionalDashboard'))
const Admin = lazy(() => import('./pages/Admin'))
const LabMap = lazy(() => import('./pages/LabMap'))
const BookingSuccessPage = lazy(() => import('./pages/BookingSuccessPage'))
const Timeline = lazy(() => import('./pages/Timeline'))

function App() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner fullScreen message="Initializing Tata Motors Lab System..." />
  }

  return (
    <div className="min-h-screen flex flex-col">
      {isAuthenticated && <Header />}
      <main className="flex-1">
        <ErrorBoundary>
          <Suspense fallback={<LoadingSpinner fullScreen message="Loading page..." />}>
            <Routes>
              <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/labs" />} />
              
              <Route element={<PrivateRoute />}>
                <Route path="/labs" element={<Labs />} />
                <Route path="/bookings" element={<Bookings />} />
                <Route path="/my-bookings" element={<MyBookings />} />
                <Route path="/book/:labId" element={<BookingCreate />} />
                <Route path="/labmap" element={<LabMap />} />
                <Route path="/timeline" element={<Timeline />} />
                <Route path="/booking-success/:bookingId" element={<BookingSuccessPage />} />
              </Route>
              
              <Route element={<PrivateRoute requiredRole="admin" />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/professional-dashboard" element={<ProfessionalDashboard />} />
                <Route path="/admin" element={<Admin />} />
              </Route>
              
              <Route path="/" element={<Navigate to={isAuthenticated ? "/labs" : "/login"} />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  )
}

export default App