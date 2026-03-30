import React from 'react';
import { TrendingUp, Calendar } from 'lucide-react';

const UtilizationTable = ({ data }) => {
  // Filter labs with bookings and sort by bookings (descending)
  const labsWithBookings = data
    .filter(lab => lab.total_bookings > 0)
    .sort((a, b) => b.total_bookings - a.total_bookings);

  return (
    <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-6 shadow-lg">
      <h3 className="text-lg font-semibold text-ocean mb-4 flex items-center gap-2">
        <TrendingUp size={18} className="text-teal" />
        Top Labs by Bookings
      </h3>

      <div className="space-y-4">
        {labsWithBookings.slice(0, 5).map((lab) => (
          <div key={lab.id} className="flex items-center justify-between p-3 bg-teal/5 rounded-xl">
            <div>
              <p className="font-medium text-ocean">{lab.name}</p>
              <p className="text-xs text-teal">{lab.total_bookings} booking{lab.total_bookings !== 1 ? 's' : ''}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-teal">{lab.total_hours} hrs</p>
              <p className="text-xs text-ocean/60">hours booked</p>
            </div>
          </div>
        ))}
      </div>

      {labsWithBookings.length === 0 && (
        <div className="text-center py-8">
          <Calendar size={32} className="mx-auto text-teal/30 mb-2" />
          <p className="text-teal">No labs utilized in this period</p>
        </div>
      )}
    </div>
  );
};

export default UtilizationTable;