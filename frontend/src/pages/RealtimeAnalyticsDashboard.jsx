import React from 'react';
import { useRealtimeAnalytics } from '../hooks/useRealtimeAnalytics';
import { 
  Activity, 
  Clock, 
  Building2, 
  Users, 
  TrendingUp, 
  Calendar,
  AlertCircle,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const StatCard = ({ title, value, subtitle, icon: Icon, color, trend }) => (
  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        {trend && (
          <p className={`text-xs mt-1 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </p>
        )}
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);

const ActiveBookingCard = ({ booking }) => (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-2">
    <div className="flex justify-between items-start">
      <div>
        <p className="font-semibold text-blue-900">{booking.lab_name}</p>
        <p className="text-sm text-blue-700">{booking.building}</p>
        <p className="text-xs text-blue-600 mt-1">{booking.user_name} ({booking.department})</p>
      </div>
      <div className="text-right">
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Active
        </span>
        <p className="text-sm text-blue-800 mt-1">{booking.start_time_ist} - {booking.end_time_ist}</p>
      </div>
    </div>
  </div>
);

const RealtimeAnalyticsDashboard = () => {
  const { 
    analytics, 
    realtimeSnapshot, 
    loading, 
    error, 
    lastUpdate, 
    connected, 
    refresh 
  } = useRealtimeAnalytics();

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <AlertCircle className="w-6 h-6 text-red-600 mr-3" />
          <div>
            <p className="font-semibold text-red-900">Error loading analytics</p>
            <p className="text-sm text-red-700">{error}</p>
            <button 
              onClick={refresh}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-600">No analytics data available</p>
        <button 
          onClick={refresh}
          className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Load Analytics
        </button>
      </div>
    );
  }

  const { overview, lab_metrics, most_used_lab, peak_hour, status_distribution, hourly_distribution, active_bookings_now } = analytics;

  // Format timestamp
  const formatTime = (date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Real-Time Analytics</h2>
          <p className="text-sm text-gray-600 mt-1">
            Using ALL bookings data • Updated {formatTime(lastUpdate)}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {connected ? (
              <Wifi className="w-5 h-5 text-green-600" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-600" />
            )}
            <span className={`text-sm ${connected ? 'text-green-600' : 'text-red-600'}`}>
              {connected ? 'Live' : 'Offline'}
            </span>
          </div>
          <button
            onClick={refresh}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Bookings"
          value={overview.total_bookings}
          subtitle="All time"
          icon={Calendar}
          color="bg-blue-500"
        />
        <StatCard
          title="Active Now"
          value={overview.active_bookings}
          subtitle={`${overview.active_labs} labs in use`}
          icon={Activity}
          color="bg-green-500"
        />
        <StatCard
          title="Upcoming"
          value={overview.upcoming_bookings}
          subtitle="Future bookings"
          icon={Clock}
          color="bg-orange-500"
        />
        <StatCard
          title="Completed"
          value={overview.completed_bookings}
          subtitle={`${overview.cancelled_bookings} cancelled`}
          icon={TrendingUp}
          color="bg-purple-500"
        />
      </div>

      {/* Second Row Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Avg Duration"
          value={`${overview.avg_duration_hours}h`}
          subtitle="Per booking"
          icon={Clock}
          color="bg-indigo-500"
        />
        <StatCard
          title="Active Labs"
          value={`${overview.active_labs}/${overview.total_labs}`}
          subtitle={`${((overview.active_labs / overview.total_labs) * 100).toFixed(1)}% utilization`}
          icon={Building2}
          color="bg-teal-500"
        />
        <StatCard
          title="Peak Hour"
          value={peak_hour?.formatted || 'N/A'}
          subtitle={`${peak_hour?.count || 0} bookings`}
          icon={Users}
          color="bg-pink-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Bookings Now */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Active Bookings ({active_bookings_now.count})
          </h3>
          <div className="max-h-80 overflow-y-auto">
            {active_bookings_now.bookings.length > 0 ? (
              active_bookings_now.bookings.map(booking => (
                <ActiveBookingCard key={booking.id} booking={booking} />
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No active bookings</p>
            )}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Distribution</h3>
          <div className="space-y-3">
            {[
              { label: 'Active', value: status_distribution.active, color: 'bg-green-500' },
              { label: 'Upcoming', value: status_distribution.upcoming, color: 'bg-blue-500' },
              { label: 'Completed', value: status_distribution.completed, color: 'bg-purple-500' },
              { label: 'Pending', value: status_distribution.pending, color: 'bg-yellow-500' },
              { label: 'Cancelled', value: status_distribution.cancelled, color: 'bg-red-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center">
                <div className="w-24 text-sm text-gray-600">{label}</div>
                <div className="flex-1 mx-3">
                  <div className="h-2 bg-gray-200 rounded-full">
                    <div 
                      className={`h-2 rounded-full ${color}`}
                      style={{ width: `${(value / status_distribution.total) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="w-12 text-right text-sm font-medium">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hourly Distribution Chart */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Hourly Booking Distribution</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourly_distribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="hour" 
                tickFormatter={(hour) => `${String(hour).padStart(2, '0')}:00`}
              />
              <YAxis />
              <Tooltip 
                formatter={(value, name, props) => [`${value} bookings`, `${String(props.payload.hour).padStart(2, '0')}:00`]}
              />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Lab Utilization Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Lab Utilization Rankings</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lab</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Building</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bookings</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilization</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {lab_metrics.slice(0, 10).map((lab, index) => (
                <tr key={lab.lab_id} className={index < 3 ? 'bg-yellow-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {index < 3 ? `🥇🥈🥉`[index] : index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lab.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lab.building}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lab.total_bookings}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lab.total_booked_hours}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${Math.min(lab.utilization_percentage, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">{lab.utilization_percentage}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{lab.revenue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Most Used Lab Card */}
      {most_used_lab && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-sm p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">Most Popular Lab</p>
              <p className="text-2xl font-bold">{most_used_lab.name}</p>
              <p className="text-blue-100">{most_used_lab.building} • {most_used_lab.total_bookings} bookings</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{most_used_lab.total_bookings}</p>
              <p className="text-blue-100">Total Bookings</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealtimeAnalyticsDashboard;
