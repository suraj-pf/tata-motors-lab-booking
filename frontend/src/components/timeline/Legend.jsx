import React from 'react';

const Legend = () => {
  return (
    <div className="bg-white rounded-xl p-4 mb-6 flex flex-wrap gap-6 shadow-sm border border-gray-200">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-red-500 rounded"></div>
        <span className="text-sm text-gray-700">Booked</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-green-500 rounded"></div>
        <span className="text-sm text-gray-700">Available</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-blue-500 rounded"></div>
        <span className="text-sm text-gray-700">Selected</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-gray-300 rounded"></div>
        <span className="text-sm text-gray-700">No Data</span>
      </div>
      <div className="flex items-center gap-2 ml-auto">
        <div className="w-6 h-4 bg-red-500 rounded-sm"></div>
        <span className="text-sm text-gray-700">Booking duration</span>
      </div>
    </div>
  );
};

export default Legend;
