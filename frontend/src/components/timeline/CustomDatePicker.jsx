import React, { useState } from 'react';
import { Calendar, X } from 'lucide-react';

const CustomDatePicker = ({ customRange, setCustomRange, onApply }) => {
  const [startDate, setStartDate] = useState(customRange.start || '');
  const [endDate, setEndDate] = useState(customRange.end || '');
  const [isOpen, setIsOpen] = useState(false);

  const handleApply = () => {
    if (startDate && endDate) {
      setCustomRange({ start: startDate, end: endDate });
      setIsOpen(false);
      if (onApply) onApply({ start: startDate, end: endDate });
    }
  };

  const handleClear = () => {
    setStartDate('');
    setEndDate('');
    setCustomRange({ start: null, end: null });
    setIsOpen(false);
  };

  const today = new Date().toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 90 days from now

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-4 py-2 rounded-lg font-medium transition flex items-center ${
          customRange.start && customRange.end
            ? 'bg-red-600 text-white shadow-md'
            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
        }`}
      >
        <Calendar size={16} className="mr-2" />
        {customRange.start && customRange.end
          ? `${new Date(customRange.start).toLocaleDateString()} - ${new Date(customRange.end).toLocaleDateString()}`
          : 'Select Date Range'
        }
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 min-w-80">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Select Date Range</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={today}
                max={maxDate}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || today}
                max={maxDate}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={handleClear}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition"
            >
              Clear
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={!startDate || !endDate}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDatePicker;