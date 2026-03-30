import { useState, useEffect, useCallback, useRef } from 'react';
import { adminApi } from '../api/admin';
import { useSocket } from './useSocket';

export const useRealtimeAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [realtimeSnapshot, setRealtimeSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const { socket, connected } = useSocket();
  const refreshIntervalRef = useRef(null);

  // Fetch full analytics
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminApi.getFullAnalytics();
      if (response.data.success) {
        setAnalytics(response.data);
        setLastUpdate(new Date());
      }
    } catch (err) {
      console.error('[ANALYTICS] Fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch realtime snapshot
  const fetchRealtimeSnapshot = useCallback(async () => {
    try {
      const response = await adminApi.getRealtimeMetrics();
      if (response.data.success) {
        setRealtimeSnapshot(response.data);
      }
    } catch (err) {
      console.error('[ANALYTICS] Realtime fetch error:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchAnalytics();
    fetchRealtimeSnapshot();

    // Refresh every 30 seconds as fallback
    refreshIntervalRef.current = setInterval(() => {
      fetchRealtimeSnapshot();
    }, 30000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [fetchAnalytics, fetchRealtimeSnapshot]);

  // Listen for socket events
  useEffect(() => {
    if (!socket || !connected) return;

    // Join admin room for analytics updates
    socket.emit('join-room', 'admin-room');

    // Listen for full analytics updates
    socket.on('analytics-update', (data) => {
      console.log('[ANALYTICS] Received update via socket');
      setAnalytics(data);
      setLastUpdate(new Date());
    });

    // Listen for realtime snapshot updates
    socket.on('realtime-snapshot', (data) => {
      console.log('[ANALYTICS] Received realtime snapshot');
      setRealtimeSnapshot(data);
    });

    // Listen for booking events to trigger refresh
    const handleBookingChange = () => {
      // Debounce the refresh to avoid multiple rapid updates
      if (refreshIntervalRef.current) {
        clearTimeout(refreshIntervalRef.current);
      }
      refreshIntervalRef.current = setTimeout(() => {
        fetchRealtimeSnapshot();
      }, 500);
    };

    socket.on('booking-created', handleBookingChange);
    socket.on('booking-cancelled', handleBookingChange);
    socket.on('booking-updated', handleBookingChange);
    socket.on('booking-approved', handleBookingChange);
    socket.on('booking-rejected', handleBookingChange);

    return () => {
      socket.off('analytics-update');
      socket.off('realtime-snapshot');
      socket.off('booking-created', handleBookingChange);
      socket.off('booking-cancelled', handleBookingChange);
      socket.off('booking-updated', handleBookingChange);
      socket.off('booking-approved', handleBookingChange);
      socket.off('booking-rejected', handleBookingChange);
      socket.emit('leave-room', 'admin-room');
    };
  }, [socket, connected, fetchRealtimeSnapshot]);

  // Manual refresh function
  const refresh = useCallback(() => {
    fetchAnalytics();
    fetchRealtimeSnapshot();
  }, [fetchAnalytics, fetchRealtimeSnapshot]);

  return {
    analytics,
    realtimeSnapshot,
    loading,
    error,
    lastUpdate,
    connected,
    refresh
  };
};

export default useRealtimeAnalytics;
