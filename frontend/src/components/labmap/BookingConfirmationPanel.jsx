import React, { useState } from 'react'
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Thermometer, 
  DollarSign,
  Check,
  X,
  AlertCircle,
  ArrowLeft,
  Info,
  User,
  Mail,
  Building
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'

const BookingConfirmationPanel = ({ 
  lab, 
  bookingData, 
  onConfirm, 
  onCancel, 
  onBack,
  isSubmitting = false 
}) => {
  const { user } = useAuth()
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  // Calculate duration and cost
  const calculateDuration = () => {
    if (!bookingData.start_time || !bookingData.end_time) return 0
    
    const start = new Date(`2000-01-01T${bookingData.start_time}`)
    const end = new Date(`2000-01-01T${bookingData.end_time}`)
    const diffMs = end - start
    return diffMs / (1000 * 60 * 60) // Convert to hours
  }

  const calculateCost = () => {
    const duration = calculateDuration()
    const hourlyRate = lab?.hourly_charges || 0
    return duration * hourlyRate
  }

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour)
    return `${displayHour}:${minutes} ${ampm}`
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const duration = calculateDuration()
  const cost = calculateCost()

  const handleConfirm = () => {
    if (!agreedToTerms) {
      toast.error('Please agree to the terms and conditions')
      return
    }
    onConfirm()
  }

  if (!lab || !bookingData) {
    return (
      <div className="p-8 text-center">
        <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600">Booking information not available</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal to-teal-light text-white p-6 rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Confirm Your Booking</h2>
            <p className="text-teal-50">Please review your booking details before confirmation</p>
          </div>
          <button
            onClick={onBack}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-b-2xl shadow-xl p-6">
        {/* User Information */}
        <div className="mb-6 bg-blue-50 p-4 rounded-xl border border-blue-200">
          <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <User size={16} />
            Your Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <User size={14} className="text-blue-600" />
              <span className="text-blue-700">Name:</span>
              <span className="font-medium text-blue-900">{user?.name || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail size={14} className="text-blue-600" />
              <span className="text-blue-700">Email:</span>
              <span className="font-medium text-blue-900">{user?.email || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Building size={14} className="text-blue-600" />
              <span className="text-blue-700">Department:</span>
              <span className="font-medium text-blue-900">{user?.department || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-700">BC Number:</span>
              <span className="font-medium text-blue-900">{user?.bc_number || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Lab Information */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-ocean mb-4 flex items-center gap-2">
            <MapPin size={20} className="text-teal" />
            Lab Information
          </h3>
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-bold text-ocean text-lg mb-2">{lab.name}</h4>
                <p className="text-gray-600 mb-1">{lab.building}</p>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Users size={16} />
                    {lab.capacity} Seats
                  </span>
                  <span className="flex items-center gap-1">
                    <Thermometer size={16} />
                    {lab.is_ac ? 'AC' : 'No AC'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                {lab.hourly_charges > 0 && (
                  <>
                    <div className="text-sm text-gray-600 mb-2">Hourly Rate</div>
                    <div className="text-2xl font-bold text-teal">₹{lab.hourly_charges}</div>
                  </>
                )}
              </div>
            </div>
            {lab.facilities && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Facilities:</p>
                <p className="text-sm text-gray-800">{lab.facilities}</p>
              </div>
            )}
          </div>
        </div>

        {/* Booking Details */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-ocean mb-4 flex items-center gap-2">
            <Calendar size={20} className="text-teal" />
            Booking Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <Calendar size={16} />
                <span className="font-semibold">Date</span>
              </div>
              <p className="text-ocean font-medium">{formatDate(bookingData.booking_date)}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <Clock size={16} />
                <span className="font-semibold">Time</span>
              </div>
              <p className="text-ocean font-medium">
                {formatTime(bookingData.start_time)} - {formatTime(bookingData.end_time)}
              </p>
            </div>
          </div>
          
          {/* Duration and Cost */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="bg-purple-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-purple-600 mb-2">
                <Clock size={16} />
                <span className="font-semibold">Duration</span>
              </div>
              <p className="text-ocean font-medium">{duration.toFixed(1)} hours</p>
            </div>
            {cost > 0 && (
              <div className="bg-yellow-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-yellow-600 mb-2">
                  <DollarSign size={16} />
                  <span className="font-semibold">Total Cost</span>
                </div>
                <p className="text-ocean font-bold text-lg">₹{cost.toFixed(2)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Purpose */}
        {bookingData.purpose && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-ocean mb-4 flex items-center gap-2">
              <Info size={20} className="text-teal" />
              Purpose
            </h3>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-gray-800">{bookingData.purpose}</p>
            </div>
          </div>
        )}

        {/* Important Information */}
        <div className="mb-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-800 mb-2">Important Information</h4>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• Please arrive 10 minutes before your scheduled time</li>
                  <li>• Bring your ID card for verification</li>
                  <li>• Keep the lab clean and organized</li>
                  <li>• Report any issues to the lab administrator</li>
                  {cost > 0 && <li>• Payment must be made at the time of booking</li>}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Terms and Conditions */}
        <div className="mb-6">
          <div className="bg-gray-50 rounded-xl p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 w-4 h-4 text-teal border-gray-300 rounded focus:ring-teal"
              />
              <div className="text-sm text-gray-700">
                <span className="font-semibold">I agree to the terms and conditions</span>
                <p className="mt-1">
                  I understand that this booking is subject to lab availability and I will follow 
                  all lab rules and regulations. I also agree to pay any applicable charges.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting || !agreedToTerms}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-teal to-teal-light text-white rounded-xl font-semibold hover:from-teal/90 hover:to-teal-light/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Check size={20} />
                Confirm Booking
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default BookingConfirmationPanel
