import React from 'react'
import { Clock } from 'lucide-react'

const TimeSlotPicker = ({ selectedDate, onSelectSlot }) => {
  // This is a simplified version - in production, fetch from API
  const slots = [
    '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00',
    '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00',
    '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
  ]

  return (
    <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-4">
      <h3 className="text-lg font-semibold text-ocean mb-4 flex items-center gap-2">
        <Clock size={18} className="text-teal" />
        Available Time Slots
      </h3>
      
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {slots.map(slot => (
          <button
            key={slot}
            onClick={() => onSelectSlot(slot)}
            className="p-2 text-sm font-medium rounded-lg border-2 border-teal/20 hover:border-teal hover:bg-teal/5 transition-all"
          >
            {slot}
          </button>
        ))}
      </div>
    </div>
  )
}

export default TimeSlotPicker