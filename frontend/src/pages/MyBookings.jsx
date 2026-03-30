import React, { useState, useMemo } from 'react'
import { useBookings } from '../hooks/useBookings'
import { bookingsApi } from '../api/bookings'
import BookingCard from '../components/bookings/BookingCard'
import LoadingSpinner from '../components/common/LoadingSpinner'
import EditBookingModal from '../components/bookings/EditBookingModal'
import CancelBookingModal from '../components/bookings/CancelBookingModal'
import { Calendar, Clock, XCircle, CheckCircle, AlertCircle, Filter, Search, Building2, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const MyBookings = () => {
  const [activeTab, setActiveTab] = useState('upcoming')
  const [searchTerm, setSearchTerm] = useState('')
  const [labFilter, setLabFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState(null)
  const { classifiedBookings, loading, error, refetch, cancelBooking, updateBooking, actionLoading } = useBookings()
  const { user } = useAuth()

  // PRODUCTION: Real filters with useMemo (search, lab, date)
  const filteredBookings = useMemo(() => {
    const filterBookings = (bookings) => {
      return bookings.filter(booking => {
        // Search filter
        if (searchTerm.trim()) {
          const searchLower = searchTerm.toLowerCase()
          const matchesSearch = 
            booking.lab_name?.toLowerCase().includes(searchLower) ||
            booking.purpose?.toLowerCase().includes(searchLower) ||
            booking.booking_date?.includes(searchLower) ||
            booking.start_time?.includes(searchLower)
          if (!matchesSearch) return false
        }
        
        // Lab filter
        if (labFilter && booking.lab_name !== labFilter) return false
        
        // Date filter
        if (dateFilter && booking.booking_date !== dateFilter) return false
        
        return true
      })
    }

    return {
      upcoming: filterBookings(classifiedBookings.upcoming),
      completed: filterBookings(classifiedBookings.completed),
      cancelled: filterBookings(classifiedBookings.cancelled)
    }
  }, [classifiedBookings, searchTerm, labFilter, dateFilter])

  // Get unique labs for filter dropdown
  const availableLabs = useMemo(() => {
    const labs = new Set()
    Object.values(classifiedBookings).flat().forEach(b => {
      if (b.lab_name) labs.add(b.lab_name)
    })
    return Array.from(labs).sort()
  }, [classifiedBookings])

  // Get current tab bookings
  const currentBookings = filteredBookings[activeTab] || []

  // Handle edit booking
  const handleEditBooking = (booking) => {
    setSelectedBooking(booking)
    setShowEditModal(true)
  }

  // Handle cancel booking
  const handleCancelBooking = (booking) => {
    setSelectedBooking(booking)
    setShowCancelModal(true)
  }

  // Handle edit submit with loading state
  const handleEditSubmit = async (updatedData) => {
    if (!selectedBooking) return
    
    try {
      const result = await updateBooking(selectedBooking.id, updatedData)
      if (result.success) {
        toast.success('Booking updated successfully!')
        setShowEditModal(false)
        setSelectedBooking(null)
      }
    } catch (error) {
      console.error('Failed to update booking:', error)
    }
  }

  // Handle cancel confirm with loading state
  const handleCancelConfirm = async () => {
    if (!selectedBooking) return
    
    try {
      const result = await cancelBooking(selectedBooking.id)
      if (result.success) {
        toast.success('Booking cancelled successfully!')
        setShowCancelModal(false)
        setSelectedBooking(null)
      }
    } catch (error) {
      console.error('Failed to cancel booking:', error)
    }
  }

  // Tab configuration
  const tabs = [
    {
      id: 'upcoming',
      label: 'Upcoming',
      icon: Calendar,
      count: filteredBookings.upcoming.length,
      color: 'text-teal'
    },
    {
      id: 'completed',
      label: 'Completed',
      icon: CheckCircle,
      count: filteredBookings.completed.length,
      color: 'text-green-600'
    },
    {
      id: 'cancelled',
      label: 'Cancelled',
      icon: XCircle,
      count: filteredBookings.cancelled.length,
      color: 'text-red-600'
    }
  ]

  if (loading) {
    return <LoadingSpinner fullScreen message='Loading your bookings...' />
  }

  if (error) {
    return (
      <div className='min-h-[70vh] flex items-center justify-center p-6'>
        <div className='bg-white/95 backdrop-blur-xl rounded-2xl p-8 max-w-md text-center shadow-2xl border border-tata-red/20'>
          <AlertCircle size={48} className='mx-auto text-tata-red mb-4' />
          <h2 className='text-2xl font-bold text-ocean mb-3'>Unable to load bookings</h2>
          <p className='text-gray-600 mb-6'>{error}</p>
          <button onClick={refetch} className='tata-btn'>
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-cream via-peach to-pink-soft'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* Header */}
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-ocean mb-2'>My Bookings</h1>
          <p className='text-gray-600'>Manage your lab bookings and reservations</p>
        </div>

        {/* Search and Filter Bar */}
        <div className='mb-6 space-y-4'>
          <div className='flex flex-wrap gap-4 items-center'>
            {/* Search */}
            <div className='relative flex-1 min-w-[200px] max-w-md'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' size={20} />
              <input
                type='text'
                placeholder='Search bookings...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none focus:ring-4 focus:ring-teal/10 transition-all'
              />
            </div>
            
            {/* Lab Filter */}
            {availableLabs.length > 0 && (
              <div className='relative'>
                <Building2 className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' size={18} />
                <select
                  value={labFilter}
                  onChange={(e) => setLabFilter(e.target.value)}
                  className='pl-10 pr-8 py-3 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none focus:ring-4 focus:ring-teal/10 transition-all bg-white appearance-none cursor-pointer'
                >
                  <option value=''>All Labs</option>
                  {availableLabs.map(lab => (
                    <option key={lab} value={lab}>{lab}</option>
                  ))}
                </select>
              </div>
            )}
            
            {/* Date Filter */}
            <div className='relative'>
              <Calendar className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' size={18} />
              <input
                type='date'
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className='pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none focus:ring-4 focus:ring-teal/10 transition-all'
              />
            </div>
            
            {/* Clear Filters */}
            {(searchTerm || labFilter || dateFilter) && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setLabFilter('')
                  setDateFilter('')
                }}
                className='px-4 py-3 text-sm text-gray-600 hover:text-teal transition-colors'
              >
                Clear filters
              </button>
            )}
          </div>
          
          {/* Active filters indicator */}
          {(searchTerm || labFilter || dateFilter) && (
            <div className='flex gap-2 text-sm text-gray-500'>
              <Filter size={14} className='mt-0.5' />
              <span>
                Showing {currentBookings.length} result{currentBookings.length !== 1 ? 's' : ''}
                {searchTerm && ` for "${searchTerm}"`}
                {labFilter && ` in ${labFilter}`}
                {dateFilter && ` on ${dateFilter}`}
              </span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className='mb-6'>
          <div className='border-b border-gray-200'>
            <nav className='-mb-px flex space-x-8'>
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors
                      ${
                        activeTab === tab.id
                          ? 'border-teal text-teal'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon size={18} />
                    {tab.label}
                    {tab.count > 0 && (
                      <span className='ml-2 px-2 py-1 text-xs rounded-full bg-gray-100'>
                        {tab.count}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Bookings List */}
        <div className='space-y-4'>
          {currentBookings.length === 0 ? (
            <div className='bg-white/95 backdrop-blur-xl rounded-2xl p-8 text-center shadow-lg'>
              <div className='w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                <Calendar size={32} className='text-gray-400' />
              </div>
              <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                {activeTab === 'upcoming' && 'No upcoming bookings'}
                {activeTab === 'completed' && 'No completed bookings'}
                {activeTab === 'cancelled' && 'No cancelled bookings'}
              </h3>
              <p className='text-gray-600'>
                {activeTab === 'upcoming' && 'Book a lab to see your upcoming reservations here.'}
                {activeTab === 'completed' && 'Your completed bookings from the last 7 days will appear here.'}
                {activeTab === 'cancelled' && 'Your cancelled bookings will appear here.'}
              </p>
            </div>
          ) : (
            currentBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onEdit={activeTab === 'upcoming' ? handleEditBooking : undefined}
                onCancel={activeTab === 'upcoming' ? handleCancelBooking : undefined}
                showActions={activeTab === 'upcoming'}
                isLoading={actionLoading[booking.id]}
              />
            ))
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedBooking && (
        <EditBookingModal
          booking={selectedBooking}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setSelectedBooking(null)
          }}
          onSubmit={handleEditSubmit}
        />
      )}

      {/* Cancel Modal with Loading State */}
      {showCancelModal && selectedBooking && (
        <CancelBookingModal
          booking={selectedBooking}
          isOpen={showCancelModal}
          onClose={() => {
            setShowCancelModal(false)
            setSelectedBooking(null)
          }}
          onConfirm={handleCancelConfirm}
          isLoading={actionLoading[selectedBooking?.id]}
        />
      )}
    </div>
  )
}

export default MyBookings
