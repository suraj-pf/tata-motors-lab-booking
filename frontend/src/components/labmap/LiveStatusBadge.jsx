import React from 'react'
import { RefreshCw, Wifi, WifiOff, Clock } from 'lucide-react'

const LiveStatusBadge = ({ 
  connected, 
  lastUpdated, 
  isRefreshing, 
  onRefresh 
}) => {
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const getTimeAgo = (date) => {
    const now = new Date()
    const diff = Math.floor((now - date) / 1000) // seconds
    
    if (diff < 60) return 'Just now'
    if (diff < 120) return '1 min ago'
    if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`
    return formatTime(date)
  }

  return (
    <div className="flex items-center gap-3">
      {/* Connection Status */}
      <div className="flex items-center gap-2">
        {connected ? (
          <>
            <Wifi size={16} className="text-green-500" />
            <span className="text-sm text-green-600 font-medium">Live</span>
          </>
        ) : (
          <>
            <WifiOff size={16} className="text-gray-400" />
            <span className="text-sm text-gray-500">Offline</span>
          </>
        )}
      </div>

      {/* Last Updated */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Clock size={14} />
        <span>Updated: {getTimeAgo(lastUpdated)}</span>
      </div>

      {/* Refresh Button */}
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        className={`
          p-2 rounded-lg transition-all duration-200
          ${isRefreshing 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
            : 'bg-teal/10 text-teal hover:bg-teal/20 hover:rotate-180'
          }
        `}
        title="Refresh rooms"
      >
        <RefreshCw 
          size={16} 
          className={isRefreshing ? 'animate-spin' : ''} 
        />
      </button>
    </div>
  )
}

export default LiveStatusBadge
