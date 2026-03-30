import React from 'react'
import BookingCard from './BookingCard'
import { Calendar, Search, Filter } from 'lucide-react'

const BookingList = ({ bookings, isUpcoming, onUpdate, hasActiveFilters = false }) => {
  if (bookings.length === 0) {
    return (
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-16 text-center shadow-2xl">
        <div className="w-24 h-24 bg-teal/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
          {hasActiveFilters ? (
            <Search size={48} className="text-teal/50" />
          ) : (
            <Calendar size={48} className="text-teal/50" />
          )}
        </div>
        <h3 className="text-2xl font-bold text-ocean mb-2">
          {hasActiveFilters ? 'No bookings match your filters' : 'No bookings found'}
        </h3>
        <p className="text-teal mb-6">
          {hasActiveFilters 
            ? 'Try adjusting your search terms or filters to find what you\'re looking for.'
            : isUpcoming 
              ? 'Book a lab to get started!' 
              : 'No past bookings available.'
          }
        </p>
        {hasActiveFilters && (
          <div className="space-y-3">
            <p className="text-sm text-ocean/70">
              💡 Tip: Try clearing filters or searching with different keywords
            </p>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('clearFilters'))}
              className="px-6 py-3 rounded-xl border-2 border-teal/20 text-ocean hover:bg-teal/10 transition-all"
            >
              Clear Filters
            </button>
          </div>
        )}
        {!hasActiveFilters && isUpcoming && (
          <button
            onClick={() => window.location.href = '/labs'}
            className="tata-btn"
          >
            Browse Labs
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {bookings.map(booking => (
        <BookingCard
          key={booking.id}
          booking={booking}
          isUpcoming={isUpcoming}
          onUpdate={onUpdate}
        />
      ))}
    </div>
  )
}

export default BookingList