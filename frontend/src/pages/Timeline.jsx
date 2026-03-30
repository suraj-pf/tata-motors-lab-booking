import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import TimelineView from '../components/timeline/TimelineView';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useTimeline } from '../hooks/useTimeline';
import toast from 'react-hot-toast';

const Timeline = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const { 
    bookings, 
    labs, 
    loading, 
    error, 
    fetchTimeline,
    setSelectedDate: setTimelineDate
  } = useTimeline();
  
  // Initialize timeline on mount
  useEffect(() => {
    fetchTimeline(selectedDate);
  }, []);
  
  const handleDateChange = (date) => {
    setSelectedDate(date);
    setTimelineDate(date);
  };
  
  if (loading && labs.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="large" />
        <span className="ml-3 text-gray-600">Loading timeline...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h3 className="text-lg font-medium text-red-800">Error loading timeline</h3>
          <p className="text-red-700 mt-2">{error}</p>
          <button
            onClick={() => fetchTimeline(selectedDate)}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TimelineView />
      </div>
    </div>
  );
};

export default Timeline;
