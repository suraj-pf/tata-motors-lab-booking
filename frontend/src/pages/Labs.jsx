import React from 'react'
import { useLabs } from '../hooks/useLabs'
import LabMap from '../components/labs/LabMap'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { AlertTriangle } from 'lucide-react'

const Labs = () => {
  const { labs, loading, error, refetch } = useLabs()

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading lab availability..." />
  }

  if (error) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-8 max-w-md text-center shadow-2xl border border-tata-red/20">
          <div className="w-20 h-20 bg-tata-red/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertTriangle size={40} className="text-tata-red" />
          </div>
          <h2 className="text-2xl font-bold text-ocean mb-3">Unable to load labs</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button onClick={refetch} className="tata-btn">
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream via-peach to-pink-soft">
      <LabMap labs={labs} />
    </div>
  )
}

export default Labs