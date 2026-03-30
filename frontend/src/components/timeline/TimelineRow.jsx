import React, { useState } from 'react';
import BookingBar from './BookingBar';
import Tooltip from './Tooltip';
import { parseTimeToMinutes } from '../../utils/calendarUtils';

const TimelineRow = ({ lab, bookings, timeSlots, view, getBookingPosition }) => {
  const [hoveredBooking, setHoveredBooking] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState(null);
  
  const getStatusColor = (isBooked) => {
    return isBooked ? 'bg-red-50' : 'bg-green-50';
  };
  
  const handleCellHover = (booking, event) => {
    if (booking) {
      setHoveredBooking(booking);
      const rect = event.currentTarget.getBoundingClientRect();
      setTooltipPosition({
        left: rect.left + rect.width / 2,
        top: rect.top
      });
    } else {
      setHoveredBooking(null);
      setTooltipPosition(null);
    }
  };
  
  const handleCellLeave = () => {
    setHoveredBooking(null);
    setTooltipPosition(null);
  };
  
  return (
    <div className="border-t border-gray-200">
      <div className="flex">
        {/* Lab Name Column */}
        <div className="w-48 flex-shrink-0 p-3 bg-gray-50 border-r border-gray-200">
          <div className="font-medium text-gray-900 truncate">{lab.name}</div>
          <div className="text-xs text-gray-500 truncate">{lab.building}</div>
          <div className="text-xs text-gray-400">Capacity: {lab.capacity}</div>
        </div>
        
        {/* Timeline Cells */}
        <div className="flex-1 relative">
          {timeSlots.map((slot, idx) => {
            let bookingsInSlot = [];
            
            if (view === 'day') {
              // For day view, check time overlap
              bookingsInSlot = bookings.filter(booking => {
                const start = parseTimeToMinutes(booking.start_time);
                const end = parseTimeToMinutes(booking.end_time);
                const slotStart = parseTimeToMinutes(slot.start);
                const slotEnd = parseTimeToMinutes(slot.end);
                return start < slotEnd && end > slotStart;
              });
            } else {
              // For week/month view, check date overlap
              bookingsInSlot = bookings.filter(booking => 
                booking.booking_date === slot.date
              );
            }
            
            const isBooked = bookingsInSlot.length > 0;
            const booking = bookingsInSlot[0];
            
            return (
              <div
                key={idx}
                className={`relative inline-block h-16 border-r border-gray-200 last:border-r-0 transition-colors cursor-pointer ${getStatusColor(isBooked)} hover:bg-opacity-20`}
                style={{ width: `${100 / timeSlots.length}%` }}
                onMouseEnter={(e) => handleCellHover(booking, e)}
                onMouseLeave={handleCellLeave}
              >
                {booking && view === 'day' && (
                  <BookingBar
                    booking={booking}
                    position={getBookingPosition(booking, slot)}
                  />
                )}
                
                {/* For week/month view, show booking indicator */}
                {booking && view !== 'day' && (
                  <div className="absolute inset-1 bg-red-500 rounded-md flex items-center justify-center">
                    <div className="text-xs text-white font-medium truncate px-1">
                      {booking.user_name}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Tooltip */}
          {hoveredBooking && tooltipPosition && (
            <Tooltip 
              booking={hoveredBooking} 
              position={tooltipPosition}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default TimelineRow;
