import React from 'react'
import { Users, Snowflake, Monitor, MapPin, Calendar } from 'lucide-react'

const LabCard = ({ lab, onBookingClick }) => {
  // Check if lab has projector
  const hasProjector = lab.facilities && (
    lab.facilities.toLowerCase().includes('projector') || 
    lab.facilities.toLowerCase().includes('smart')
  )

  const handleBookingClick = (e) => {
    e.stopPropagation()
    if (onBookingClick) {
      onBookingClick(lab)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden border border-gray-200">
      {/* Lab Header */}
      <div className="p-4 pb-2">
        <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">
          {lab.name}
        </h3>
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <MapPin size={14} />
          <span className="line-clamp-1">{lab.building}</span>
        </div>
      </div>

      {/* Lab Details */}
      <div className="px-4 py-2 space-y-2">
        {/* Capacity */}
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Users size={16} className="text-blue-500" />
          <span>{lab.capacity} seats</span>
        </div>

        {/* Features */}
        <div className="flex flex-wrap gap-2">
          {lab.is_ac && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
              <Snowflake size={12} />
              AC
            </span>
          )}
          {hasProjector && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded-full">
              <Monitor size={12} />
              Projector
            </span>
          )}
          {lab.cost_per_hour && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full">
              ₹{lab.cost_per_hour}/hr
            </span>
          )}
        </div>

        {/* Facilities summary */}
        {lab.facilities && (
          <p className="text-xs text-gray-500 line-clamp-2">
            {lab.facilities}
          </p>
        )}
      </div>

      {/* Book Now Button */}
      <div className="p-4 pt-2">
        <button
          onClick={handleBookingClick}
          className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
        >
          <Calendar size={16} />
          Book Now
        </button>
      </div>
    </div>
  )
}

export default LabCard