import React, { memo } from 'react'
import { 
  Users, 
  Thermometer, 
  Monitor, 
  Wifi, 
  Coffee, 
  Lock,
  Calendar,
  Clock,
  Info
} from 'lucide-react'

const RoomBlock = memo(({ 
  room, 
  isSelected, 
  onClick, 
  onBookingClick,
  size = 'medium' 
}) => {
  // Status colors with enhanced real-time states
  const getStatusColors = (status) => {
    switch (status) {
      case 'available':
        return {
          border: 'border-green-500',
          bg: 'bg-green-50',
          text: 'text-green-700',
          hover: 'hover:bg-green-100 hover:border-green-600 hover:shadow-lg'
        }
      case 'occupied':
        return {
          border: 'border-red-500',
          bg: 'bg-red-50',
          text: 'text-red-700',
          hover: 'hover:bg-red-50 hover:border-red-500' // No hover effect for occupied
        }
      case 'booked':
        return {
          border: 'border-orange-500',
          bg: 'bg-orange-50',
          text: 'text-orange-700',
          hover: 'hover:bg-orange-50 hover:border-orange-500' // No hover effect for booked
        }
      case 'fully_booked':
        return {
          border: 'border-purple-500',
          bg: 'bg-purple-50',
          text: 'text-purple-700',
          hover: 'hover:bg-purple-50 hover:border-purple-500' // No hover effect for fully booked
        }
      case 'selected':
        return {
          border: 'border-amber-500',
          bg: 'bg-amber-50',
          text: 'text-amber-700',
          hover: 'hover:bg-amber-100 hover:border-amber-600 hover:shadow-lg'
        }
      case 'restricted':
        return {
          border: 'border-gray-400',
          bg: 'bg-gray-50',
          text: 'text-gray-600',
          hover: 'hover:bg-gray-50 hover:border-gray-400' // No hover effect for restricted
        }
      default:
        return {
          border: 'border-gray-300',
          bg: 'bg-gray-50',
          text: 'text-gray-700',
          hover: 'hover:bg-gray-100 hover:border-gray-400'
        }
    }
  }

  // Size classes
  const getSizeClasses = (size) => {
    switch (size) {
      case 'small':
        return 'p-3 min-h-[80px]'
      case 'large':
        return 'p-6 min-h-[160px]'
      default:
        return 'p-4 min-h-[120px]'
    }
  }

  const colors = getStatusColors(room.status)
  const isClickable = room.status === 'available' || room.status === 'selected'
  const sizeClasses = getSizeClasses(size)

  // Cursor styles
  const getCursorStyle = () => {
    if (room.status === 'available') return 'cursor-pointer'
    if (room.status === 'selected') return 'cursor-pointer'
    return 'cursor-not-allowed'
  }

  // Format facilities
  const getFacilityIcon = (facility) => {
    const facilityLower = facility.toLowerCase()
    if (facilityLower.includes('ac') || facilityLower.includes('air condition')) {
      return <Thermometer size={14} />
    }
    if (facilityLower.includes('projector')) {
      return <Monitor size={14} />
    }
    if (facilityLower.includes('wifi')) {
      return <Wifi size={14} />
    }
    if (facilityLower.includes('smart')) {
      return <Monitor size={14} />
    }
    return <Coffee size={14} />
  }

  // Handle click
  const handleClick = () => {
    if (isClickable && onClick) {
      onClick(room)
    }
  }

  // Handle booking click
  const handleBookingClick = (e) => {
    e.stopPropagation() // Prevent room selection
    if (room.status === 'available' && onBookingClick) {
      onBookingClick(room)
    }
  }

  // Get booking info for tooltip with enhanced status
  const getBookingTooltip = () => {
    if (room.status === 'occupied' && room.currentBooking) {
      const booking = room.currentBooking
      const time = `${booking.start_time} - ${booking.end_time}`
      return `Currently In Use\nTime: ${time}\nBy: ${booking.user_name || 'Unknown'}\nPurpose: ${booking.purpose || 'N/A'}`
    }
    
    if (room.status === 'booked' && room.currentBooking) {
      const booking = room.currentBooking
      const time = `${booking.start_time} - ${booking.end_time}`
      const date = new Date(booking.booking_date).toLocaleDateString()
      return `Booked\nDate: ${date}\nTime: ${time}\nBy: ${booking.user_name || 'Unknown'}`
    }
    
    if (room.status === 'fully_booked') {
      return `Fully Booked Today\nTotal Bookings: ${room.today_bookings || 0}`
    }
    
    if (room.status === 'restricted') {
      return 'Room Restricted - Not Available'
    }
    
    if (room.next_booking) {
      const next = room.next_booking
      return `Available Now\nNext Booking: ${next.start_time} - ${next.end_time}\nPurpose: ${next.purpose || 'N/A'}`
    }
    
    return 'Available - Click to Book'
  }

  return (
    <div
      className={`
        relative rounded-xl border-2 transition-all duration-300
        ${colors.border} ${colors.bg} ${colors.hover}
        ${sizeClasses}
        ${isSelected ? 'ring-2 ring-amber-400 ring-offset-2' : ''}
        ${!isClickable ? 'cursor-not-allowed opacity-75' : ''}
        ${room.status === 'selected' ? 'animate-pulse' : ''}
        ${getCursorStyle()}
      `}
      onClick={handleClick}
      title={getBookingTooltip()}
    >
      {/* Status Indicator */}
      <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${
        room.status === 'available' ? 'bg-green-500' :
        room.status === 'occupied' ? 'bg-red-500 animate-pulse' :
        room.status === 'booked' ? 'bg-orange-500' :
        room.status === 'fully_booked' ? 'bg-purple-500' :
        room.status === 'selected' ? 'bg-amber-500' :
        'bg-gray-400'
      }`} />

      {/* Room Header */}
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className={`font-bold text-sm ${colors.text}`}>
            {room.name}
          </h3>
          {room.owner && (
            <p className="text-xs text-gray-600 mt-1">
              {room.owner}
            </p>
          )}
        </div>
        
        {room.status === 'restricted' && (
          <Lock size={16} className="text-gray-400" />
        )}
      </div>

      {/* Room Details */}
      <div className="space-y-2">
        {/* Capacity */}
        {room.seats > 0 && (
          <div className="flex items-center gap-2">
            <Users size={14} className="text-gray-500" />
            <span className="text-xs text-gray-700">{room.seats} Seats</span>
          </div>
        )}

        {/* AC Status */}
        {room.isAc !== undefined && (
          <div className="flex items-center gap-2">
            <Thermometer size={14} className={room.isAc ? 'text-blue-500' : 'text-gray-400'} />
            <span className="text-xs text-gray-700">
              {room.isAc ? 'AC' : 'No AC'}
            </span>
          </div>
        )}

        {/* Facilities */}
        {room.facilities && room.facilities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {room.facilities.slice(0, 3).map((facility, index) => (
              <div 
                key={index}
                className="flex items-center gap-1 px-2 py-1 bg-white/50 rounded text-xs text-gray-600"
              >
                {getFacilityIcon(facility)}
                <span className="truncate max-w-[60px]">{facility}</span>
              </div>
            ))}
            {room.facilities.length > 3 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-white/50 rounded text-xs text-gray-600">
                <Info size={12} />
                <span>+{room.facilities.length - 3}</span>
              </div>
            )}
          </div>
        )}

        {/* Current Booking Info */}
        {room.status === 'booked' && room.currentBooking && (
          <div className="mt-3 p-2 bg-white/70 rounded-lg">
            <div className="flex items-center gap-2 text-xs text-red-700">
              <Calendar size={12} />
              <span>Booked Today</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-red-600 mt-1">
              <Clock size={12} />
              <span>{room.currentBooking.start_time} - {room.currentBooking.end_time}</span>
            </div>
            {room.currentBooking.user_name && (
              <div className="text-xs text-red-600 mt-1">
                By: {room.currentBooking.user_name}
              </div>
            )}
          </div>
        )}

        {/* Hourly Rate */}
        {room.hourlyRate > 0 && (
          <div className="text-xs text-gray-600">
            ₹{room.hourlyRate}/hour
          </div>
        )}

        {/* Book Now Button for available rooms */}
        {room.status === 'available' && onBookingClick && (
          <button
            onClick={handleBookingClick}
            className="mt-3 w-full px-3 py-2 bg-teal hover:bg-teal/90 text-white text-xs rounded-lg font-medium transition-colors flex items-center justify-center gap-1"
          >
            <Calendar size={12} />
            Book Now
          </button>
        )}
      </div>

      {/* Selection Badge */}
      {room.status === 'selected' && (
        <div className="absolute top-2 left-2 px-2 py-1 bg-amber-500 text-white text-xs rounded-full font-semibold">
          SELECTED
        </div>
      )}

      {/* Booked Badge */}
      {room.status === 'booked' && (
        <div className="absolute top-2 left-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full font-semibold">
          BOOKED
        </div>
      )}
    </div>
  )
})

RoomBlock.displayName = 'RoomBlock'

export default RoomBlock
