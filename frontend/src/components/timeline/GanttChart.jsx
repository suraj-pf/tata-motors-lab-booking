import React, { useEffect, useState, useRef } from 'react';
import TimeAxis from './TimeAxis';
import TimelineRow from './TimelineRow';
import { generateTimeSlots, parseTimeToMinutes, formatTime12Hour } from '../../utils/calendarUtils';

const GanttChart = ({ bookings, labs, view, dateRange }) => {
  const [timeSlots, setTimeSlots] = useState([]);
  const [bookingsByLab, setBookingsByLab] = useState({});
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);
  const [showTopScroll, setShowTopScroll] = useState(false);
  const [showBottomScroll, setShowBottomScroll] = useState(false);
  const scrollContainerRef = useRef(null);
  
  useEffect(() => {
    // Generate time slots based on view (day, week, month)
    const slots = generateTimeSlots(dateRange, view);
    setTimeSlots(slots);
    
    // Group bookings by lab
    const grouped = {};
    labs.forEach(lab => {
      grouped[lab.id] = bookings.filter(b => b.lab_id === lab.id);
    });
    setBookingsByLab(grouped);
  }, [bookings, labs, dateRange, view]);

  // Handle scroll indicators for both axes
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const { scrollLeft, scrollTop, scrollWidth, scrollHeight, clientWidth, clientHeight } = container;
    
    // Horizontal scroll indicators
    setShowLeftScroll(scrollLeft > 0);
    setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 1);
    
    // Vertical scroll indicators
    setShowTopScroll(scrollTop > 0);
    setShowBottomScroll(scrollTop < scrollHeight - clientHeight - 1);
  };

  // Smooth scroll functions
  const scrollLeft = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollTo({
      left: Math.max(0, container.scrollLeft - 200),
      behavior: 'smooth'
    });
  };

  const scrollRight = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollTo({
      left: container.scrollLeft + 200,
      behavior: 'smooth'
    });
  };

  const scrollUp = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollTo({
      top: Math.max(0, container.scrollTop - 150),
      behavior: 'smooth'
    });
  };

  const scrollDown = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollTo({
      top: container.scrollTop + 150,
      behavior: 'smooth'
    });
  };

  // Auto-scroll to current time on mount
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || view !== 'day') return;
    
    const currentHour = new Date().getHours();
    if (currentHour >= 6 && currentHour <= 17) {
      const slotIndex = currentHour - 6;
      const slotWidth = 100; // Approximate width per hour
      const scrollPosition = slotIndex * slotWidth;
      
      setTimeout(() => {
        container.scrollTo({
          left: scrollPosition,
          behavior: 'smooth'
        });
      }, 500);
    }
  }, [view]);
  
  const getBookingPosition = (booking, slot) => {
    // Calculate position and width for Gantt bar (only for day view)
    if (view !== 'day') return null;
    
    const startMinutes = parseTimeToMinutes(booking.start_time);
    const endMinutes = parseTimeToMinutes(booking.end_time);
    const slotStart = parseTimeToMinutes(slot.start);
    const slotEnd = parseTimeToMinutes(slot.end);
    
    // Calculate overlap
    const overlapStart = Math.max(startMinutes, slotStart);
    const overlapEnd = Math.min(endMinutes, slotEnd);
    
    if (overlapStart >= overlapEnd) return null;
    
    const slotDuration = slotEnd - slotStart;
    const overlapDuration = overlapEnd - overlapStart;
    
    const leftPercent = ((overlapStart - slotStart) / slotDuration) * 100;
    const widthPercent = (overlapDuration / slotDuration) * 100;
    
    return { 
      left: `${leftPercent}%`, 
      width: `${widthPercent}%` 
    };
  };
  
  if (labs.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="text-gray-500">No labs available</div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Scroll indicators */}
      <div className="relative">
        {/* Top scroll indicator - temporarily disabled */}
        {false && showTopScroll && (
          <button
            onClick={scrollUp}
            className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-white shadow-lg border border-gray-200 rounded-b-lg p-2 hover:bg-gray-50 transition-all duration-200 scroll-indicator"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        )}
        
        {/* Bottom scroll indicator - temporarily disabled */}
        {false && showBottomScroll && (
          <button
            onClick={scrollDown}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 bg-white shadow-lg border border-gray-200 rounded-t-lg p-2 hover:bg-gray-50 transition-all duration-200 scroll-indicator"
            style={{ boxShadow: '0 -2px 8px rgba(0,0,0,0.1)' }}
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
        
        {/* Left scroll indicator */}
        {showLeftScroll && (
          <button
            onClick={scrollLeft}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-white shadow-lg border border-gray-200 rounded-r-lg p-2 hover:bg-gray-50 transition-all duration-200 scroll-indicator"
            style={{ boxShadow: '2px 0 8px rgba(0,0,0,0.1)' }}
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        
        {/* Right scroll indicator */}
        {showRightScroll && (
          <button
            onClick={scrollRight}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-white shadow-lg border border-gray-200 rounded-l-lg p-2 hover:bg-gray-50 transition-all duration-200 scroll-indicator"
            style={{ boxShadow: '-2px 0 8px rgba(0,0,0,0.1)' }}
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
        
        {/* Main scrollable content - both axes */}
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400 transition-all duration-200"
          style={{ 
            scrollbarWidth: 'thin',
            WebkitScrollbarWidth: 'thin',
            scrollBehavior: 'smooth',
            maxHeight: '600px'
          }}
        >
          <div className="min-w-[1200px] relative min-h-[400px]">
            {/* Current time indicator for day view */}
            {view === 'day' && (
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none current-time-pulse"
                style={{
                  left: `${Math.max(0, (new Date().getHours() - 6) * 100)}px`,
                  transition: 'left 1s ease-in-out'
                }}
              >
                <div className="absolute -top-1 -left-2 w-4 h-4 bg-red-500 rounded-full"></div>
                <div className="absolute -top-6 -left-8 text-xs text-red-600 font-medium whitespace-nowrap">
                  {formatTime12Hour(new Date().toTimeString().slice(0, 5))}
                </div>
              </div>
            )}
            
            {/* Header with Time Axis */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
              <TimeAxis timeSlots={timeSlots} view={view} />
            </div>
            
            {/* Lab Rows with smooth transitions */}
            <div className="transition-all duration-300">
              {labs.map((lab, index) => (
                <div
                  key={lab.id}
                  className="transition-all duration-300 hover:bg-gray-50 timeline-row-animate"
                  style={{
                    animationDelay: `${index * 50}ms`
                  }}
                >
                  <TimelineRow
                    lab={lab}
                    bookings={bookingsByLab[lab.id] || []}
                    timeSlots={timeSlots}
                    view={view}
                    getBookingPosition={getBookingPosition}
                  />
                </div>
              ))}
            </div>
            
            {/* Empty state if no labs */}
            {labs.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No labs found in the system.
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Enhanced Summary */}
      <div className="border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">
              Showing <span className="font-semibold text-gray-900">{labs.length}</span> labs
            </span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-600">
              <span className="font-semibold text-gray-900">{bookings.length}</span> booking{bookings.length !== 1 ? 's' : ''}
            </span>
            {view === 'day' && (
              <>
                <span className="text-gray-400">|</span>
                <span className="text-gray-600">
                  {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
              </>
            )}
          </div>
          
          {/* Enhanced scroll hints for both axes */}
          <div className="flex items-center space-x-3">
            {/* Horizontal scroll hint */}
            <div className="flex items-center text-gray-500 scroll-hint">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              <span className="text-xs">Scroll horizontally</span>
            </div>
            
            <span className="text-gray-300">|</span>
            
            {/* Vertical scroll hint */}
            <div className="flex items-center text-gray-500 scroll-hint" style={{ animationDelay: '0.5s' }}>
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8m0 0l-4-4m4 4l-4 4m0 6H8m0 0l4 4m-4-4l4-4" />
              </svg>
              <span className="text-xs">Scroll vertically</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;
