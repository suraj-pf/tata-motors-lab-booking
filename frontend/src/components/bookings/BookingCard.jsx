import React from 'react'
import { Calendar, Clock, MapPin, Users, Edit3, X } from 'lucide-react'

const BookingCard = ({ booking, isUpcoming, onUpdate, onCancel }) => {
  const formatTime = (time) => {
    return time ? time.substring(0, 5) : ''
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className='bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow'>
      {/* Header */}
      <div className='flex justify-between items-start mb-4'>
        <div>
          <h3 className='text-lg font-semibold text-gray-900 mb-1'>
            {booking.lab_name || 'Lab Booking'}
          </h3>
          <div className='flex items-center gap-2 text-sm text-gray-600'>
            <MapPin size={14} />
            <span>{booking.building || 'Building'}</span>
          </div>
        </div>
        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(booking.status)}`}>
          {booking.status}
        </span>
      </div>

      {/* Booking Details */}
      <div className='space-y-3 mb-4'>
        <div className='flex items-center gap-3 text-sm'>
          <Calendar size={16} className='text-gray-400' />
          <span className='text-gray-700'>{formatDate(booking.date)}</span>
        </div>
        
        <div className='flex items-center gap-3 text-sm'>
          <Clock size={16} className='text-gray-400' />
          <span className='text-gray-700'>
            {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
          </span>
        </div>

        <div className='flex items-center gap-3 text-sm'>
          <Users size={16} className='text-gray-400' />
          <span className='text-gray-700'>
            {booking.purpose || 'No purpose specified'}
          </span>
        </div>
      </div>

      {/* Actions */}
      {isUpcoming && booking.status !== 'cancelled' && (
        <div className='flex gap-2 pt-4 border-t border-gray-100'>
          <button
            onClick={() => onUpdate(booking)}
            className='flex-1 flex items-center justify-center gap-2 px-3 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium'
          >
            <Edit3 size={14} />
            Edit
          </button>
          <button
            onClick={() => onCancel(booking)}
            className='flex-1 flex items-center justify-center gap-2 px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium'
          >
            <X size={14} />
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

export default BookingCard
