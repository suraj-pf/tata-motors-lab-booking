import React from 'react'
import LabCard from './LabCard'

const BuildingSection = ({ title, labs, icon, onBookingClick }) => {
  if (labs.length === 0) {
    return (
      <div className="bg-white rounded-xl p-8 text-center border-2 border-dashed border-gray-300">
        <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
          {icon}
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
        <p className="text-gray-500">No labs match your filters</p>
      </div>
    )
  }

  return (
    <div>
      {/* Building Header */}
      <div className="flex items-center gap-4 mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white">
          {icon}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {title}
          </h2>
          <span className="text-sm text-gray-500">
            {labs.length} Labs
          </span>
        </div>
      </div>

      {/* Labs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {labs.map(lab => (
          <LabCard key={lab.id} lab={lab} onBookingClick={onBookingClick} />
        ))}
      </div>
    </div>
  )
}

export default BuildingSection