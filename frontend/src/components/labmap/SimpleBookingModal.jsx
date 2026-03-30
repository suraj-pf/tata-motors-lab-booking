import React, { useState } from 'react'
import { X, Check, AlertCircle, Loader2, Calendar, Clock, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

const SimpleBookingModal = ({ 
  labName, 
  labId, 
  isOpen, 
  onClose, 
  onConfirm,
  isSubmitting 
}) => {
  const [purpose, setPurpose] = useState('')
  
  if (!isOpen) return null

  // Calculate booking details for display
  const now = new Date()
  const startTime = new Date(now)
  startTime.setMinutes(0, 0, 0)
  startTime.setHours(startTime.getHours() + 1)
  
  const endTime = new Date(startTime)
  endTime.setHours(endTime.getHours() + 1)
  
  const startTimeStr = startTime.toTimeString().slice(0, 5)
  const endTimeStr = endTime.toTimeString().slice(0, 5)
  const bookingDate = startTime.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  const handleConfirm = async () => {
    if (!purpose.trim()) {
      toast.error('Please enter a purpose for the booking')
      return
    }
    try {
      await onConfirm(purpose.trim())
    } catch (error) {
      // Error handled by parent
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl transform transition-all">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Confirm Booking</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 text-center mb-6">
            Are you sure you want to book <span className="font-semibold text-teal">{labName}</span>?
          </p>
          
          {/* Booking Details Card */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Calendar size={16} className="text-teal" />
              Booking Details
            </h3>
            
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-teal rounded-full"></div>
                <span className="text-sm text-gray-600">Date:</span>
                <span className="text-sm font-medium text-gray-900">{bookingDate}</span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-teal rounded-full"></div>
                <span className="text-sm text-gray-600">Time:</span>
                <span className="text-sm font-medium text-gray-900">{startTimeStr} - {endTimeStr}</span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-teal rounded-full"></div>
                <span className="text-sm text-gray-600">Duration:</span>
                <span className="text-sm font-medium text-gray-900">1 hour</span>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-teal rounded-full mt-2"></div>
                <span className="text-sm text-gray-600">Purpose:</span>
                <div className="flex-1">
                  <input
                    type="text"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="Enter purpose (e.g., Team meeting, Training session)"
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal focus:border-teal"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-amber-600 mt-0.5" />
              <p className="text-sm text-amber-800">
                Please confirm the booking details above. This action will create a confirmed booking for the specified time slot.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-teal to-teal-light text-white rounded-xl font-semibold hover:from-teal/90 hover:to-teal-light/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Booking...
                </>
              ) : (
                <>
                  <Check size={18} />
                  Confirm Booking
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SimpleBookingModal
