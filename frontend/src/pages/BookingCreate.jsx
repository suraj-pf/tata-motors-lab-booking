import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useBookings } from '../hooks/useBookings'
import { labsApi } from '../api/labs'
import BookingForm from '../components/bookings/BookingForm'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { formatTime } from '../utils/timeUtils'
import toast from 'react-hot-toast'

const BookingCreate = () => {
  const { labId } = useParams()
  const navigate = useNavigate()
  const { createBooking } = useBookings()
  const [lab, setLab] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchLab = async () => {
      console.log('Fetching lab for ID:', labId)
      try {
        const response = await labsApi.getLabById(labId)
        console.log('Lab response:', response.data)
        setLab(response.data.lab)
      } catch (err) {
        console.error('Error fetching lab:', err)
        setError(err.response?.data?.message || err.response?.data?.error || 'Failed to load lab details')
        toast.error('Failed to load lab details')
      } finally {
        setLoading(false)
      }
    }

    if (labId) {
      fetchLab()
    }
  }, [labId])

  const handleSubmit = async (bookingData) => {
    try {
      await createBooking({
        lab_id: parseInt(labId),
        ...bookingData,
      })
      navigate('/bookings')
    } catch (error) {
      // Error is handled in hook
    }
  }

  if (loading) {
    console.log('BookingCreate: Still loading...')
    return <LoadingSpinner fullScreen message="Loading lab details..." />
  }

  if (error || !lab) {
    console.log('BookingCreate: Error or no lab', { error, lab })
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-8 max-w-md text-center shadow-2xl border border-tata-red/20">
          <div className="w-20 h-20 bg-tata-red/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertTriangle size={40} className="text-tata-red" />
          </div>
          <h2 className="text-2xl font-bold text-ocean mb-3">Lab not found</h2>
          <p className="text-gray-600 mb-6">{error || 'The lab you\'re looking for doesn\'t exist'}</p>
          <button onClick={() => navigate('/labs')} className="tata-btn">
            Back to Labs
          </button>
        </div>
      </div>
    )
  }

  console.log('BookingCreate: Rendering lab', lab)

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream via-peach to-pink-soft py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/labs')}
          className="mb-6 flex items-center gap-2 text-ocean hover:text-teal transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Labs
        </button>

        {/* Lab Info Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-6 mb-6 shadow-lg border border-white/30">
          <h1 className="text-3xl font-bold text-ocean mb-2">{lab.name}</h1>
          <p className="text-teal mb-4">{lab.building}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-teal/5 p-3 rounded-xl">
              <p className="text-xs text-teal mb-1">Capacity</p>
              <p className="font-bold text-ocean">{lab.capacity} seats</p>
            </div>
            <div className="bg-teal/5 p-3 rounded-xl">
              <p className="text-xs text-teal mb-1">AC</p>
              <p className="font-bold text-ocean">{lab.is_ac ? 'Yes' : 'No'}</p>
            </div>
            <div className="bg-teal/5 p-3 rounded-xl">
              <p className="text-xs text-teal mb-1">Owner</p>
              <p className="font-bold text-ocean">{lab.lab_owner}</p>
            </div>
            <div className="bg-teal/5 p-3 rounded-xl">
              <p className="text-xs text-teal mb-1">Hours</p>
              <p className="font-bold text-ocean">6:30 AM - 5:00 PM</p>
            </div>
          </div>
        </div>

        {/* Booking Form */}
        <BookingForm labId={labId} lab={lab} onSubmit={handleSubmit} />
      </div>
    </div>
  )
}

export default BookingCreate