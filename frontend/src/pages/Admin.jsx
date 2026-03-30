import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useDashboard } from '../hooks/useDashboard'
import UserManagement from '../components/admin/UserManagement'
import BookingManager from '../components/admin/BookingManager'
import BookingApproval from '../components/admin/BookingApproval'
import LabManagement from '../components/admin/LabManagement'
import { 
  Users, 
  Calendar, 
  Settings, 
  Shield, 
  Building, 
  CheckCircle,
  Activity,
  Server,
  RefreshCw,
  AlertCircle,
  Loader2
} from 'lucide-react'

// PRODUCTION: Error Boundary Component
class DashboardErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Dashboard Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-8 max-w-md text-center shadow-2xl border border-tata-red/20">
            <AlertCircle size={48} className="mx-auto text-tata-red mb-4" />
            <h2 className="text-2xl font-bold text-ocean mb-3">Something went wrong</h2>
            <p className="text-gray-600 mb-6">
              {this.state.error?.message || 'An error occurred in the dashboard.'}
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="tata-btn"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// System Status Indicator Component
const SystemStatus = ({ status, onRefresh, isRefreshing }) => {
  const getStatusColor = (s) => {
    switch (s) {
      case 'healthy': return 'bg-green-500'
      case 'connected': return 'bg-green-500'
      case 'slow': return 'bg-yellow-500'
      case 'error': return 'bg-red-500'
      case 'disconnected': return 'bg-red-500'
      default: return 'bg-gray-400'
    }
  }

  return (
    <div className="bg-white/95 backdrop-blur-xl rounded-xl p-4 shadow-lg mb-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Server size={20} className="text-ocean" />
          <span className="font-semibold text-ocean">System Status</span>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(status.api)}`} />
            <span className="text-sm text-gray-600">API</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(status.socket)}`} />
            <span className="text-sm text-gray-600">Socket</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(status.database)}`} />
            <span className="text-sm text-gray-600">DB</span>
          </div>
          {status.lastCheck && (
            <span className="text-xs text-gray-400">
              {new Date(status.lastCheck).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {isRefreshing ? (
              <Loader2 size={18} className="animate-spin text-teal" />
            ) : (
              <RefreshCw size={18} className="text-gray-500" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// Stats Card Component
const StatsCard = ({ title, value, icon: Icon, color, subtitle }) => (
  <div className="bg-white/95 backdrop-blur-xl rounded-xl p-6 shadow-lg">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500 mb-1">{title}</p>
        <p className={`text-3xl font-bold ${color}`}>{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
      <div className={`p-3 rounded-lg ${color.replace('text-', 'bg-').replace('600', '100')}`}>
        <Icon size={24} className={color} />
      </div>
    </div>
  </div>
)

// Activity Feed Component
const ActivityFeed = ({ activities, loading }) => (
  <div className="bg-white/95 backdrop-blur-xl rounded-xl p-6 shadow-lg">
    <div className="flex items-center gap-2 mb-4">
      <Activity size={20} className="text-ocean" />
      <h3 className="font-semibold text-ocean">Recent Activity</h3>
    </div>
    {loading ? (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={24} className="animate-spin text-teal" />
      </div>
    ) : activities.length === 0 ? (
      <p className="text-gray-500 text-center py-8">No recent activity</p>
    ) : (
      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {activities.slice(0, 20).map(activity => (
          <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <div className={`w-2 h-2 rounded-full mt-2 ${
              activity.type === 'booking' ? 'bg-blue-500' :
              activity.type === 'user' ? 'bg-green-500' : 'bg-purple-500'
            }`} />
            <div className="flex-1">
              <p className="text-sm">
                <span className="font-medium">{activity.user || activity.lab || 'System'}</span>
                {' '}<span className="text-gray-500">{activity.action}</span>
                {' '}<span className="font-medium">{activity.type}</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(activity.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)

const Admin = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const {
    bookings,
    labs,
    users,
    activities,
    stats,
    systemStatus,
    loading,
    refetch
  } = useDashboard()

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-8 max-w-md text-center shadow-2xl border border-tata-red/20">
          <div className="w-20 h-20 bg-tata-red/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield size={40} className="text-tata-red" />
          </div>
          <h2 className="text-2xl font-bold text-ocean mb-3">Access Denied</h2>
          <p className="text-gray-600">You need admin privileges to access this page.</p>
        </div>
      </div>
    )
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refetch()
    setIsRefreshing(false)
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'labs', label: 'Lab Management', icon: Building },
    { id: 'approval', label: 'Booking Approval', icon: CheckCircle },
    { id: 'bookings', label: 'Booking Management', icon: Calendar },
    { id: 'settings', label: 'System Settings', icon: Settings }
  ]

  return (
    <DashboardErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-cream via-peach to-pink-soft py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-teal to-teal-light bg-clip-text text-transparent mb-2">
              Admin Panel
            </h1>
            <p className="text-ocean/70 text-lg">Manage users, bookings, and system settings</p>
          </div>

          {/* System Status */}
          <SystemStatus 
            status={systemStatus} 
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing || loading}
          />

          {/* Navigation Tabs */}
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-2 mb-8 shadow-lg">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 min-w-[160px] py-3 px-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 text-sm ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-teal to-teal-light text-white shadow-lg'
                        : 'text-ocean hover:bg-teal/10'
                    }`}
                  >
                    <Icon size={18} />
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-6 shadow-lg">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatsCard title="Active Bookings" value={stats.activeBookings} icon={Calendar} color="text-blue-600" subtitle={`${stats.todayBookings} today`} />
                  <StatsCard title="Lab Utilization" value={`${stats.utilization}%`} icon={Building} color="text-green-600" subtitle={`${stats.occupiedLabs}/${stats.totalLabs} occupied`} />
                  <StatsCard title="Total Users" value={stats.totalUsers} icon={Users} color="text-purple-600" subtitle={`${stats.activeUsers} active`} />
                  <StatsCard title="Pending Approvals" value={stats.pendingApprovals} icon={CheckCircle} color="text-orange-600" subtitle="Require action" />
                </div>
                <ActivityFeed activities={activities} loading={loading} />
              </div>
            )}

            {activeTab === 'users' && <UserManagement users={users} loading={loading} />}
            {activeTab === 'labs' && <LabManagement labs={labs} loading={loading} />}
            {activeTab === 'approval' && <BookingApproval bookings={bookings} loading={loading} />}
            {activeTab === 'bookings' && <BookingManager bookings={bookings} loading={loading} />}
            
            {activeTab === 'settings' && (
              <div className="text-center py-16">
                <Settings size={64} className="mx-auto text-teal/30 mb-4" />
                <h3 className="text-2xl font-bold text-ocean mb-2">System Settings</h3>
                <p className="text-gray-500">
                  API: <span className={systemStatus.api === 'healthy' ? 'text-green-500' : 'text-yellow-500'}>{systemStatus.api}</span>
                  <br />
                  Socket: <span className={systemStatus.socket === 'connected' ? 'text-green-500' : 'text-red-500'}>{systemStatus.socket}</span>
                  <br />
                  DB: <span className={systemStatus.database === 'healthy' ? 'text-green-500' : 'text-gray-400'}>{systemStatus.database}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardErrorBoundary>
  )
}

export default Admin