import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { 
  CheckCircle, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  ArrowLeft,
  List,
  Home
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const BookingSuccessPage = () => {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [booking, setBooking] = useState(location.state?.booking || null)
  const [labName] = useState(location.state?.labName || '')

  useEffect(() => {
    // If no booking data in state, we could fetch it by bookingId
    if (!booking && bookingId) {
      // Optionally fetch booking data if needed
      console.log('No booking data in state, bookingId:', bookingId)
    }
  }, [booking, bookingId])

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    return `${displayHour}:${minutes} ${ampm}`
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Booking information not found</p>
          <button
            onClick={() => navigate('/labmap')}
            className="px-6 py-2 bg-teal text-white rounded-lg hover:bg-teal/90 transition-colors"
          >
            Back to Lab Map
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
          <p className="text-gray-600">Your lab booking has been successfully created</p>
        </div>

        {/* Booking Details Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-teal to-teal-light p-6">
            <div className="flex items-center justify-between text-white">
              <div>
                <p className="text-sm opacity-90">Booking ID</p>
                <p className="text-2xl font-bold">#{booking.id}</p>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-90">Status</p>
                <p className="text-xl font-semibold">CONFIRMED</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Lab Information */}
            <div className="flex items-start gap-4">
              <div className="p-3 bg-teal/10 rounded-lg">
                <MapPin size={20} className="text-teal" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Lab Name</p>
                <p className="text-lg font-semibold text-gray-900">{labName || booking.lab_name}</p>
              </div>
            </div>

            {/* Date & Time */}
            <div className="flex items-start gap-4">
              <div className="p-3 bg-teal/10 rounded-lg">
                <Calendar size={20} className="text-teal" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Date</p>
                <p className="text-lg font-semibold text-gray-900">{formatDate(booking.booking_date)}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 bg-teal/10 rounded-lg">
                <Clock size={20} className="text-teal" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Time</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                </p>
                <p className="text-sm text-gray-500">Duration: {booking.duration_hours} hour(s)</p>
              </div>
            </div>

            {/* User Information */}
            <div className="flex items-start gap-4">
              <div className="p-3 bg-teal/10 rounded-lg">
                <User size={20} className="text-teal" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Booked By</p>
                <p className="text-lg font-semibold text-gray-900">{user?.name || 'User'}</p>
                <p className="text-sm text-gray-500">{user?.department || 'Department'}</p>
              </div>
            </div>

            {/* Purpose */}
            {booking.purpose && (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Purpose</p>
                <p className="text-gray-900">{booking.purpose}</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => navigate('/my-bookings')}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
          >
            <List size={20} />
            View My Bookings
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-teal to-teal-light text-white rounded-xl font-semibold hover:from-teal/90 hover:to-teal-light/90 transition-all"
          >
            <Home size={20} />
            Back to Dashboard
          </button>
        </div>

        {/* Additional Info */}
        <div className="mt-8 p-4 bg-amber-50 rounded-xl border border-amber-200">
          <p className="text-sm text-amber-800">
            <strong>Important:</strong> Please arrive on time for your booking. If you need to cancel, please do so at least 30 minutes before the scheduled time.
          </p>
        </div>
      </div>
    </div>
  )
}

export default BookingSuccessPage
