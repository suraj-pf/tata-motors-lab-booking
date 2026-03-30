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
  RefreshCw,
  TrendingDown,
  Award,
  Eye,
  Download,
  Filter
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
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'

const ProfessionalDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview')
  const [analytics, setAnalytics] = useState([])
  const [summary, setSummary] = useState({})
  const [dailyTrends, setDailyTrends] = useState([])
  const [monthlyData, setMonthlyData] = useState([])
  const [labRanking, setLabRanking] = useState([])
  const [peakHours, setPeakHours] = useState([])
  const [metadata, setMetadata] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('month')
  const [selectedLab, setSelectedLab] = useState('all')
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
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
        setSummary(data.summary || {})
        setDailyTrends(data.dailyTrends || [])
        setMonthlyData(data.monthlyData || [])
        setLabRanking(data.labRanking || [])
        setPeakHours(data.peakHours || [])
        setMetadata(data.metadata || {})
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

  const exportToCSV = () => {
    // Simple CSV export functionality
    const csvData = analytics.map(lab => ({
      'Lab Name': lab.name,
      'Building': lab.building,
      'Total Bookings': lab.total_bookings,
      'Confirmed Bookings': lab.confirmed_bookings,
      'Completed Bookings': lab.completed_bookings,
      'Total Hours': lab.total_hours,
      'Unique Users': lab.unique_users,
      'Revenue': lab.revenue,
      'Utilization %': lab.utilization_percentage
    }))
    
    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lab-analytics-${dateRange.start}-to-${dateRange.end}.csv`
    a.click()
  }

  // Calculate most booked lab
  const mostBookedLab = analytics.length > 0 ? 
    analytics.reduce((max, lab) => lab.total_bookings > max.total_bookings ? lab : max) : null

  // Prepare data for charts
  const utilizationChartData = analytics
    .filter(lab => lab.total_bookings > 0)
    .map(lab => ({
      name: lab.name.length > 20 ? lab.name.substring(0, 17) + '...' : lab.name,
      utilization: parseFloat(lab.utilization_percentage || 0),
      bookings: lab.total_bookings,
      hours: parseFloat(lab.total_hours || 0)
    }))
    .sort((a, b) => b.utilization - a.utilization)

  const growthChartData = monthlyData.map(month => ({
    month: new Date(month.month + '-01').toLocaleDateString('en', { month: 'short' }),
    bookings: month.bookings,
    hours: parseFloat(month.hours || 0)
  }))

  const pieChartData = [
    { name: 'High Utilization (>70%)', value: analytics.filter(lab => parseFloat(lab.utilization_percentage || 0) > 70).length, color: '#10b981' },
    { name: 'Medium Utilization (40-70%)', value: analytics.filter(lab => {
      const util = parseFloat(lab.utilization_percentage || 0)
      return util >= 40 && util <= 70
    }).length, color: '#f59e0b' },
    { name: 'Low Utilization (<40%)', value: analytics.filter(lab => parseFloat(lab.utilization_percentage || 0) < 40).length, color: '#ef4444' }
  ]

  const underutilizedLabs = analytics.filter(lab => parseFloat(lab.utilization_percentage || 0) < 30)

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading professional analytics..." />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Professional Analytics Dashboard</h1>
              <p className="text-slate-600 mt-1">Lab utilization insights and performance metrics</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2"
              >
                <Download size={16} />
                Export CSV
              </button>
              <button
                onClick={retryFetch}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Date Filters */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('week')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    filter === 'week' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  This Week
                </button>
                <button
                  onClick={() => setFilter('month')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    filter === 'month' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  This Month
                </button>
                <button
                  onClick={() => setFilter('custom')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    filter === 'custom' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="date"
                    name="end"
                    value={dateRange.end}
                    onChange={handleDateRangeChange}
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
            
            <div className="text-sm text-slate-600">
              {metadata.totalLabs} Labs • {metadata.daysInRange} Days • {metadata.totalAvailableHoursPerLab}h/Lab Available
            </div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-red-600" size={20} />
                <div>
                  <h3 className="text-sm font-semibold text-red-800">Error Loading Analytics</h3>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
              <button
                onClick={retryFetch}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'utilization', label: 'Utilization', icon: Activity },
              { id: 'growth', label: 'Growth', icon: TrendingUp },
              { id: 'reports', label: 'Reports', icon: Eye }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* TAB 1: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Top Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Labs</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">{metadata.totalLabs || 0}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <BarChart3 className="text-blue-600" size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Bookings</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">{summary.total_bookings || 0}</p>
                    <p className="text-xs text-slate-500 mt-1">This {filter === 'week' ? 'Week' : 'Month'}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Calendar className="text-green-600" size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Average Utilization</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">{formatUtilization(summary.overall_utilization)}</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Activity className="text-purple-600" size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Most Booked Lab</p>
                    <p className="text-lg font-bold text-slate-900 mt-2 truncate">
                      {mostBookedLab?.name || 'N/A'} 🔥
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{mostBookedLab?.total_bookings || 0} bookings</p>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <Award className="text-orange-600" size={24} />
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Utilization Distribution */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Utilization Distribution</h3>
                  <p className="text-sm text-slate-600 mt-1">Performance breakdown across all labs</p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-slate-600">High (&gt;70%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                    <span className="text-slate-600">Medium (40-70%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-slate-600">Low (&lt;40%)</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, value, percent }) => `${value} labs (${(percent * 100).toFixed(0)}%)`}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      formatter={(value, name) => [`${value} labs`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-4">
                  {pieChartData.map((segment, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full`} style={{ backgroundColor: segment.color }}></div>
                        <div>
                          <p className="font-medium text-slate-900">{segment.name}</p>
                          <p className="text-sm text-slate-600">
                            {((segment.value / analytics.length) * 100).toFixed(1)}% of all labs
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-slate-900">{segment.value}</p>
                        <p className="text-sm text-slate-600">labs</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Utilization Comparison */}
        {activeTab === 'utilization' && (
          <div className="space-y-8">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900">Lab Utilization Comparison</h3>
                <div className="text-sm text-slate-600">
                  Tallest bar = Most booked • Shortest bar = Least booked
                </div>
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={utilizationChartData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100}
                    interval={0}
                  />
                  <YAxis 
                    label={{ value: 'Utilization %', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                    formatter={(value) => [`${value.toFixed(1)}%`, 'Utilization']}
                  />
                  <Bar 
                    dataKey="utilization" 
                    fill="#3b82f6" 
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Underutilized Labs Alert */}
            {underutilizedLabs.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <AlertCircle className="text-red-600" size={20} />
                  <h3 className="text-lg font-semibold text-red-800">Underutilized Labs Need Attention</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {underutilizedLabs.map(lab => (
                    <div key={lab.id} className="bg-white rounded-lg p-4 border border-red-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">{lab.name}</p>
                          <p className="text-sm text-slate-600">{lab.building}</p>
                        </div>
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                          {formatUtilization(lab.utilization_percentage)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Growth Trend */}
        {activeTab === 'growth' && (
          <div className="space-y-8">
            {/* Growth Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900">Growth Trend Analysis</h3>
                <select 
                  value={selectedLab}
                  onChange={(e) => setSelectedLab(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Labs (Combined)</option>
                  {analytics.map(lab => (
                    <option key={lab.id} value={lab.id}>{lab.name}</option>
                  ))}
                </select>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={growthChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="bookings" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Bookings"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="hours" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Hours"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Top 5 Labs Ranking */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-6">Top 5 Labs Ranking</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Rank</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Lab</th>
                      <th className="text-center py-3 px-4 font-semibold text-slate-700">Utilization</th>
                      <th className="text-center py-3 px-4 font-semibold text-slate-700">Growth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labRanking.map((lab, index) => (
                      <tr key={lab.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-slate-900">#{index + 1}</span>
                            {index === 0 && <Award className="text-yellow-500" size={16} />}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium text-slate-900">{lab.name}</div>
                            <div className="text-sm text-slate-600">{lab.building}</div>
                          </div>
                        </td>
                        <td className="text-center py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            parseFloat(lab.utilization_percentage) >= 70 ? 'bg-green-100 text-green-700' :
                            parseFloat(lab.utilization_percentage) >= 40 ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {formatUtilization(lab.utilization_percentage)}
                          </span>
                        </td>
                        <td className="text-center py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            {parseFloat(lab.growth_percentage) >= 0 ? (
                              <TrendingUp className="text-green-600" size={16} />
                            ) : (
                              <TrendingDown className="text-red-600" size={16} />
                            )}
                            <span className={`font-medium ${
                              parseFloat(lab.growth_percentage) >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {lab.growth_percentage}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Reports */}
        {activeTab === 'reports' && (
          <div className="space-y-8">
            {/* Enhanced Peak Hour Analysis */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Peak Hour Analysis</h3>
                  <p className="text-sm text-slate-600 mt-1">Busiest time slots for lab bookings</p>
                </div>
                <div className="text-sm text-slate-600">
                  <Clock size={16} className="inline mr-1" />
                  Hourly breakdown
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {peakHours.slice(0, 12).map((peak, index) => {
                  const maxBookings = Math.max(...peakHours.map(p => p.bookings));
                  const percentage = (peak.bookings / maxBookings) * 100;
                  return (
                    <div key={index} className="relative">
                      <div className="text-center p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                        <div className="text-2xl font-bold text-slate-900">{peak.hour}:00</div>
                        <div className="text-sm font-medium text-slate-600 mt-1">{peak.bookings} bookings</div>
                        <div className="text-xs text-slate-500">{peak.labs_used} labs</div>
                        {/* Visual indicator */}
                        <div className="mt-3 h-1 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                      {index === 0 && (
                        <div className="absolute -top-2 -right-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                          Peak
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {/* Peak Hours Summary */}
              <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-200">
                <div className="text-center">
                  <p className="text-sm text-slate-600">Peak Hour</p>
                  <p className="text-xl font-bold text-slate-900">
                    {peakHours.length > 0 ? `${peakHours[0].hour}:00` : 'N/A'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-600">Peak Bookings</p>
                  <p className="text-xl font-bold text-slate-900">
                    {peakHours.length > 0 ? peakHours[0].bookings : 0}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-600">Active Hours</p>
                  <p className="text-xl font-bold text-slate-900">
                    {peakHours.filter(p => p.bookings > 0).length}
                  </p>
                </div>
              </div>
            </div>

            {/* Enhanced Detailed Lab Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Detailed Lab Analytics</h3>
                  <p className="text-sm text-slate-600 mt-1">Complete performance metrics for all labs</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-slate-600">
                    {analytics.length} labs total
                  </div>
                  <button
                    onClick={exportToCSV}
                    className="px-3 py-1 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2"
                  >
                    <Download size={14} />
                    Export
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Lab Information</th>
                      <th className="text-center py-3 px-4 font-semibold text-slate-700">Bookings</th>
                      <th className="text-center py-3 px-4 font-semibold text-slate-700">Hours</th>
                      <th className="text-center py-3 px-4 font-semibold text-slate-700">Revenue</th>
                      <th className="text-center py-3 px-4 font-semibold text-slate-700">Utilization</th>
                      <th className="text-center py-3 px-4 font-semibold text-slate-700">Performance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.map((lab) => {
                      const utilization = parseFloat(lab.utilization_percentage || 0);
                      const isUnderutilized = utilization < 30;
                      const isHighPerforming = utilization >= 70;
                      
                      return (
                        <tr key={lab.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                          isUnderutilized ? 'bg-red-50' : isHighPerforming ? 'bg-green-50' : ''
                        }`}>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-8 rounded-full ${
                                isUnderutilized ? 'bg-red-500' : 
                                isHighPerforming ? 'bg-green-500' : 'bg-amber-500'
                              }`}></div>
                              <div>
                                <div className="font-medium text-slate-900">{lab.name}</div>
                                <div className="text-sm text-slate-600">{lab.building}</div>
                                <div className="text-xs text-slate-500 mt-1">
                                  {lab.unique_users || 0} unique users
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="text-center py-4 px-4">
                            <div className="space-y-1">
                              <div className="font-medium text-slate-900">{lab.total_bookings}</div>
                              <div className="text-xs text-slate-600">
                                <span className="text-green-600">{lab.confirmed_bookings} confirmed</span>
                                <span className="mx-1">•</span>
                                <span className="text-amber-600">{lab.completed_bookings} completed</span>
                              </div>
                            </div>
                          </td>
                          <td className="text-center py-4 px-4">
                            <div className="space-y-1">
                              <div className="font-medium text-slate-900">{parseFloat(lab.total_hours || 0).toFixed(1)}h</div>
                              <div className="text-xs text-slate-600">
                                Avg: {lab.total_bookings > 0 ? (parseFloat(lab.total_hours || 0) / lab.total_bookings).toFixed(1) : 0}h/booking
                              </div>
                            </div>
                          </td>
                          <td className="text-center py-4 px-4">
                            <div className="space-y-1">
                              <div className="font-medium text-slate-900">{formatCurrency(lab.revenue)}</div>
                              <div className="text-xs text-slate-600">
                                {lab.total_hours > 0 ? formatCurrency(parseFloat(lab.revenue || 0) / parseFloat(lab.total_hours)) : 0}/h
                              </div>
                            </div>
                          </td>
                          <td className="text-center py-4 px-4">
                            <div className="flex flex-col items-center gap-2">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                utilization >= 70 ? 'bg-green-100 text-green-700' :
                                utilization >= 40 ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {formatUtilization(lab.utilization_percentage)}
                              </span>
                              {/* Visual utilization bar */}
                              <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    utilization >= 70 ? 'bg-green-500' :
                                    utilization >= 40 ? 'bg-amber-500' :
                                    'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min(utilization, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="text-center py-4 px-4">
                            <div className="flex flex-col items-center gap-2">
                              {isUnderutilized ? (
                                <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                                  <AlertCircle size={12} />
                                  Needs Attention
                                </div>
                              ) : isHighPerforming ? (
                                <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                                  <Award size={12} />
                                  Excellent
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                                  <Activity size={12} />
                                  Good
                                </div>
                              )}
                              <div className="text-xs text-slate-600">
                                {utilization >= 70 ? 'Top performer' : 
                                 utilization < 30 ? 'Underutilized' : 
                                 'Average performance'}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Performance Summary */}
              <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-200">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-slate-700">High Performers</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    {analytics.filter(lab => parseFloat(lab.utilization_percentage || 0) >= 70).length}
                  </p>
                  <p className="text-xs text-slate-600">labs</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                    <span className="text-sm font-medium text-slate-700">Average</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-600">
                    {analytics.filter(lab => {
                      const util = parseFloat(lab.utilization_percentage || 0);
                      return util >= 40 && util < 70;
                    }).length}
                  </p>
                  <p className="text-xs text-slate-600">labs</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm font-medium text-slate-700">Needs Attention</span>
                  </div>
                  <p className="text-2xl font-bold text-red-600">
                    {analytics.filter(lab => parseFloat(lab.utilization_percentage || 0) < 30).length}
                  </p>
                  <p className="text-xs text-slate-600">labs</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium text-slate-700">System Average</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatUtilization(summary.overall_utilization)}
                  </p>
                  <p className="text-xs text-slate-600">utilization</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProfessionalDashboard
