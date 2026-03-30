import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Calendar } from 'lucide-react';

const AnalyticsChart = ({ data }) => {
  // Prepare data for the chart: lab name and total bookings
  const chartData = data
    .filter(lab => lab.total_bookings > 0) // only show labs with bookings
    .map(lab => ({
      name: lab.name.length > 15 ? lab.name.substring(0, 12) + '...' : lab.name,
      bookings: lab.total_bookings,
      hours: parseFloat(lab.total_hours),
    }))
    .sort((a, b) => b.bookings - a.bookings) // sort by most bookings
    .slice(0, 10); // limit to top 10 for readability

  if (chartData.length === 0) {
    return (
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-6 shadow-lg h-full flex flex-col items-center justify-center text-center">
        <Calendar size={48} className="text-teal/30 mb-4" />
        <h3 className="text-lg font-semibold text-ocean mb-2">No Booking Data</h3>
        <p className="text-teal">There are no bookings for the selected period.</p>
      </div>
    );
  }

  return (
    <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-6 shadow-lg h-full">
      <h3 className="text-lg font-semibold text-ocean mb-4">Bookings by Lab (Top 10)</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0f2f1" />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={80}
            tick={{ fill: '#2c3e50', fontSize: 12 }}
          />
          <YAxis tick={{ fill: '#2c3e50' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '1px solid #b2dfdb',
            }}
          />
          <Legend />
          <Bar dataKey="bookings" fill="#26a69a" name="Bookings" />
          {/* Optional second bar for hours */}
          {/* <Bar dataKey="hours" fill="#80cbc4" name="Hours" /> */}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AnalyticsChart;