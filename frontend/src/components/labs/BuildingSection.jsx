import React from 'react'
import LabCard from './LabCard'

const BuildingSection = ({ title, labs, icon, onLabSelect, onBookingClick }) => {
  if (labs.length === 0) {
    return (
      <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-8 text-center border-2 border-dashed border-teal/30">
        <div className="w-16 h-16 bg-teal/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          {icon}
        </div>
        <h3 className="text-xl font-bold text-ocean mb-2">{title}</h3>
        <p className="text-teal">No labs match your filters</p>
      </div>
    )
  }

  return (
    <div>
      {/* Building Header */}
      <div className="flex items-center gap-4 mb-6 p-6 bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg">
        <div className="w-16 h-16 bg-gradient-to-r from-teal to-teal-light rounded-xl flex items-center justify-center text-white shadow-lg">
          {icon}
        </div>
        <div>
          <h2 className="text-3xl font-black bg-gradient-to-r from-teal to-teal-light bg-clip-text text-transparent">
            {title}
          </h2>
          <div className="flex gap-4 mt-2">
            <span className="px-3 py-1 bg-teal/10 rounded-full text-sm font-medium text-teal">
              {labs.length} Labs
            </span>
            <span className="px-3 py-1 bg-teal/10 rounded-full text-sm font-medium text-teal">
              {labs.filter(l => (l.status || (l.is_booked ? 'booked' : l.is_active ? 'available' : 'restricted')) === 'available').length} Available
            </span>
          </div>
        </div>
      </div>

      {/* Labs Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-6 bg-gradient-to-br from-cream/20 to-peach/10 rounded-2xl border-2 border-dashed border-teal/20">
        {labs.map(lab => (
          <LabCard key={lab.id} lab={lab} onLabSelect={onLabSelect} onBookingClick={onBookingClick} />
        ))}
      </div>
    </div>
  )
}

export default BuildingSection