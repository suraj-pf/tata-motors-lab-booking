import React, { useState, useEffect } from 'react'
import { adminApi } from '../../api/admin'
import { Search, Calendar, Clock, MapPin, User, Check, X, AlertCircle, Users, Filter } from 'lucide-react'
import LoadingSpinner from '../common/LoadingSpinner'
import toast from 'react-hot-toast'

const BookingApproval = () => {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [processing, setProcessing] = useState({})
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    fetchPendingBookings()
    
    // Set up periodic refresh every 30 seconds to check for new pending bookings
    const interval = setInterval(fetchPendingBookings, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const fetchPendingBookings = async () => {
    try {
      const response = await adminApi.getPendingBookings()
      setBookings(response.data.bookings || [])
    } catch (error) {
      toast.error('Failed to fetch pending bookings')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (bookingId, approved, reason = '') => {
    setProcessing(prev => ({ ...prev, [bookingId]: true }))
    
    try {
      await adminApi.approveBooking(bookingId, { approved, reason })
      toast.success(`Booking ${approved ? 'approved' : 'rejected'} successfully`)
      
      // Remove the booking from the list
      setBookings(prev => prev.filter(b => b.id !== bookingId))
    } catch (error) {
      toast.error(error.response?.data?.error || `Failed to ${approved ? 'approve' : 'reject'} booking`)
    } finally {
      setProcessing(prev => ({ ...prev, [bookingId]: false }))
    }
  }

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = 
      booking.lab_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.purpose?.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesSearch
  })

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-teal/20 text-teal'
      case 'pending':
        return 'bg-yellow/20 text-yellow-700'
      case 'rejected':
        return 'bg-tata-red/20 text-tata-red'
      default:
        return 'bg-gray/20 text-gray'
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-ocean">Booking Approval</h2>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <AlertCircle size={16} className="text-yellow-500" />
          <span>{bookings.length} pending bookings</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-teal" />
          <input
            type="text"
            placeholder="Search by lab, user, or purpose..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-teal/20 focus:border-teal focus:outline-none"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-yellow/5 p-4 rounded-xl text-center">
          <p className="text-2xl font-bold text-yellow-600">{bookings.length}</p>
          <p className="text-sm text-ocean">Pending Approval</p>
        </div>
        <div className="bg-teal/5 p-4 rounded-xl text-center">
          <p className="text-2xl font-bold text-teal">
            {bookings.filter(b => b.queue_position === 1).length}
          </p>
          <p className="text-sm text-ocean">First in Queue</p>
        </div>
        <div className="bg-orange/5 p-4 rounded-xl text-center">
          <p className="text-2xl font-bold text-orange-600">
            {Math.max(...bookings.map(b => b.queue_position || 0), 0)}
          </p>
          <p className="text-sm text-ocean">Max Queue Position</p>
        </div>
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        {filteredBookings.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-r from-teal to-teal-light rounded-full flex items-center justify-center mx-auto mb-6">
              <Check size={40} className="text-white" />
            </div>
            <h3 className="text-2xl font-bold text-ocean mb-3">All Caught Up!</h3>
            <p className="text-gray-600 text-lg mb-2">No pending bookings to approve</p>
            <p className="text-gray-500 text-sm">
              All booking requests have been processed. Check back later for new requests.
            </p>
            
            {/* Additional Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 max-w-4xl mx-auto">
              <div className="bg-teal/5 rounded-xl p-4 border border-teal/20">
                <div className="w-10 h-10 bg-teal/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Check size={20} className="text-teal" />
                </div>
                <h4 className="font-semibold text-ocean mb-1">Approvals Complete</h4>
                <p className="text-sm text-gray-600">All pending requests have been reviewed</p>
              </div>
              
              <div className="bg-blue/5 rounded-xl p-4 border border-blue/20">
                <div className="w-10 h-10 bg-blue/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Calendar size={20} className="text-blue" />
                </div>
                <h4 className="font-semibold text-ocean mb-1">Schedule Updated</h4>
                <p className="text-sm text-gray-600">Lab schedules are current and accurate</p>
              </div>
              
              <div className="bg-green/5 rounded-xl p-4 border border-green/20">
                <div className="w-10 h-10 bg-green/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <AlertCircle size={20} className="text-green" />
                </div>
                <h4 className="font-semibold text-ocean mb-1">System Running</h4>
                <p className="text-sm text-gray-600">Booking system operating normally</p>
              </div>
            </div>
            
            {/* Action Button */}
            <button
              onClick={fetchPendingBookings}
              className="mt-8 px-6 py-3 bg-teal hover:bg-teal/90 text-white rounded-xl font-medium transition-colors inline-flex items-center gap-2"
            >
              <AlertCircle size={18} />
              Refresh for New Requests
            </button>
          </div>
        ) : (
          filteredBookings.map((booking) => (
            <div key={booking.id} className="bg-white/95 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/30">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                {/* Booking Details */}
                <div className="flex-1">
                  <div className="flex items-start gap-4">
                    {/* Lab Info */}
                    <div className="w-12 h-12 bg-gradient-to-r from-teal to-teal-light rounded-xl flex items-center justify-center text-white shadow-lg">
                      <MapPin size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-ocean">{booking.lab_name}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(booking.status)}`}>
                          Queue #{booking.queue_position}
                        </span>
                      </div>
                      <p className="text-sm text-teal mb-3">{booking.building}</p>
                      
                      {/* Booking Info Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <User size={16} className="text-teal" />
                          <span className="text-sm text-ocean">{booking.user_name}</span>
                          <span className="text-xs text-gray-500">({booking.user_bc_number})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-teal" />
                          <span className="text-sm text-ocean">{formatDate(booking.booking_date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={16} className="text-teal" />
                          <span className="text-sm text-ocean">
                            {booking.start_time} - {booking.end_time}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users size={16} className="text-teal" />
                          <span className="text-sm text-ocean">{booking.user_department}</span>
                        </div>
                      </div>
                      
                      {booking.purpose && (
                        <div className="bg-cream/30 rounded-lg p-3">
                          <p className="text-sm text-ocean">
                            <span className="font-semibold">Purpose:</span> {booking.purpose}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3 lg:min-w-[200px]">
                  <div className="text-center mb-2">
                    <p className="text-xs text-gray-500">Requested</p>
                    <p className="text-sm text-ocean">
                      {new Date(booking.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => handleApprove(booking.id, true)}
                    disabled={processing[booking.id]}
                    className="tata-btn-secondary flex items-center justify-center gap-2"
                  >
                    {processing[booking.id] ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Check size={16} />
                    )}
                    Approve
                  </button>
                  
                  <button
                    onClick={() => handleApprove(booking.id, false)}
                    disabled={processing[booking.id]}
                    className="px-4 py-2 bg-tata-red hover:bg-tata-red/90 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {processing[booking.id] ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <X size={16} />
                    )}
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default BookingApproval
