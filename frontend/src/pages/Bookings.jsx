import React, { useState, useEffect } from 'react'
import { useBookings } from '../hooks/useBookings'
import { bookingsApi } from '../api/bookings'
import BookingList from '../components/bookings/BookingList'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { Calendar, Clock, XCircle, Filter, Search, ChevronDown, CalendarDays, User, Building2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const Bookings = () => {
  const [activeTab, setActiveTab] = useState('upcoming')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('date')
  const [sortOrder, setSortOrder] = useState('desc')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [statusFilter, setStatusFilter] = useState('all')
  const [buildingFilter, setBuildingFilter] = useState('all')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const { bookings, loading, error, refetch } = useBookings()
  const [upcomingBookings, setUpcomingBookings] = useState([])
  const [upcomingLoading, setUpcomingLoading] = useState(false)
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  // Fetch upcoming bookings from API
  const fetchUpcomingBookings = async () => {
    setUpcomingLoading(true)
    try {
      const response = await bookingsApi.getUpcoming()
      setUpcomingBookings(response.data.bookings || [])
    } catch (error) {
      console.error('Failed to fetch upcoming bookings:', error)
      toast.error('Failed to fetch upcoming bookings')
    } finally {
      setUpcomingLoading(false)
    }
  }

  // Fetch upcoming bookings on component mount and when tab changes
  useEffect(() => {
    if (activeTab === 'upcoming') {
      fetchUpcomingBookings()
    }
  }, [activeTab])

  // Add event listener for clear filters
  useEffect(() => {
    const handleClearFilters = () => {
      clearFilters()
    }
    
    const handleBookingCancelled = () => {
      if (activeTab === 'upcoming') {
        fetchUpcomingBookings()
      }
    }
    
    window.addEventListener('clearFilters', handleClearFilters)
    window.addEventListener('bookingCancelled', handleBookingCancelled)
    
    return () => {
      window.removeEventListener('clearFilters', handleClearFilters)
      window.removeEventListener('bookingCancelled', handleBookingCancelled)
    }
  }, [activeTab])

  const pastBookings = bookings.filter(b => new Date(b.booking_date) < new Date() || b.status === 'cancelled')

  // Get unique buildings from bookings
  const getUniqueBuildings = (bookingsList) => {
    const buildings = [...new Set(bookingsList.map(b => b.building).filter(Boolean))]
    return buildings.sort()
  }

  // Filter and sort bookings
  const filterAndSortBookings = (bookingsList) => {
    let filtered = bookingsList

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(booking => 
        booking.lab_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.building?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.purpose?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.bc_number?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Date range filter
    if (dateRange.start) {
      filtered = filtered.filter(booking => 
        new Date(booking.booking_date) >= new Date(dateRange.start)
      )
    }
    if (dateRange.end) {
      filtered = filtered.filter(booking => 
        new Date(booking.booking_date) <= new Date(dateRange.end)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter)
    }

    // Building filter
    if (buildingFilter !== 'all') {
      filtered = filtered.filter(booking => booking.building === buildingFilter)
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.booking_date) - new Date(b.booking_date)
          break
        case 'lab':
          comparison = a.lab_name?.localeCompare(b.lab_name) || 0
          break
        case 'status':
          comparison = a.status?.localeCompare(b.status) || 0
          break
        case 'duration':
          comparison = (a.duration_hours || 0) - (b.duration_hours || 0)
          break
        case 'created':
          comparison = new Date(a.created_at) - new Date(b.created_at)
          break
        default:
          comparison = 0
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }

  const handleUpdate = () => {
    refetch()
    if (activeTab === 'upcoming') {
      fetchUpcomingBookings()
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSortBy('date')
    setSortOrder('desc')
    setDateRange({ start: '', end: '' })
    setStatusFilter('all')
    setBuildingFilter('all')
  }

  const hasActiveFilters = searchTerm || dateRange.start || dateRange.end || 
                          statusFilter !== 'all' || buildingFilter !== 'all'

  const currentBookings = activeTab === 'upcoming' ? upcomingBookings : pastBookings
  const filteredBookings = filterAndSortBookings(currentBookings)

  // Conditional rendering - AFTER all hooks are called
  if (loading && upcomingLoading) {
    return <LoadingSpinner fullScreen message="Loading your bookings..." />
  }

  if (error) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-8 max-w-md text-center shadow-2xl border border-tata-red/20">
          <div className="w-20 h-20 bg-tata-red/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <XCircle size={40} className="text-tata-red" />
          </div>
          <h2 className="text-2xl font-bold text-ocean mb-3">Failed to load bookings</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button onClick={refetch} className="tata-btn">
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream via-peach to-pink-soft py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-teal to-teal-light bg-clip-text text-transparent mb-2">
            {isAdmin ? 'All Bookings' : 'My Bookings'}
          </h1>
          <p className="text-ocean/70 text-lg">
            {isAdmin ? 'Manage all lab reservations' : 'Manage your lab reservations'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-1 shadow-lg inline-flex">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
                activeTab === 'upcoming'
                  ? 'bg-gradient-to-r from-teal to-teal-light text-white shadow-lg'
                  : 'text-ocean hover:bg-teal/10'
              }`}
            >
              <Calendar size={18} />
              Upcoming ({upcomingBookings.length})
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
                activeTab === 'past'
                  ? 'bg-gradient-to-r from-teal to-teal-light text-white shadow-lg'
                  : 'text-ocean hover:bg-teal/10'
              }`}
            >
              <Clock size={18} />
              Past ({pastBookings.length})
            </button>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-6 mb-8 shadow-lg">
          {/* Basic Search */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
            <div className="md:col-span-5 relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-teal" />
              <input
                type="text"
                placeholder="Search by lab, building, purpose, or BC number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-teal/20 focus:border-teal focus:outline-none"
              />
            </div>

            <div className="md:col-span-2 relative">
              <Filter size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-teal" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full pl-10 pr-8 py-3 rounded-xl border-2 border-teal/20 focus:border-teal focus:outline-none appearance-none"
              >
                <option value="date">Sort by Date</option>
                <option value="lab">Sort by Lab</option>
                <option value="status">Sort by Status</option>
                <option value="duration">Sort by Duration</option>
                <option value="created">Sort by Created</option>
              </select>
            </div>

            <div className="md:col-span-2 relative">
              <ChevronDown size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-teal" />
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full pl-10 pr-8 py-3 rounded-xl border-2 border-teal/20 focus:border-teal focus:outline-none appearance-none"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>

            <div className="md:col-span-3 flex items-center gap-2">
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="flex-1 px-4 py-3 rounded-xl border-2 border-teal/20 text-ocean hover:bg-teal/10 transition-all flex items-center justify-center gap-2"
              >
                <CalendarDays size={18} />
                Advanced Filters
              </button>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-3 rounded-xl border-2 border-tata-red/20 text-tata-red hover:bg-tata-red/10 transition-all"
                  title="Clear all filters"
                >
                  <XCircle size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-teal/20">
              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-ocean mb-2">From Date</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border-2 border-teal/20 focus:border-teal focus:outline-none"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-ocean mb-2">To Date</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border-2 border-teal/20 focus:border-teal focus:outline-none"
                />
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-ocean mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-teal/20 focus:border-teal focus:outline-none appearance-none"
                >
                  <option value="all">All Status</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              {/* Building Filter */}
              <div>
                <label className="block text-sm font-medium text-ocean mb-2">Building</label>
                <select
                  value={buildingFilter}
                  onChange={(e) => setBuildingFilter(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-teal/20 focus:border-teal focus:outline-none appearance-none"
                >
                  <option value="all">All Buildings</option>
                  {getUniqueBuildings(currentBookings).map(building => (
                    <option key={building} value={building}>{building}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Results count */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-teal/20">
            <span className="text-sm text-ocean">
              Showing {filteredBookings.length} of {currentBookings.length} bookings
            </span>
            {activeTab === 'past' && (
              <div className="flex items-center gap-4 text-sm text-teal">
                <span>Confirmed: {currentBookings.filter(b => b.status === 'confirmed').length}</span>
                <span>Cancelled: {currentBookings.filter(b => b.status === 'cancelled').length}</span>
                <span>Completed: {currentBookings.filter(b => b.status === 'completed').length}</span>
              </div>
            )}
          </div>
        </div>

        {/* Bookings List */}
        <BookingList
          bookings={filteredBookings}
          isUpcoming={activeTab === 'upcoming'}
          onUpdate={handleUpdate}
          hasActiveFilters={hasActiveFilters}
        />
      </div>
    </div>
  )
}

export default Bookings