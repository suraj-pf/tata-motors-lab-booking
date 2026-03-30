import React from 'react';

const TimeAxis = ({ timeSlots, view }) => {
  return (
    <div className="flex border-b border-gray-200 bg-gray-50">
      {/* Empty corner */}
      <div className="w-48 flex-shrink-0 p-3 bg-gray-50 border-r border-gray-200">
        <div className="font-medium text-gray-500">Labs</div>
      </div>
      
      {/* Time slots header */}
      <div className="flex-1 flex">
        {timeSlots.map((slot, idx) => (
          <div
            key={idx}
            className="text-center py-3 text-sm font-medium text-gray-600 border-r border-gray-200 last:border-r-0"
            style={{ width: `${100 / timeSlots.length}%` }}
          >
            {slot.label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TimeAxis;
