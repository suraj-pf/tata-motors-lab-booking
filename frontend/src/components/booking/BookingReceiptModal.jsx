import React from 'react'
import { CheckCircle, Clock, Calendar, MapPin, Users, FileText, X, ArrowRight, LayoutGrid, List } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { formatTimeIST, formatDateIST } from '../../utils/time'

const BookingReceiptModal = ({ isOpen, booking, onClose }) => {
  const navigate = useNavigate()

  if (!isOpen || !booking) return null

  const handleViewTimeline = () => {
    navigate(`/timeline?date=${booking.booking_date}&highlight=${booking.id}`)
    onClose()
  }

  const handleViewMyBookings = () => {
    navigate('/my-bookings')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
        {/* Success Header */}
        <div className="bg-green-500 p-6 text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-white">Booking Confirmed!</h2>
          <p className="text-green-100 mt-1">Your lab has been successfully reserved</p>
        </div>

        {/* Booking Details */}
        <div className="p-6">
          <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-3">
            {/* Lab Name */}
            <div className="flex items-center gap-3">
              <MapPin size={18} className="text-blue-500" />
              <div>
                <p className="text-xs text-gray-500">Lab</p>
                <p className="font-semibold text-gray-900">{booking.lab_name}</p>
                {booking.building && (
                  <p className="text-xs text-gray-500">{booking.building}</p>
                )}
              </div>
            </div>

            {/* Date */}
            <div className="flex items-center gap-3">
              <Calendar size={18} className="text-blue-500" />
              <div>
                <p className="text-xs text-gray-500">Date</p>
                <p className="font-semibold text-gray-900">
                  {formatDateIST(booking.booking_date)}
                </p>
              </div>
            </div>

            {/* Time */}
            <div className="flex items-center gap-3">
              <Clock size={18} className="text-blue-500" />
              <div>
                <p className="text-xs text-gray-500">Time</p>
                <p className="font-semibold text-gray-900">
                  {formatTimeIST(booking.start_time)} - {formatTimeIST(booking.end_time)}
                </p>
                {booking.duration_hours && (
                  <p className="text-xs text-gray-500">{booking.duration_hours} hours</p>
                )}
              </div>
            </div>

            {/* Purpose */}
            {booking.purpose && (
              <div className="flex items-start gap-3">
                <FileText size={18} className="text-blue-500 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Purpose</p>
                  <p className="font-semibold text-gray-900">{booking.purpose}</p>
                </div>
              </div>
            )}
          </div>

          {/* Reference Info */}
          <div className="text-center mb-6">
            <p className="text-xs text-gray-500">Booking Reference</p>
            <p className="text-lg font-mono font-semibold text-gray-700">
              #{String(booking.id).padStart(6, '0')}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleViewTimeline}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              <LayoutGrid size={18} />
              View Timeline
            </button>
            <button
              onClick={handleViewMyBookings}
              className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              <List size={18} />
              Go to My Bookings
            </button>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full mt-3 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default BookingReceiptModal
