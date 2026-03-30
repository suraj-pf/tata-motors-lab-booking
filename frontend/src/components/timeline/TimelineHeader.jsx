import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const TimelineHeader = ({ view, currentDate, customRange, onPrev, onNext, onToday }) => {
  const formatHeaderDate = () => {
    switch(view) {
      case 'day':
        return currentDate.toLocaleDateString('en-IN', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      case 'custom':
        if (customRange && customRange.start && customRange.end) {
          const startDate = new Date(customRange.start);
          const endDate = new Date(customRange.end);
          if (customRange.start === customRange.end) {
            return startDate.toLocaleDateString('en-IN', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
          } else {
            return `${startDate.toLocaleDateString('en-IN', {
              month: 'short',
              day: 'numeric'
            })} - ${endDate.toLocaleDateString('en-IN', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}`;
          }
        }
        return 'Select Date Range';
      default:
        return 'Timeline View';
    }
  };
  
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={onPrev}
          disabled={view === 'custom'}
          className={`p-2 rounded-lg transition ${
            view === 'custom'
              ? 'text-gray-300 cursor-not-allowed'
              : 'hover:bg-gray-100 text-gray-700'
          }`}
          title="Previous"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={onToday}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
        >
          Today
        </button>
        <button
          onClick={onNext}
          disabled={view === 'custom'}
          className={`p-2 rounded-lg transition ${
            view === 'custom'
              ? 'text-gray-300 cursor-not-allowed'
              : 'hover:bg-gray-100 text-gray-700'
          }`}
          title="Next"
        >
          <ChevronRight size={20} />
        </button>
      </div>
      
      <div className="flex items-center space-x-2">
        <Calendar size={20} className="text-gray-500" />
        <span className="text-lg font-semibold text-gray-900">
          {formatHeaderDate()}
        </span>
      </div>
    </div>
  );
};

export default TimelineHeader;
