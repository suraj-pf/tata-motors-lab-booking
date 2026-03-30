import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import api from '../api/axios';
import { useSocket } from './useSocket';
import toast from 'react-hot-toast';
import { 
  getTodayIST, 
  getNowISTMinutes, 
  toISTMinutes,
  formatTimeIST,
  START_TIME_MINUTES,
  END_TIME_MINUTES,
  TIMELINE_DURATION
} from '../utils/time';

// Utility: Deduplicate bookings by ID, keeping newest
const deduplicateBookings = (bookings) => {
  const seen = new Map();
  bookings.forEach(booking => {
    const existing = seen.get(booking.id);
    if (!existing || (booking.updated_at && existing.updated_at && new Date(booking.updated_at) > new Date(existing.updated_at))) {
      seen.set(booking.id, booking);
    }
  });
  return Array.from(seen.values());
};

// Utility: Sort bookings by start time
const sortBookingsByTime = (bookings) => {
  return [...bookings].sort((a, b) => {
    const timeA = (a.start_time || '').replace(':', '');
    const timeB = (b.start_time || '').replace(':', '');
    return timeA.localeCompare(timeB);
  });
};

export const useTimeline = () => {
  const [bookings, setBookings] = useState([]);
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const { socket, connected } = useSocket();
  
  // PRODUCTION: Debounce ref for socket events
  const debounceTimer = useRef(null);
  const pendingUpdates = useRef([]);
  
  // Generate time slots for timeline - IST 6:30 AM to 5:00 PM
  const generateTimeSlots = useCallback(() => {
    const slots = [];
    // Start at 6:30, then hourly until 17:00
    slots.push('06:30');
    
    for (let hour = 7; hour <= 17; hour++) {
      slots.push(`${String(hour).padStart(2, '0')}:00`);
    }
    
    return slots;
  }, []);
  
  const timeSlots = useMemo(() => generateTimeSlots(), [generateTimeSlots]);
  
  // PRODUCTION: Process pending updates with debouncing
  const processPendingUpdates = useCallback(() => {
    if (pendingUpdates.current.length === 0) return;
    
    setBookings(prevBookings => {
      let newBookings = [...prevBookings];
      
      pendingUpdates.current.forEach(update => {
        switch (update.type) {
          case 'created':
            if (update.booking.booking_date === selectedDate) {
              const exists = newBookings.some(b => b.id === update.booking.id);
              if (!exists) newBookings.push(update.booking);
            }
            break;
          case 'updated':
            newBookings = newBookings.map(b => 
              b.id === update.booking.id ? { ...b, ...update.booking } : b
            );
            break;
          case 'cancelled':
            newBookings = newBookings.filter(b => b.id !== update.bookingId);
            break;
        }
      });
      
      pendingUpdates.current = [];
      return sortBookingsByTime(deduplicateBookings(newBookings));
    });
  }, [selectedDate]);
  
  // Debounced update handler (150ms)
  const queueUpdate = useCallback((update) => {
    pendingUpdates.current.push(update);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => processPendingUpdates(), 150);
  }, [processPendingUpdates]);
  
  // Fetch timeline data for specific date
  const fetchTimeline = useCallback(async (date = selectedDate) => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch all labs
      const labsResponse = await api.get('/labs', {
        params: { date }
      });
      setLabs(labsResponse.data.labs || []);
      
      // Fetch bookings for specific date
      const bookingsResponse = await api.get('/bookings', {
        params: {
          booking_date: date
        }
      });
      
      let bookingsData = bookingsResponse.data.bookings || [];
      
      // Enhance bookings with lab information
      const labsData = labsResponse.data.labs || [];
      bookingsData = bookingsData.map(booking => {
        const lab = labsData.find(l => l.id === booking.lab_id);
        return {
          ...booking,
          lab_name: lab ? lab.name : `Lab ${booking.lab_id}`,
          building: lab ? lab.building : 'Unknown',
          user_name: booking.user_name || `User ${booking.user_id}`
        };
      });
      
      // Sort bookings by start time
      bookingsData.sort((a, b) => {
        const timeA = (a.start_time || '').replace(':', '');
        const timeB = (b.start_time || '').replace(':', '');
        return timeA.localeCompare(timeB);
      });
      
      // PRODUCTION: Deduplicate and sort
      setBookings(sortBookingsByTime(deduplicateBookings(bookingsData)));
      setSelectedDate(date);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Failed to load timeline data';
      setError(errorMessage);
      toast.error('Failed to load timeline');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);
  
  // Get booking state using IST time calculations
  const getBookingState = useCallback((booking) => {
    const nowISTMinutes = getNowISTMinutes();
    const startISTMinutes = toISTMinutes(new Date(`${booking.booking_date}T${booking.start_time}`));
    const endISTMinutes = toISTMinutes(new Date(`${booking.booking_date}T${booking.end_time}`));
    
    if (startISTMinutes === null || endISTMinutes === null) return 'unknown';
    
    if (booking.status === 'cancelled') {
      return 'cancelled';
    }
    
    // Check if booking is on a different date
    const todayIST = getTodayIST();
    if (booking.booking_date !== todayIST) {
      // Past date = completed, Future date = future
      return booking.booking_date < todayIST ? 'past' : 'future';
    }
    
    // Same date - check time
    if (nowISTMinutes >= startISTMinutes && nowISTMinutes < endISTMinutes) {
      return 'active';
    }
    
    if (nowISTMinutes < startISTMinutes) {
      return 'future';
    }
    
    return 'past';
  }, []);
  
  // Group bookings by lab for timeline rendering
  const getBookingsByLab = useCallback(() => {
    const bookingsByLab = {};
    
    labs.forEach(lab => {
      bookingsByLab[lab.id] = [];
    });
    
    bookings.forEach(booking => {
      if (bookingsByLab[booking.lab_id]) {
        bookingsByLab[booking.lab_id].push({
          ...booking,
          state: getBookingState(booking)
        });
      }
    });
    
    return bookingsByLab;
  }, [labs, bookings, getBookingState]);

  // PRODUCTION-GRADE: Real-time updates with debouncing (150ms)
  useEffect(() => {
    if (!socket || !connected || !selectedDate) return;

    const handleBookingCreated = (data) => {
      if (data.booking?.booking_date === selectedDate) {
        queueUpdate({ type: 'created', booking: data.booking });
        toast.info(`New: ${data.booking.lab_name || 'Lab'} ${data.booking.start_time?.slice(0, 5)}`);
      }
    };

    const handleBookingUpdated = (data) => {
      if (data.booking?.booking_date === selectedDate) {
        queueUpdate({ type: 'updated', booking: data.booking });
        toast.info(`Updated: ${data.booking.lab_name || 'Lab'}`);
      }
    };

    const handleBookingCancelled = (data) => {
      const bookingDate = data.booking?.booking_date || data.booking_date;
      if (bookingDate === selectedDate) {
        queueUpdate({ type: 'cancelled', bookingId: data.booking?.id || data.bookingId });
        toast.info('Booking cancelled');
      }
    };

    const handleTimelineUpdate = (data) => {
      if (data.booking_date === selectedDate) {
        if (data.changes) {
          data.changes.forEach(change => queueUpdate(change));
        } else {
          fetchTimeline(selectedDate);
        }
      }
    };

    socket.on('booking-created', handleBookingCreated);
    socket.on('booking-updated', handleBookingUpdated);
    socket.on('booking-cancelled', handleBookingCancelled);
    socket.on('timeline-update', handleTimelineUpdate);

    return () => {
      socket.off('booking-created', handleBookingCreated);
      socket.off('booking-updated', handleBookingUpdated);
      socket.off('booking-cancelled', handleBookingCancelled);
      socket.off('timeline-update', handleTimelineUpdate);
      
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [socket, connected, selectedDate, queueUpdate, fetchTimeline]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  // Auto-refresh every 60 seconds as fallback
  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedDate && !loading) {
        fetchTimeline(selectedDate);
      }
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [selectedDate, loading, fetchTimeline]);

  return {
    bookings,
    labs,
    loading,
    error,
    selectedDate,
    timeSlots,
    fetchTimeline,
    getBookingsByLab,
    getBookingState,
    setSelectedDate,
  };
};
