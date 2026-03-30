import React, { useState, useEffect } from 'react'
import { adminApi } from '../../api/admin'
import { Search, Calendar, Clock, User, Check, X, Eye } from 'lucide-react'
import LoadingSpinner from '../common/LoadingSpinner'
import { formatDate, formatTime } from '../../utils/formatters'
import toast from 'react-hot-toast'

const BookingManager = () => {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('all')
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    pending: 0,
  })

  useEffect(() => {
    fetchBookings()
    
    // Set up periodic check every 30 seconds to auto-complete bookings
    const interval = setInterval(fetchBookings, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const fetchBookings = async () => {
    try {
      // First, trigger auto-completion of expired bookings
      try {
        await adminApi.autoCompleteExpiredBookings()
      } catch (error) {
        console.error('Auto-complete failed:', error)
      }
      
      // Then fetch all bookings
      const response = await adminApi.getAllBookings()
      let bookings = response.data.bookings
      
      setBookings(bookings)
      
      // Calculate stats
      const today = new Date().toISOString().split('T')[0]
      setStats({
        total: bookings.length,
        today: bookings.filter(b => b.booking_date === today).length,
        pending: bookings.filter(b => b.status === 'pending').length,
      })
    } catch (error) {
      toast.error('Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }

  const updateBookingStatus = async (id, status) => {
    try {
      await adminApi.updateBookingStatus(id, status)
      toast.success(`Booking ${status}`)
      fetchBookings()
    } catch (error) {
      toast.error(`Failed to ${status} booking`)
    }
  }

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = 
      booking.lab_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.bc_number?.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (filter === 'all') return matchesSearch
    return matchesSearch && booking.status === filter
  })

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div>
      {/* Header */}
      <h2 className="text-2xl font-bold text-ocean mb-6">Booking Management</h2>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-teal/5 p-4 rounded-xl">
          <p className="text-2xl font-bold text-teal">{stats.total}</p>
          <p className="text-sm text-ocean">Total Bookings</p>
        </div>
        <div className="bg-teal/5 p-4 rounded-xl">
          <p className="text-2xl font-bold text-teal">{stats.today}</p>
          <p className="text-sm text-ocean">Today's Bookings</p>
        </div>
        <div className="bg-teal/5 p-4 rounded-xl">
          <p className="text-2xl font-bold text-teal">{stats.pending}</p>
          <p className="text-sm text-ocean">Pending</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-teal" size={18} />
          <input
            type="text"
            placeholder="Search by lab, user, or BC number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-teal/20 focus:border-teal focus:outline-none"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-3 rounded-xl border-2 border-teal/20 focus:border-teal focus:outline-none"
        >
          <option value="all">All Bookings</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Bookings Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-r from-teal to-teal-light text-white">
              <th className="px-4 py-3 text-left rounded-tl-xl">Lab</th>
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">BC Number</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Time</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left rounded-tr-xl">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.map((booking, index) => (
              <tr key={booking.id} className={`border-b border-teal/10 hover:bg-teal/5 transition-colors ${index % 2 === 0 ? 'bg-white/50' : ''}`}>
                <td className="px-4 py-3 font-medium">{booking.lab_name}</td>
                <td className="px-4 py-3">{booking.user_name}</td>
                <td className="px-4 py-3">{booking.bc_number}</td>
                <td className="px-4 py-3">{formatDate(booking.booking_date)}</td>
                <td className="px-4 py-3">
                  {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    booking.status === 'confirmed' ? 'bg-teal text-white' :
                    booking.status === 'pending' ? 'bg-yellow-400 text-white' :
                    booking.status === 'cancelled' ? 'bg-tata-red text-white' :
                    booking.status === 'completed' ? 'bg-green-500 text-white' :
                    'bg-gray-400 text-white'
                  }`}>
                    {booking.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {booking.status === 'pending' && (
                      <>
                        <button
                          onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                          className="p-2 rounded-lg bg-teal/10 text-teal hover:bg-teal/20 transition-colors"
                          title="Confirm"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                          className="p-2 rounded-lg bg-tata-red/10 text-tata-red hover:bg-tata-red/20 transition-colors"
                          title="Reject"
                        >
                          <X size={16} />
                        </button>
                      </>
                    )}
                    <button
                      className="p-2 rounded-lg bg-teal/10 text-teal hover:bg-teal/20 transition-colors"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredBookings.length === 0 && (
          <div className="text-center py-12">
            <p className="text-teal">No bookings found</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default BookingManager