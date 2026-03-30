import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BuildingSection from './BuildingSection'
import LabFilters from './LabFilters'
import StatusLegend from './StatusLegend'
import EnhancedBookingDialog from '../labmap/EnhancedBookingDialog'
import { Building2, Wrench, ArrowUpDown } from 'lucide-react'
import toast from 'react-hot-toast'

const LabMap = ({ labs }) => {
  const navigate = useNavigate()
  const [activeBuilding, setActiveBuilding] = useState('all')
  const [filters, setFilters] = useState({ search: '', ac: 'all', sortBy: 'name' })
  const [selectedLab, setSelectedLab] = useState(null)
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false)

  // Sort labs function - DEFINED BEFORE USE
  const sortLabs = (labsList, sortBy) => {
    const sorted = [...labsList]
    switch (sortBy) {
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name))
      case 'capacity':
        return sorted.sort((a, b) => b.capacity - a.capacity)
      case 'building':
        return sorted.sort((a, b) => a.building.localeCompare(b.building))
      case 'status':
        const statusOrder = { 'available': 0, 'booked': 1, 'restricted': 2 }
        return sorted.sort((a, b) => {
          const statusA = a.is_booked ? 'booked' : (a.is_active ? 'available' : 'restricted')
          const statusB = b.is_booked ? 'booked' : (b.is_active ? 'available' : 'restricted')
          return statusOrder[statusA] - statusOrder[statusB]
        })
      default:
        return sorted
    }
  }

  // Debug: Log when labs prop changes
  React.useEffect(() => {
    console.log('LabMap: labs prop updated', labs.length, 'labs')
    console.log('Lab statuses:', labs.map(lab => ({ id: lab.id, name: lab.name, is_booked: lab.is_booked, is_active: lab.is_active })))
  }, [labs])

  // Group labs by building - memoize to ensure re-computation when labs change
  const buildings = React.useMemo(() => {
    console.log('LabMap: Recomputing buildings')
    const grouped = {
      'HR Building': labs.filter(lab => lab.building === 'HR Building'),
      'SDC Workshop': labs.filter(lab => lab.building === 'SDC Workshop'),
    }
    
    // Sort labs within each building
    Object.keys(grouped).forEach(building => {
      grouped[building] = sortLabs(grouped[building], filters.sortBy)
    })
    
    return grouped
  }, [labs, filters.sortBy])

  // Apply filters
  const filterLabs = (labsList) => {
    return labsList.filter(lab => {
      const matchesSearch = lab.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                           lab.lab_owner?.toLowerCase().includes(filters.search.toLowerCase())
      const matchesAC = filters.ac === 'all' || 
                       (filters.ac === 'ac' && lab.is_ac) || 
                       (filters.ac === 'non-ac' && !lab.is_ac)
      return matchesSearch && matchesAC
    })
  }

  const handleLabSelect = (labId) => {
    navigate(`/book/${labId}`)
  }

  const handleBookingClick = (lab) => {
    setSelectedLab(lab)
    setBookingDialogOpen(true)
  }

  const handleBookingSuccess = (booking) => {
    toast.success('Booking confirmed successfully!')
    setBookingDialogOpen(false)
    setSelectedLab(null)
    // Refresh the labs data or navigate to booking details
    navigate(`/my-bookings`)
  }

  const handleCloseBookingDialog = () => {
    setBookingDialogOpen(false)
    setSelectedLab(null)
  }

  // Create a key based on lab statuses to force re-render when status changes
  const labsKey = React.useMemo(() => {
    return labs.map(lab => `${lab.id}-${lab.is_booked}-${lab.today_bookings}`).join('|')
  }, [labs])

  return (
    <div key={`labmap-${labsKey}`} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-teal to-teal-light bg-clip-text text-transparent mb-2">
          Lab Availability Map
        </h1>
        <p className="text-ocean/70 text-lg">Click green labs to book (6:30 AM - 5:00 PM)</p>
      </div>

      {/* Filters */}
      <LabFilters filters={filters} setFilters={setFilters} />

      {/* Status Legend */}
      <div className="mb-8">
        <StatusLegend />
      </div>

      {/* Building Tabs */}
      <div className="flex flex-wrap gap-3 justify-center mb-8">
        <button
          onClick={() => setActiveBuilding('all')}
          className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
            activeBuilding === 'all'
              ? 'bg-gradient-to-r from-teal to-teal-light text-white shadow-lg'
              : 'bg-white/80 text-ocean hover:bg-white'
          }`}
        >
          All Labs ({labs.length})
        </button>
        <button
          onClick={() => setActiveBuilding('HR Building')}
          className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
            activeBuilding === 'HR Building'
              ? 'bg-gradient-to-r from-teal to-teal-light text-white shadow-lg'
              : 'bg-white/80 text-ocean hover:bg-white'
          }`}
        >
          <Building2 size={18} />
          HR Building ({buildings['HR Building'].length})
        </button>
        <button
          onClick={() => setActiveBuilding('SDC Workshop')}
          className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
            activeBuilding === 'SDC Workshop'
              ? 'bg-gradient-to-r from-teal to-teal-light text-white shadow-lg'
              : 'bg-white/80 text-ocean hover:bg-white'
          }`}
        >
          <Wrench size={18} />
          SDC Workshop ({buildings['SDC Workshop'].length})
        </button>
      </div>

      {/* Building Sections */}
      <div className="space-y-12">
        {activeBuilding === 'all' ? (
          <>
            <BuildingSection
              title="HR Building"
              labs={filterLabs(buildings['HR Building'])}
              icon={<Building2 size={32} />}
              onLabSelect={handleLabSelect}
              onBookingClick={handleBookingClick}
            />
            <BuildingSection
              title="SDC Workshop"
              labs={filterLabs(buildings['SDC Workshop'])}
              icon={<Wrench size={32} />}
              onLabSelect={handleLabSelect}
              onBookingClick={handleBookingClick}
            />
          </>
        ) : (
          <BuildingSection
            title={activeBuilding}
            labs={filterLabs(buildings[activeBuilding])}
            icon={activeBuilding === 'HR Building' ? <Building2 size={32} /> : <Wrench size={32} />}
            onLabSelect={handleLabSelect}
            onBookingClick={handleBookingClick}
          />
        )}
      </div>

      {/* Enhanced Booking Dialog */}
      {selectedLab && (
        <EnhancedBookingDialog
          roomId={selectedLab.id}
          isOpen={bookingDialogOpen}
          onClose={handleCloseBookingDialog}
          onBookingSuccess={handleBookingSuccess}
        />
      )}
    </div>
  )
}

export default LabMap