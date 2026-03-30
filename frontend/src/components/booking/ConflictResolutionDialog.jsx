import React from 'react'
import { AlertTriangle, Clock, Calendar, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const ConflictResolutionDialog = ({ 
  isOpen, 
  onClose, 
  conflictData, 
  selectedLab,
  selectedDate 
}) => {
  const navigate = useNavigate()

  if (!isOpen || !conflictData) return null

  const handleViewTimeline = () => {
    // Navigate to timeline with date parameter
    navigate(`/timeline?date=${selectedDate}&highlight=${selectedLab.id}`)
    onClose()
  }

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour)
    return `${displayHour}:${minutes} ${ampm}`
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
            <AlertTriangle size={24} className="text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Booking Conflict</h3>
            <p className="text-sm text-gray-600">This time slot is already booked</p>
          </div>
        </div>

        {/* Conflict Details */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-amber-600" />
              <span className="text-sm font-medium text-amber-900">
                {selectedLab.name} - {selectedLab.building}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-amber-600" />
              <span className="text-sm text-amber-900">
                Already booked from {formatTime(conflictData.start_time)} to {formatTime(conflictData.end_time)}
              </span>
            </div>
            {conflictData.purpose && (
              <div className="text-xs text-amber-700 mt-2">
                <strong>Purpose:</strong> {conflictData.purpose}
              </div>
            )}
          </div>
        </div>

        {/* Suggested Action */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-900 font-medium mb-2">Suggested Action:</p>
          <p className="text-sm text-blue-700">{conflictData.suggestedAction}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleViewTimeline}
            className="flex-1 px-4 py-2 bg-teal hover:bg-teal/90 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <ExternalLink size={16} />
            View Timeline
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
          >
            Choose Different Time
          </button>
        </div>

        {/* Additional Info */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Timeline will show all available slots for {selectedDate}
          </p>
        </div>
      </div>
    </div>
  )
}

export default ConflictResolutionDialog
