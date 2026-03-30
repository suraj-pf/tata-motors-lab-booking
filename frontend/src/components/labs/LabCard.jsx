import React, { useMemo, useEffect, useState } from 'react'
import { Users, Snowflake, Clock, User, MapPin, Calendar, Monitor, DollarSign, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

// Real-time check if lab is currently in use
const isCurrentlyInUse = (lab) => {
  if (!lab.current_booking && !lab.is_booked) return false
  
  const now = new Date()
  const currentTime = now.getHours() * 60 + now.getMinutes()
  
  // Check current_booking real-time overlap
  if (lab.current_booking) {
    const [startH, startM] = lab.current_booking.start_time?.split(':').map(Number) || [0, 0]
    const [endH, endM] = lab.current_booking.end_time?.split(':').map(Number) || [0, 0]
    const bookingStart = startH * 60 + startM
    const bookingEnd = endH * 60 + endM
    
    if (currentTime >= bookingStart && currentTime < bookingEnd) {
      return true
    }
  }
  
  return lab.is_booked // Fallback to static flag
}

const LabCard = ({ lab, onLabSelect, onBookingClick, isSelected = false }) => {
  // Real-time state for IN USE status
  const [currentlyInUse, setCurrentlyInUse] = useState(() => isCurrentlyInUse(lab))
  
  // Update IN USE status every minute
  useEffect(() => {
    const checkStatus = () => {
      setCurrentlyInUse(isCurrentlyInUse(lab))
    }
    
    checkStatus() // Check immediately
    const interval = setInterval(checkStatus, 60000) // Check every minute
    
    return () => clearInterval(interval)
  }, [lab])

  // Memoize computed status to avoid recalculation on every render
  const { computedStatus, isAvailable, isBooked, isRestricted, isInUse } = useMemo(() => {
    const status = lab.status || (lab.is_booked ? 'booked' : lab.is_active ? 'available' : 'restricted')
    const inUse = currentlyInUse // Use real-time check
    return {
      computedStatus: status,
      isAvailable: status === 'available' && !inUse,
      isBooked: status === 'booked' || (inUse && status !== 'restricted'),
      isRestricted: status === 'restricted',
      isInUse: inUse
    }
  }, [lab.status, lab.is_booked, lab.is_active, currentlyInUse])
  
  // Check if lab has projector
  const hasProjector = lab.facilities && (
    lab.facilities.toLowerCase().includes('projector') || 
    lab.facilities.toLowerCase().includes('smart')
  )

  // Enhanced status info with icons and colors
  const getStatusInfo = () => {
    if (isSelected) return { 
      text: 'SELECTED', 
      color: 'bg-gradient-to-r from-ocean to-ocean-dark',
      icon: CheckCircle2,
      textColor: 'text-ocean'
    }
    if (isRestricted) return { 
      text: 'RESTRICTED', 
      color: 'bg-gradient-to-r from-gray-400 to-gray-600',
      icon: AlertCircle,
      textColor: 'text-gray-500'
    }
    if (isInUse) return { 
      text: 'IN USE', 
      color: 'bg-gradient-to-r from-orange-500 to-orange-600',
      icon: Clock,
      textColor: 'text-orange-600'
    }
    if (isBooked) return { 
      text: 'BOOKED', 
      color: 'bg-gradient-to-r from-tata-red to-tata-red-dark',
      icon: XCircle,
      textColor: 'text-tata-red'
    }
    return { 
      text: 'AVAILABLE', 
      color: 'bg-gradient-to-r from-teal to-teal-light',
      icon: CheckCircle2,
      textColor: 'text-teal'
    }
  }

  const statusInfo = getStatusInfo()
  const StatusIcon = statusInfo.icon

  const handleClick = () => {
    if (isAvailable) {
      onLabSelect(lab.id)
    }
  }

  const handleBookingClick = (e) => {
    e.stopPropagation() // Prevent lab selection
    if (isAvailable && onBookingClick) {
      onBookingClick(lab)
    }
  }

  return (
    <div
      onClick={handleClick}
      className={`relative bg-white/95 backdrop-blur-xl rounded-2xl p-4 transition-all duration-300 group overflow-hidden ${
        isAvailable
          ? 'border-2 border-teal hover:shadow-2xl hover:-translate-y-1 hover:shadow-teal/20 cursor-pointer'
          : isSelected
          ? 'border-2 border-ocean shadow-2xl shadow-ocean/20 cursor-pointer'
          : isRestricted
          ? 'border-2 border-gray-400 opacity-60 cursor-not-allowed bg-gradient-to-br from-gray-50'
          : 'border-2 border-orange-300 opacity-70 cursor-not-allowed bg-gradient-to-br from-orange-50'
      }`}
    >
      {/* Status Badge with Icon */}
      <div
        className={`absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-bold uppercase text-white shadow-lg flex items-center gap-1.5 ${statusInfo.color}`}
      >
        <StatusIcon size={12} />
        {statusInfo.text}
      </div>

      {/* Lab Name */}
      <h3 className="text-lg font-bold text-ocean text-center mb-3 mt-2">
        {lab.name}
      </h3>

      {/* Building */}
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3 justify-center">
        <MapPin size={14} />
        <span className="font-medium">{lab.building}</span>
      </div>

      {/* Lab Details Grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="flex items-center gap-1 text-sm text-gray-700">
          <Users size={12} />
          <span className="text-xs">{lab.capacity} seats</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-gray-700">
          {lab.is_ac ? <Snowflake size={12} className="text-blue-500" /> : <div className="w-3 h-3" />}
          <span className="text-xs">{lab.is_ac ? 'AC' : 'Non-AC'}</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-gray-700">
          {hasProjector ? <Monitor size={12} className="text-purple-500" /> : <div className="w-3 h-3" />}
          <span className="text-xs">{hasProjector ? 'Projector' : 'No Projector'}</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-gray-700">
          <Clock size={12} />
          <span className="text-xs">10.5h max</span>
        </div>
      </div>

      {/* Owner/In-charge */}
      {lab.lab_owner && (
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
          <User size={12} />
          <span className="text-xs truncate">{lab.lab_owner}</span>
        </div>
      )}

      {/* Cost */}
      {lab.cost_per_hour && (
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
          <DollarSign size={12} />
          <span className="text-xs">{lab.cost_per_hour}/hour</span>
        </div>
      )}

      {/* Current Booking Info (if in use) */}
      {lab.current_booking && (
        <div className="mb-3 p-2 bg-orange-100 rounded-lg border border-orange-200">
          <p className="text-xs text-orange-800 font-medium">Currently booked:</p>
          <p className="text-xs text-orange-700">
            {lab.current_booking.start_time?.substring(0, 5)} - {lab.current_booking.end_time?.substring(0, 5)}
          </p>
          <p className="text-xs text-orange-600 truncate">
            by {lab.current_booking.user_name || 'Unknown'}
          </p>
        </div>
      )}

      {/* Book Now Button - Enhanced */}
      {isAvailable && onBookingClick && (
        <button
          onClick={handleBookingClick}
          className="w-full px-3 py-2 bg-teal hover:bg-teal/90 text-white text-sm rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-1 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
        >
          <Calendar size={14} />
          Book Now
        </button>
      )}

      {/* Unavailable Message */}
      {!isAvailable && (
        <div className="w-full px-3 py-2 bg-gray-100 text-gray-500 text-sm rounded-lg font-medium flex items-center justify-center gap-1">
          <StatusIcon size={14} />
          {isRestricted ? 'Access Restricted' : isInUse ? 'Currently In Use' : 'Not Available'}
        </div>
      )}

      {/* Enhanced Overlay with additional details */}
      <div className="absolute inset-0 bg-ocean/95 text-white p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-peach">
            <User size={14} />
            <span className="font-medium text-sm">{lab.lab_owner || 'Not specified'}</span>
          </div>
          <div className="flex items-center gap-2 text-cream/80">
            <MapPin size={14} />
            <span className="text-xs">{lab.building}</span>
          </div>
          {lab.beneficiaries && (
            <div className="text-xs text-cream/70">
              <strong>Beneficiaries:</strong> {lab.beneficiaries}
            </div>
          )}
          <p className="text-xs text-cream/70 mt-2 line-clamp-2">
            {lab.facilities || 'No additional facilities'}
          </p>
          
          {/* Status in overlay */}
          <div className={`mt-3 pt-2 border-t border-white/20 flex items-center gap-2 ${statusInfo.textColor}`}>
            <StatusIcon size={14} />
            <span className="text-xs font-medium uppercase">{statusInfo.text}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LabCard