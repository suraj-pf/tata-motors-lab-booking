import React from 'react';
import { formatTime12Hour } from '../../utils/calendarUtils';

const Tooltip = ({ booking, position }) => {
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  return (
    <div 
      className="absolute z-50 bg-gray-900 text-white text-sm rounded-lg shadow-xl p-3 max-w-xs transform -translate-y-full -mt-2 pointer-events-none"
      style={position || { left: '50%', transform: 'translateX(-50%) translateY(-100%)' }}
    >
      <div className="font-semibold mb-1">{booking.lab_name}</div>
      <div className="text-xs text-gray-300 mb-2">Booked by: {booking.user_name}</div>
      <div className="text-xs">
        {formatDate(booking.booking_date)} | {formatTime12Hour(booking.start_time)} - {formatTime12Hour(booking.end_time)}
      </div>
      {booking.purpose && (
        <div className="text-xs text-gray-300 mt-1">Purpose: {booking.purpose}</div>
      )}
      <div className="text-xs text-gray-300 mt-1">Status: {booking.status}</div>
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
    </div>
  );
};

export default Tooltip;
