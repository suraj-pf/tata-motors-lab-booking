import React, { useState, useEffect } from 'react'
import { adminApi } from '../api/admin';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatCurrency, formatUtilization } from '../utils/formatters';
import toast from 'react-hot-toast'
import { 
  TrendingUp, 
  Calendar, 
  Users, 
  Clock, 
  DollarSign,
  BarChart3,
  Activity,
  Target,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalBookings: 0,
    utilization: 0,
    labsBooked: 0,
    revenue: 0,
    activeUsers: 0,
    totalHours: 0
  })
  const [analytics, setAnalytics] = useState([])
  const [dailyTrends, setDailyTrends] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('week')
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    fetchAnalytics()
  }, [filter, dateRange])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      
      let params
      if (filter === 'custom') {
        params = {
          start_date: dateRange.start,
          end_date: dateRange.end
        }
      } else {
        const end = new Date()
        let start = new Date()
        
        if (filter === 'week') {
          start.setDate(end.getDate() - 7)
        } else if (filter === 'month') {
          start.setMonth(end.getMonth() - 1)
        }
        
        params = {
          start_date: start.toISOString().split('T')[0],
          end_date: end.toISOString().split('T')[0]
        }
      }
      
      console.log('Fetching analytics with params:', params)
      const response = await adminApi.getAnalytics(params)
      
      console.log('Analytics response:', response.data)
      
      if (response.data.success) {
        const data = response.data
        setAnalytics(data.utilization || [])
        setDailyTrends(data.dailyTrends || [])
        setStats({
          totalBookings: data.summary?.total_bookings || 0,
          utilization: data.summary?.overall_utilization || 0,
          labsBooked: data.summary?.labs_used || 0,
          revenue: data.summary?.total_revenue || 0,
          activeUsers: data.summary?.active_users || 0,
          totalHours: data.summary?.total_hours_booked || 0
        })
      } else {
        throw new Error(data.error || 'Failed to load analytics')
      }
    } catch (error) {
      console.error('Dashboard error:', error)
      setError(error.response?.data?.error || error.message || 'Failed to load analytics')
      toast.error(error.response?.data?.error || error.message || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  const handleDateRangeChange = (e) => {
    setDateRange({ ...dateRange, [e.target.name]: e.target.value })
    setFilter('custom')
  }

  const retryFetch = () => {
    fetchAnalytics()
  }

  // Prepare data for charts
  const utilizationChartData = analytics
    .filter(lab => lab.total_bookings > 0)
    .map(lab => ({
      name: lab.name.length > 15 ? lab.name.substring(0, 12) + '...' : lab.name,
      utilization: parseFloat(lab.utilization_percentage || 0),
      bookings: lab.total_bookings,
      hours: parseFloat(lab.total_hours || 0)
    }))
    .sort((a, b) => b.utilization - a.utilization)
    .slice(0, 10)

  const pieChartData = [
    { name: 'High Utilization (>70%)', value: analytics.filter(lab => parseFloat(lab.utilization_percentage || 0) > 70).length, color: '#10b981' },
    { name: 'Medium Utilization (40-70%)', value: analytics.filter(lab => {
      const util = parseFloat(lab.utilization_percentage || 0)
      return util >= 40 && util <= 70
    }).length, color: '#f59e0b' },
    { name: 'Low Utilization (<40%)', value: analytics.filter(lab => parseFloat(lab.utilization_percentage || 0) < 40).length, color: '#ef4444' }
  ]

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading dashboard analytics..." />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream via-peach to-pink-soft py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-teal to-teal-light bg-clip-text text-transparent mb-2">
            Analytics Dashboard
          </h1>
          <p className="text-ocean/70 text-lg">Lab utilization analytics & insights</p>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red/10 border border-red/20 rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-red" size={24} />
                <div>
                  <h3 className="text-lg font-semibold text-red">Error Loading Analytics</h3>
                  <p className="text-red/80">{error}</p>
                  <p className="text-sm text-red/60 mt-1">Please make sure you're logged in as an administrator.</p>
                </div>
              </div>
              <button
                onClick={retryFetch}
                className="px-4 py-2 bg-red text-white rounded-xl hover:bg-red/90 transition-colors flex items-center gap-2"
              >
                <RefreshCw size={16} />
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Date Filters */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-6 mb-8 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('week')}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  filter === 'week' 
                    ? 'bg-gradient-to-r from-teal to-teal-light text-white shadow-lg' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                This Week
              </button>
              <button
                onClick={() => setFilter('month')}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  filter === 'month' 
                    ? 'bg-gradient-to-r from-teal to-teal-light text-white shadow-lg' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                This Month
              </button>
              <button
                onClick={() => setFilter('custom')}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  filter === 'custom' 
                    ? 'bg-gradient-to-r from-teal to-teal-light text-white shadow-lg' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Custom Range
              </button>
            </div>
            
            {filter === 'custom' && (
              <div className="flex gap-2">
                <input
                  type="date"
                  name="start"
                  value={dateRange.start}
                  onChange={handleDateRangeChange}
                  className="px-4 py-2 rounded-xl border-2 border-teal/20 focus:border-teal focus:outline-none"
                />
                <input
                  type="date"
                  name="end"
                  value={dateRange.end}
                  onChange={handleDateRangeChange}
                  className="px-4 py-2 rounded-xl border-2 border-teal/20 focus:border-teal focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-teal/10 to-teal/5 rounded-2xl p-6 border border-teal/20">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-r from-teal to-teal-light rounded-xl">
                <BarChart3 className="text-white" size={24} />
              </div>
              <span className="text-2xl font-bold text-teal">{formatUtilization(stats.utilization)}</span>
            </div>
            <h3 className="text-lg font-semibold text-ocean mb-1">Overall Utilization</h3>
            <p className="text-sm text-gray-600">Lab usage efficiency</p>
          </div>

          <div className="bg-gradient-to-br from-blue/10 to-blue/5 rounded-2xl p-6 border border-blue/20">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-r from-blue to-blue-light rounded-xl">
                <Calendar className="text-white" size={24} />
              </div>
              <span className="text-2xl font-bold text-blue">{stats.totalBookings}</span>
            </div>
            <h3 className="text-lg font-semibold text-ocean mb-1">Total Bookings</h3>
            <p className="text-sm text-gray-600">Confirmed reservations</p>
          </div>

          <div className="bg-gradient-to-br from-purple/10 to-purple/5 rounded-2xl p-6 border border-purple/20">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-r from-purple to-purple-light rounded-xl">
                <Users className="text-white" size={24} />
              </div>
              <span className="text-2xl font-bold text-purple">{stats.activeUsers}</span>
            </div>
            <h3 className="text-lg font-semibold text-ocean mb-1">Active Users</h3>
            <p className="text-sm text-gray-600">Unique participants</p>
          </div>

          <div className="bg-gradient-to-br from-green/10 to-green/5 rounded-2xl p-6 border border-green/20">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-r from-green to-green-light rounded-xl">
                <DollarSign className="text-white" size={24} />
              </div>
              <span className="text-2xl font-bold text-green">{formatCurrency(stats.revenue)}</span>
            </div>
            <h3 className="text-lg font-semibold text-ocean mb-1">Total Revenue</h3>
            <p className="text-sm text-gray-600">Generated income</p>
          </div>

          <div className="bg-gradient-to-br from-orange/10 to-orange/5 rounded-2xl p-6 border border-orange/20">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-r from-orange to-orange-light rounded-xl">
                <Target className="text-white" size={24} />
              </div>
              <span className="text-2xl font-bold text-orange">{stats.labsBooked}</span>
            </div>
            <h3 className="text-lg font-semibold text-ocean mb-1">Labs Used</h3>
            <p className="text-sm text-gray-600">Active facilities</p>
          </div>

          <div className="bg-gradient-to-br from-red/10 to-red/5 rounded-2xl p-6 border border-red/20">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-r from-red to-red-light rounded-xl">
                <Clock className="text-white" size={24} />
              </div>
              <span className="text-2xl font-bold text-red">{parseFloat(stats.totalHours || 0).toFixed(1)}h</span>
            </div>
            <h3 className="text-lg font-semibold text-ocean mb-1">Hours Booked</h3>
            <p className="text-sm text-gray-600">Total lab time</p>
          </div>
        </div>

        {/* Charts Section */}
        {!error && analytics.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Utilization Bar Chart */}
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-6 shadow-lg">
              <h3 className="text-xl font-bold text-ocean mb-6 flex items-center gap-2">
                <BarChart3 className="text-teal" size={24} />
                Lab Utilization (%)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={utilizationChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0f2f1" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e0f2f1', borderRadius: '8px' }}
                    formatter={(value) => [`${value.toFixed(1)}%`, 'Utilization']}
                  />
                  <Bar dataKey="utilization" fill="#14b8a6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Utilization Pie Chart */}
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-6 shadow-lg">
              <h3 className="text-xl font-bold text-ocean mb-6 flex items-center gap-2">
                <Activity className="text-teal" size={24} />
                Utilization Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Lab Utilization Table */}
        {!error && analytics.length > 0 && (
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-bold text-ocean mb-6 flex items-center gap-2">
              <Activity className="text-teal" size={24} />
              Lab Utilization Details
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Lab Name</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Bookings</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Hours</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.filter(lab => lab.total_bookings > 0).map((lab) => (
                    <tr key={lab.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-ocean">{lab.name}</div>
                          <div className="text-xs text-gray-500">{lab.building}</div>
                        </div>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="font-medium">{lab.total_bookings}</span>
                      </td>
                      <td className="text-center py-3 px-4">
                        {parseFloat(lab.total_hours || 0).toFixed(1)}h
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          parseFloat(lab.utilization_percentage || 0) >= 70 ? 'bg-green-100 text-green-700' :
                          parseFloat(lab.utilization_percentage || 0) >= 40 ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {formatUtilization(lab.utilization_percentage)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!error && analytics.length === 0 && (
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-12 shadow-lg text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <BarChart3 className="text-gray-400" size={40} />
            </div>
            <h3 className="text-xl font-semibold text-ocean mb-2">No Analytics Data</h3>
            <p className="text-gray-600">There are no bookings for the selected time period.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard