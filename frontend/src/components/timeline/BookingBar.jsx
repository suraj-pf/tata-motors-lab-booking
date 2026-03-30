import React from 'react';
import { formatTime12Hour } from '../../utils/calendarUtils';

const BookingBar = ({ booking, position }) => {
  if (!position) return null;
  
  return (
    <div
      className="absolute top-1 bottom-1 bg-gradient-to-r from-red-600 to-red-700 rounded-md shadow-sm cursor-pointer hover:shadow-lg hover:from-red-700 hover:to-red-800 transition-all duration-300 hover:z-10 hover:scale-105"
      style={{
        left: position.left,
        width: position.width,
        minWidth: '60px',
        animation: 'slideInUp 0.3s ease-out'
      }}
      title={`${booking.user_name} - ${formatTime12Hour(booking.start_time)} to ${formatTime12Hour(booking.end_time)}`}
    >
      <div className="px-2 py-1 text-xs text-white truncate font-medium">
        {booking.user_name}
      </div>
      <div className="px-2 text-xs text-white/90 truncate">
        {formatTime12Hour(booking.start_time)} - {formatTime12Hour(booking.end_time)}
      </div>
    </div>
  );
};

export default BookingBar;
