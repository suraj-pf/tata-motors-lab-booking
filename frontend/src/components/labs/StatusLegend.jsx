import React from 'react'

const StatusLegend = () => {
  const statuses = [
    {
      status: 'Available',
      color: 'bg-gradient-to-r from-teal to-teal-light',
      description: 'Lab is free and can be booked'
    },
    {
      status: 'Booked',
      color: 'bg-gradient-to-r from-tata-red to-tata-red-dark',
      description: 'Lab is currently booked'
    },
    {
      status: 'Selected',
      color: 'bg-gradient-to-r from-ocean to-ocean-dark',
      description: 'Lab is currently selected'
    },
    {
      status: 'Utility/Restricted',
      color: 'bg-gradient-to-r from-gray-400 to-gray-600',
      description: 'Lab is under maintenance or restricted'
    }
  ]

  return (
    <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-teal/20">
      <h3 className="text-xl font-bold text-ocean mb-4 text-center">Status Legend</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {statuses.map((item) => (
          <div key={item.status} className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full ${item.color} flex-shrink-0`}></div>
            <div>
              <div className="font-semibold text-ocean text-sm">{item.status}</div>
              <div className="text-xs text-gray-600">{item.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default StatusLegend