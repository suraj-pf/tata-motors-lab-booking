import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useBookingValidation } from '../../hooks/useBookingValidation'
import { labsApi } from '../../api/labs'
import { bookingsApi } from '../../api/bookings'
import { 
  X, 
  Calendar, 
  Clock, 
  Check,
  AlertCircle,
  Loader2,
  Users,
  Thermometer,
  DollarSign,
  MapPin,
  Info,
  ArrowLeft
} from 'lucide-react'
import toast from 'react-hot-toast'
import BookingConfirmationPanel from './BookingConfirmationPanel'
import ConflictResolutionDialog from '../booking/ConflictResolutionDialog'
import { useNavigate } from 'react-router-dom'

const STEPS = {
  DETAILS: 'details',
  CONFIRMATION: 'confirmation'
}

const EnhancedBookingDialog = ({ 
  roomId, 
  isOpen, 
  onClose, 
  onBookingSuccess,
  existingBookings = []
}) => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { 
    validating, 
    validationResult,
    validateBooking,
    createValidatedBooking,
    getAvailableTimeSlots,
    getAvailableEndTimes,
    minBookingDate,
    formatTime,
    clearValidation
  } = useBookingValidation()

  const [currentStep, setCurrentStep] = useState(STEPS.DETAILS)
  const [selectedLab, setSelectedLab] = useState(null)
  const [loadingLab, setLoadingLab] = useState(false)
  const [showConflictDialog, setShowConflictDialog] = useState(false)
  const [conflictData, setConflictData] = useState(null)
  const [formData, setFormData] = useState({
    booking_date: minBookingDate,
    start_time: '',
    end_time: '',
    purpose: ''
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Pre-fill user data when component mounts
  useEffect(() => {
    if (user && isOpen) {
      setFormData(prev => ({
        ...prev,
        // Auto-fill user information
        user_name: user.name,
        user_email: user.email,
        user_department: user.department,
        bc_number: user.bc_number
      }))
    }
  }, [user, isOpen])

  // Fetch lab data when dialog opens
  useEffect(() => {
    if (isOpen && roomId) {
      fetchLabData()
    }
  }, [isOpen, roomId])

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(STEPS.DETAILS)
      setFormData({
        booking_date: minBookingDate,
        start_time: '',
        end_time: '',
        purpose: ''
      })
      setErrors({})
      clearValidation()
    } else {
      setSelectedLab(null)
    }
  }, [isOpen, minBookingDate, clearValidation])

  // Fetch lab data from API
  const fetchLabData = async () => {
    setLoadingLab(true)
    try {
      const response = await labsApi.getLabById(roomId)
      setSelectedLab(response.data.lab)
    } catch (error) {
      toast.error('Failed to load lab information')
      onClose()
    } finally {
      setLoadingLab(false)
    }
  }

  // Handle form changes
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setErrors(prev => ({ ...prev, [name]: '' }))
    clearValidation()

    // Clear end time if start time changes
    if (name === 'start_time') {
      setFormData(prev => ({ ...prev, end_time: '' }))
    }
  }

  // Validate form
  const validateForm = () => {
    const newErrors = {}

    if (!formData.booking_date) {
      newErrors.booking_date = 'Date is required'
    }

    if (!formData.start_time) {
      newErrors.start_time = 'Start time is required'
    }

    if (!formData.end_time) {
      newErrors.end_time = 'End time is required'
    }

    if (!formData.purpose.trim()) {
      newErrors.purpose = 'Purpose is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle proceed to confirmation
  const handleProceedToConfirmation = async () => {
    if (!validateForm()) {
      toast.error('Please fill all required fields')
      return
    }

    // Validate booking availability
    if (selectedLab) {
      const validation = await validateBooking(formData, existingBookings)
      
      if (validation?.isValid) {
        setCurrentStep(STEPS.CONFIRMATION)
      } else if (validation?.conflict) {
        // Show conflict resolution dialog
        setConflictData(validation)
        setShowConflictDialog(true)
      }
    }
  }

  // Handle final booking confirmation
  const handleConfirmBooking = async () => {
    setIsSubmitting(true)
    
    try {
      const bookingData = {
        lab_id: parseInt(roomId),
        ...formData
      }

      const result = await createValidatedBooking(bookingData, selectedLab)
      
      if (result.success) {
        toast.success('Booking confirmed successfully!')
        onBookingSuccess(result.booking)
        onClose()
      }
    } catch (error) {
      // Error handled by hook
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle back to details
  const handleBackToDetails = () => {
    setCurrentStep(STEPS.DETAILS)
  }

  // Real-time validation
  const handleRealTimeValidation = async () => {
    if (formData.booking_date && formData.start_time && formData.end_time && selectedLab) {
      await validateBooking(formData, existingBookings)
    }
  }

  useEffect(() => {
    handleRealTimeValidation()
  }, [formData.booking_date, formData.start_time, formData.end_time, selectedLab])

  // Get available time slots
  const availableTimeSlots = getAvailableTimeSlots(formData.booking_date)
  const availableEndTimes = formData.start_time 
    ? getAvailableEndTimes(formData.start_time, formData.booking_date)
    : []

  // Check if form is valid for proceed
  const isFormValid = formData.booking_date && 
                     formData.start_time && 
                     formData.end_time && 
                     formData.purpose.trim() &&
                     validationResult?.isValid

  if (!isOpen) return null

  // Check if lab is available
  if (selectedLab && (!selectedLab.is_active || !selectedLab.has_availability_today)) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6">
          <div className="text-center">
            <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Room Unavailable</h3>
            <p className="text-gray-600 mb-6">This room is currently unavailable for booking.</p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl transform transition-all max-h-[90vh] overflow-y-auto">
        {loadingLab ? (
          <div className="p-8 text-center">
            <Loader2 size={32} className="mx-auto animate-spin text-teal mb-4" />
            <p className="text-gray-600">Loading lab information...</p>
          </div>
        ) : selectedLab ? (
          <>
            {currentStep === STEPS.DETAILS && (
              <>
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-ocean mb-2">Book {selectedLab.name}</h2>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                        <MapPin size={16} />
                        <span>{selectedLab.building}</span>
                        <span>•</span>
                        <Users size={16} />
                        <span>{selectedLab.capacity} Seats</span>
                        <span>•</span>
                        <Thermometer size={16} />
                        <span>{selectedLab.is_ac ? 'AC' : 'No AC'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
                          AVAILABLE
                        </span>
                        {selectedLab.today_bookings > 0 && (
                          <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">
                            {selectedLab.today_bookings} today
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={onClose}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X size={20} className="text-gray-500" />
                    </button>
                  </div>
                </div>

                {/* Lab Information */}
                <div className="p-6 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Info size={16} />
                    Lab Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Lab Owner:</span>
                      <span className="ml-2 font-medium text-gray-900">{selectedLab.lab_owner || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Hourly Charges:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {selectedLab.hourly_charges > 0 ? `₹${selectedLab.hourly_charges}` : 'Free'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Today's Bookings:</span>
                      <span className="ml-2 font-medium text-gray-900">{selectedLab.today_bookings}</span>
                    </div>
                  </div>
                  {selectedLab.facilities && (
                    <div className="mt-3">
                      <span className="text-gray-600">Facilities:</span>
                      <span className="ml-2 text-gray-900">{selectedLab.facilities}</span>
                    </div>
                  )}
                </div>

                {/* Booking Form */}
                <form onSubmit={(e) => { e.preventDefault(); handleProceedToConfirmation(); }} className="p-6 space-y-4">
                  {/* User Information (Pre-filled) */}
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                    <h4 className="text-sm font-semibold text-blue-900 mb-2">Your Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-blue-700">Name:</span>
                        <span className="ml-2 font-medium text-blue-900">{user?.name || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-blue-700">Email:</span>
                        <span className="ml-2 font-medium text-blue-900">{user?.email || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-blue-700">Department:</span>
                        <span className="ml-2 font-medium text-blue-900">{user?.department || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-blue-700">BC Number:</span>
                        <span className="ml-2 font-medium text-blue-900">{user?.bc_number || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Date Picker */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Calendar size={16} className="text-teal" />
                      Booking Date
                    </label>
                    <input
                      type="date"
                      name="booking_date"
                      value={formData.booking_date}
                      onChange={handleChange}
                      min={minBookingDate}
                      className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-4 transition-all ${
                        errors.booking_date
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10'
                          : 'border-gray-300 focus:border-teal focus:ring-teal/10'
                      }`}
                    />
                    {errors.booking_date && (
                      <p className="text-red-500 text-sm mt-1">{errors.booking_date}</p>
                    )}
                  </div>

                  {/* Time Selectors */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Clock size={16} className="text-teal" />
                        Start Time
                      </label>
                      <select
                        name="start_time"
                        value={formData.start_time}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-4 transition-all ${
                          errors.start_time
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10'
                            : 'border-gray-300 focus:border-teal focus:ring-teal/10'
                        }`}
                      >
                        <option value="">Select time</option>
                        {availableTimeSlots.map(time => (
                          <option key={time} value={time}>{formatTime(time)}</option>
                        ))}
                      </select>
                      {errors.start_time && (
                        <p className="text-red-500 text-sm mt-1">{errors.start_time}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Time
                      </label>
                      <select
                        name="end_time"
                        value={formData.end_time}
                        onChange={handleChange}
                        disabled={!formData.start_time}
                        className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-4 transition-all ${
                          errors.end_time
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10'
                            : 'border-gray-300 focus:border-teal focus:ring-teal/10'
                        } ${!formData.start_time ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      >
                        <option value="">Select time</option>
                        {availableEndTimes.map(time => (
                          <option key={time} value={time}>{formatTime(time)}</option>
                        ))}
                      </select>
                      {errors.end_time && (
                        <p className="text-red-500 text-sm mt-1">{errors.end_time}</p>
                      )}
                    </div>
                  </div>

                  {/* Purpose */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Purpose
                    </label>
                    <textarea
                      name="purpose"
                      value={formData.purpose}
                      onChange={handleChange}
                      placeholder="Describe the purpose of your booking..."
                      rows={3}
                      className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-4 transition-all resize-none ${
                        errors.purpose
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10'
                          : 'border-gray-300 focus:border-teal focus:ring-teal/10'
                      }`}
                    />
                    {errors.purpose && (
                      <p className="text-red-500 text-sm mt-1">{errors.purpose}</p>
                    )}
                  </div>

                  {/* Validation Result */}
                  {validationResult && (
                    <div className={`p-3 rounded-lg flex items-center gap-2 ${
                      validationResult.isValid
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-700'
                    }`}>
                      {validationResult.isValid ? (
                        <Check size={16} />
                      ) : (
                        <AlertCircle size={16} />
                      )}
                      <span className="text-sm">
                        {validationResult.isValid
                          ? 'Time slot is available'
                          : validationResult.error}
                      </span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={validating || !isFormValid}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-teal to-teal-light text-white rounded-xl font-semibold hover:from-teal/90 hover:to-teal-light/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {validating ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Checking...
                        </>
                      ) : (
                        <>
                          Proceed to Confirmation
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}

            {currentStep === STEPS.CONFIRMATION && (
              <BookingConfirmationPanel
                lab={selectedLab}
                bookingData={formData}
                onConfirm={handleConfirmBooking}
                onCancel={onClose}
                onBack={handleBackToDetails}
                isSubmitting={isSubmitting}
              />
            )}
          </>
        ) : (
          <div className="p-8 text-center">
            <p className="text-gray-600">Lab information not available</p>
          </div>
        )}
      </div>

      {/* Conflict Resolution Dialog */}
      <ConflictResolutionDialog
        isOpen={showConflictDialog}
        onClose={() => setShowConflictDialog(false)}
        conflictData={conflictData}
        selectedLab={selectedLab}
        selectedDate={formData.booking_date}
      />
    </div>
  )
}

export default EnhancedBookingDialog
