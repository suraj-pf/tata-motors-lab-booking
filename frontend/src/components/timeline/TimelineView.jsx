import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Calendar, Clock, Users, Filter, RefreshCw, X, MapPin, User, FileText } from 'lucide-react';
import { useTimeline } from '../../hooks/useTimeline';
import LiveStatusBadge from '../labmap/LiveStatusBadge';
import toast from 'react-hot-toast';
import { 
  getTodayIST, 
  getNowISTMinutes, 
  formatTimeIST,
  formatDateIST,
  START_TIME_MINUTES,
  END_TIME_MINUTES,
  TIMELINE_DURATION
} from '../../utils/time';

// Booking Detail Modal Component
const BookingModal = ({ booking, isOpen, onClose }) => {
  if (!isOpen || !booking) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold text-gray-800">Booking Details</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{booking.user_name}</p>
              <p className="text-sm text-gray-500">Booked by</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <MapPin size={18} className="text-gray-400" />
            <div>
              <p className="font-medium text-gray-900">{booking.lab_name}</p>
              <p className="text-sm text-gray-500">{booking.building}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Clock size={18} className="text-gray-400" />
            <div>
              <p className="font-medium text-gray-900">
                {booking.start_time?.slice(0, 5)} - {booking.end_time?.slice(0, 5)}
              </p>
              <p className="text-sm text-gray-500">
                {formatDateIST(booking.booking_date)}
              </p>
            </div>
          </div>
          
          {booking.purpose && (
            <div className="flex items-start gap-3">
              <FileText size={18} className="text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Purpose</p>
                <p className="text-sm text-gray-600">{booking.purpose}</p>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              booking.state === 'active' ? 'bg-green-100 text-green-800' :
              booking.state === 'future' ? 'bg-blue-100 text-blue-800' :
              booking.state === 'cancelled' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {booking.state === 'active' ? 'Currently Active' :
               booking.state === 'future' ? 'Upcoming' :
               booking.state === 'cancelled' ? 'Cancelled' : 'Past'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const TimelineView = () => {
  const {
    bookings,
    labs,
    loading,
    error,
    selectedDate,
    timeSlots,
    fetchTimeline,
    getBookingsByLab,
    getBookingState,
    setSelectedDate
  } = useTimeline();

  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [highlightedBookingId, setHighlightedBookingId] = useState(null);
  
  // Current time in IST minutes for red line positioning
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState(() => getNowISTMinutes());
  
  // Refs for scrolling
  const timelineRef = useRef(null);
  const containerRef = useRef(null);
  
  // Check for URL params (from redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const highlightId = params.get('highlight');
    const scrollToTime = params.get('time');
    
    if (highlightId) {
      setHighlightedBookingId(highlightId);
      // Clear highlight after 3 seconds
      setTimeout(() => setHighlightedBookingId(null), 3000);
    }
    
    // Store scroll target for after load
    if (scrollToTime) {
      sessionStorage.setItem('timelineScrollTarget', scrollToTime);
    }
  }, []);
  
  // PRODUCTION: Live current time indicator with tab visibility handling
  useEffect(() => {
    let interval;
    
    const updateCurrentTime = () => {
      setCurrentTimeMinutes(getNowISTMinutes());
    };
    
    // Update every minute
    interval = setInterval(updateCurrentTime, 60000);
    
    // Handle tab visibility change
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Update immediately when tab becomes visible
        updateCurrentTime();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Group labs by building for better organization
  const labsByBuilding = useMemo(() => {
    const grouped = {};
    labs.forEach(lab => {
      const building = lab.building || 'Unknown';
      if (!grouped[building]) {
        grouped[building] = [];
      }
      grouped[building].push(lab);
    });
    return grouped;
  }, [labs]);

  // Get bookings grouped by lab
  const bookingsByLab = useMemo(() => getBookingsByLab(), [getBookingsByLab]);

  // Handle date change
  const handleDateChange = async (date) => {
    setSelectedDate(date);
    setLastUpdated(new Date());
    // Clear stored scroll target on date change
    sessionStorage.removeItem('timelineScrollTarget');
  };

  // Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchTimeline(selectedDate);
      setLastUpdated(new Date());
      toast.success('Timeline refreshed');
    } catch (error) {
      toast.error('Failed to refresh timeline');
    } finally {
      setIsRefreshing(false);
    }
  };

  // PRODUCTION: Handle booking click - open modal
  const handleBookingClick = useCallback((booking) => {
    setSelectedBooking(booking);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedBooking(null);
  }, []);

  // PRODUCTION: Calculate booking block position and width (memoized)
  const timeToMinutes = useCallback((timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }, []);

  const calculateBookingStyle = useCallback((booking) => {
    const startMinutes = timeToMinutes(booking.start_time);
    const endMinutes = timeToMinutes(booking.end_time);
    
    const leftOffset = ((startMinutes - START_TIME_MINUTES) / TIMELINE_DURATION) * 100;
    const width = ((endMinutes - startMinutes) / TIMELINE_DURATION) * 100;
    
    return {
      left: `${leftOffset}%`,
      width: `${width}%`
    };
  }, [timeToMinutes]);

  // Calculate current time position for red line (only for today)
  const currentTimePosition = useMemo(() => {
    if (selectedDate !== getTodayIST()) return null;
    if (currentTimeMinutes < START_TIME_MINUTES || currentTimeMinutes > END_TIME_MINUTES) return null;
    
    return ((currentTimeMinutes - START_TIME_MINUTES) / TIMELINE_DURATION) * 100;
  }, [currentTimeMinutes, selectedDate]);

  // PRODUCTION: Memoize booking styles to prevent re-renders
  const bookingStyles = useMemo(() => {
    const styles = {};
    bookings.forEach(booking => {
      styles[booking.id] = calculateBookingStyle(booking);
    });
    return styles;
  }, [bookings, calculateBookingStyle]);

  // PRODUCTION: Auto-scroll to current time or stored target
  useEffect(() => {
    if (!containerRef.current || loading) return;
    
    const scrollToTarget = () => {
      const storedTime = sessionStorage.getItem('timelineScrollTarget');
      
      if (storedTime) {
        // Scroll to specific time from redirect
        const targetMinutes = timeToMinutes(storedTime);
        const position = ((targetMinutes - START_TIME_MINUTES) / TIMELINE_DURATION) * 100;
        
        const container = containerRef.current;
        const scrollLeft = (position / 100) * container.scrollWidth - container.clientWidth / 2;
        container.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' });
        
        sessionStorage.removeItem('timelineScrollTarget');
      } else if (selectedDate === getTodayIST() && currentTimePosition !== null) {
        // Scroll to current time
        const container = containerRef.current;
        const scrollLeft = (currentTimePosition / 100) * container.scrollWidth - container.clientWidth / 2;
        container.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' });
      }
    };
    
    // Delay scroll to ensure layout is complete
    const timer = setTimeout(scrollToTarget, 100);
    return () => clearTimeout(timer);
  }, [loading, selectedDate, currentTimePosition, timeToMinutes]);

  // Get booking color based on state
  const getBookingColor = (state, isHighlighted) => {
    const baseClasses = isHighlighted 
      ? 'ring-4 ring-yellow-400 ring-offset-2 z-20' 
      : 'z-5';
    
    switch (state) {
      case 'active':
        return `bg-green-500 border-green-600 text-white ${baseClasses}`;
      case 'future':
        return `bg-blue-500 border-blue-600 text-white ${baseClasses}`;
      case 'cancelled':
        return `bg-gray-400 border-gray-500 text-white line-through ${baseClasses}`;
      default:
        return `bg-gray-300 border-gray-400 text-gray-700 ${baseClasses}`;
    }
  };

  // Format time for display (IST 12-hour format)
  const formatTime = (time) => formatTimeIST(time);

  // Initialize timeline on mount
  useEffect(() => {
    fetchTimeline(selectedDate);
  }, []);

  if (loading && labs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">Loading timeline...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-red-500">
            <Filter size={20} />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading timeline</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Booking Detail Modal */}
      <BookingModal 
        booking={selectedBooking} 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
      />
      
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Lab Booking Timeline</h2>
            <p className="text-gray-600 mt-1">
              Real-time view of all lab bookings for {formatDateIST(selectedDate)}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Date Picker */}
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-gray-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                min={getTodayIST()}
                max={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            {/* Live Status Badge */}
            <LiveStatusBadge
              connected={true}
              lastUpdated={lastUpdated}
              isRefreshing={isRefreshing}
              onRefresh={handleRefresh}
            />
          </div>
        </div>

        {/* Timeline Container with ref for scrolling */}
        <div className="overflow-x-auto" ref={containerRef}>
          <div className="min-w-[1200px]">
            {/* Time Header */}
            <div className="flex border-b-2 border-gray-200 pb-2 mb-4">
              <div className="w-48 font-semibold text-gray-700 text-sm">Lab / Building</div>
              <div className="flex-1 relative">
                <div className="flex justify-between text-xs text-gray-600">
                  {timeSlots.map((slot, index) => (
                    <div key={index} className="text-center" style={{ minWidth: '60px' }}>
                      {formatTime(slot)}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Lab Rows */}
            <div className="space-y-2" ref={timelineRef}>
              {Object.entries(labsByBuilding).map(([building, buildingLabs]) => (
                <div key={building} className="mb-6">
                  {/* Building Header */}
                  <div className="bg-gray-100 px-3 py-2 rounded-t-lg font-semibold text-gray-700 text-sm">
                    {building}
                  </div>
                  
                  {/* Labs in this building */}
                  {buildingLabs.map((lab) => (
                    <div key={lab.id} className="flex border-b border-gray-200 py-3 hover:bg-gray-50">
                      {/* Lab Info */}
                      <div className="w-48 pr-4">
                        <div className="font-medium text-gray-800">{lab.name}</div>
                        <div className="text-sm text-gray-600 flex items-center gap-2">
                          <Users size={14} />
                          {lab.capacity} seats
                          {lab.is_ac && (
                            <span className="text-blue-500 text-xs">AC</span>
                          )}
                        </div>
                      </div>

                      {/* Timeline Row */}
                      <div className="flex-1 relative h-12 bg-gray-50 rounded">
                        {/* Time grid lines */}
                        {timeSlots.map((slot, index) => (
                          <div
                            key={index}
                            className="absolute top-0 bottom-0 border-l border-gray-200"
                            style={{ left: `${(index / (timeSlots.length - 1)) * 100}%` }}
                          />
                        ))}

                        {/* Current time indicator - PRODUCTION: uses memoized position */}
                        {currentTimePosition !== null && (
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 transition-all duration-1000"
                            style={{ left: `${currentTimePosition}%` }}
                          />
                        )}

                        {/* Bookings - PRODUCTION: memoized styles, click handler, hover tooltip */}
                        {bookingsByLab[lab.id]?.map((booking) => {
                          const isHighlighted = highlightedBookingId === booking.id;
                          return (
                            <div
                              key={booking.id}
                              className={`absolute top-1 bottom-1 rounded-md border-2 ${getBookingColor(booking.state, isHighlighted)} cursor-pointer hover:opacity-90 transition-all duration-200 group`}
                              style={bookingStyles[booking.id] || calculateBookingStyle(booking)}
                              onClick={() => handleBookingClick(booking)}
                            >
                              <div className="px-2 py-1 text-xs font-medium truncate">
                                {booking.user_name}
                              </div>
                              <div className="px-2 text-xs opacity-90">
                                {booking.start_time?.slice(0, 5)}
                              </div>
                              
                              {/* Hover Tooltip */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                                <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-xl whitespace-nowrap">
                                  <p className="font-medium">{booking.user_name}</p>
                                  <p>{formatTimeIST(booking.start_time)} - {formatTimeIST(booking.end_time)}</p>
                                  {booking.purpose && <p className="text-gray-300 mt-1">{booking.purpose}</p>}
                                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-gray-600">Active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-gray-600">Future</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-400 rounded"></div>
              <span className="text-gray-600">Cancelled</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-red-500"></div>
              <span className="text-gray-600">Current Time</span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <div className="w-4 h-4 border-4 border-yellow-400 rounded"></div>
              <span className="text-gray-600">Highlighted</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TimelineView;
