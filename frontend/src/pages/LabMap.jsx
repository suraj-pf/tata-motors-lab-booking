import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../hooks/useSocket'
import RoomBlock from '../components/labmap/RoomBlock'
import SimpleBookingModal from '../components/labmap/SimpleBookingModal'
import LiveStatusBadge from '../components/labmap/LiveStatusBadge'
import FloorSection from '../components/labmap/FloorSection'
import StatusLegend from '../components/labs/StatusLegend'
import { useLiveRoomData } from '../hooks/useLiveRoomData'
import { useAutoBooking } from '../hooks/useAutoBooking'
import { RefreshCw, Map, Building, Users, Clock } from 'lucide-react'
import LoadingSpinner from '../components/common/LoadingSpinner'
import toast from 'react-hot-toast'

const LabMap = () => {
  const { user } = useAuth()
  const { socket, connected } = useSocket()
  const isAdmin = user?.role === 'admin'
  
  // State
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [showSimpleModal, setShowSimpleModal] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Auto booking hook
  const { createAutoBooking, isSubmitting } = useAutoBooking()
  
  // Custom hook for live room data
  const { rooms, loading, error, refreshRooms, selectedDate, setSelectedDate } = useLiveRoomData()

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshRooms()
      setLastUpdated(new Date())
    }, 60000)

    return () => clearInterval(interval)
  }, [refreshRooms])

  // WebSocket real-time updates
  useEffect(() => {
    if (!socket || !connected) return

    const handleRoomUpdate = (data) => {
      // Update room status in real-time
      refreshRooms()
      setLastUpdated(new Date())
      
      // Show toast for important updates
      if (data.status === 'booked') {
        toast.success(`${data.roomName} has been booked`)
      } else if (data.status === 'available') {
        toast.info(`${data.roomName} is now available`)
      }
    }

    socket.on('room-status-update', handleRoomUpdate)
    socket.on('booking-created', handleRoomUpdate)
    socket.on('booking-cancelled', handleRoomUpdate)

    return () => {
      socket.off('room-status-update', handleRoomUpdate)
      socket.off('booking-created', handleRoomUpdate)
      socket.off('booking-cancelled', handleRoomUpdate)
    }
  }, [socket, connected, refreshRooms])

  // Manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Force refresh based on selected date
    await refreshRooms(selectedDate)
    setLastUpdated(new Date())
    setIsRefreshing(false)
    toast.success('Lab map refreshed')
  }

  // Room click handler
  const handleRoomClick = (room) => {
    setSelectedRoom(room)
    
    if (room.status === 'booked' || room.status === 'restricted') {
      // Do nothing for booked or restricted rooms
      return
    }
    
    // Check if lab is available before opening modal
    if (room.is_active === false) {
      toast.error('Room currently unavailable')
      return
    }
    
    // Only show simple booking modal for available rooms (no admin panel)
    if (room.status === 'available') {
      setShowSimpleModal(true)
    }
  }

  // Handle booking confirmation
  const handleBookingConfirm = async () => {
    if (!selectedRoom) return
    
    try {
      const result = await createAutoBooking(selectedRoom.id, selectedRoom.name)
      
      if (result.success) {
        // Refresh rooms to update the map
        await refreshRooms()
        // Modal will close automatically due to redirect
      }
    } catch (error) {
      // Error handled by hook
      console.error('Booking confirmation error:', error)
    }
  }

  // Helper function to safely parse facilities
  const parseFacilities = (facilities) => {
    if (!facilities) return []
    if (Array.isArray(facilities)) return facilities
    if (typeof facilities === 'string') return facilities.split(',').map(f => f.trim())
    return []
  }

   // HR Building Layout Data (Based on images)
   // Second Floor Layout from image: Utility (Store Room), Prima, Safari, Lobby Area, Udon, Unnati, Utkarsh, Athar
   const hrBuildingLayout = useMemo(() => ({
     secondFloor: [
       { 
         id: 'store-room', 
         name: 'Store Room', 
         type: 'utility', 
         status: 'restricted', 
         seats: 0,
         facilities: ['Restricted Access'],
         owner: 'Admin'
       },
       { 
         id: 'prima', 
         name: 'Prima', 
         type: 'room', 
         status: 'booked',  // Image shows "Booked 70 Seats"
         seats: 70, 
         facilities: ['Benches', 'Projector'], 
         owner: 'Mrunal',
         bookedBy: 'Archana Waghole'  // From image
       },
       { 
         id: 'safari', 
         name: 'Safari', 
         type: 'room', 
         status: 'available',  // Image shows "Available to Book"
         seats: 45, 
         facilities: ['Benches', 'Smart Board'], 
         owner: 'Govardhan' 
       },
       { 
         id: 'lobby', 
         name: 'Lobby Area', 
         type: 'utility', 
         status: 'restricted', 
         seats: 0,
         facilities: [],
         owner: 'Admin'
       },
       { 
         id: 'udan', 
         name: 'Udan', 
         type: 'room', 
         status: 'available', 
         seats: 45, 
         facilities: ['Benches'], 
         owner: 'Vaibhav Dhoge' 
       },
       { 
         id: 'unnati', 
         name: 'Unnati', 
         type: 'room', 
         status: 'available', 
         seats: 48, 
         facilities: ['Benches', 'Smart Board'], 
         owner: 'Kishor Malokar' 
       },
       { 
         id: 'utkarsh', 
         name: 'Utkarsh', 
         type: 'room', 
         status: 'available', 
         seats: 48, 
         facilities: ['Benches', 'Smart Board'], 
         owner: 'Kishor Malokar' 
       },
       { 
         id: 'athang', 
         name: 'Athang', 
         type: 'room', 
         status: 'available', 
         seats: 70, 
         facilities: ['Benches'], 
         owner: 'Kishor Malokar' 
       }
     ],
     firstFloor: [
       { 
         id: 'sdp', 
         name: 'SDP', 
         type: 'hall', 
         status: 'available', 
         seats: 250,  // From image: 250+ chairs
         facilities: ['Smart Podium', 'Video Conferencing Enabled', 'Chairs'], 
         owner: 'Archana Waghole',
         capacityNote: '250+ Chairs'
       }
     ]
   }), [])

   // SDC Workshop Layout Data (Based on images)
   const sdcWorkshopLayout = useMemo(() => ({
     mainFloor: [
       { 
         id: 'fst-tcf', 
         name: 'FST TCF', 
         type: 'lab', 
         status: 'available', 
         seats: 30, 
         facilities: ['Chairs', 'Whiteboard'], 
         owner: 'Ramdas Saindane',
         ac: false
       },
       { 
         id: 'fst-b1w', 
         name: 'FST B1W', 
         type: 'lab', 
         status: 'available', 
         seats: 30, 
         facilities: ['Chairs', 'Whiteboard'], 
         owner: 'Sandeep Polkam',
         ac: false
       },
       { 
         id: 'b1w', 
         name: 'B1W', 
         type: 'lab', 
         status: 'available', 
         seats: 40, 
         facilities: ['Benches', 'Projector'], 
         owner: 'Nitin Khairnar',
         ac: false
       },
       { 
         id: 'prayas', 
         name: 'Prayas', 
         type: 'hall', 
         status: 'available', 
         seats: 50, 
         facilities: ['Chairs', 'Smart Board'], 
         owner: 'Priti Ubale',
         ac: true
       },
       { 
         id: 'mechatronics', 
         name: 'Mechatronics', 
         type: 'lab', 
         status: 'available', 
         seats: 70, 
         facilities: ['Benches', 'Projector'], 
         owner: 'Asha Patil',
         ac: false
       },
       { 
         id: '5s-hall', 
         name: '5S Hall', 
         type: 'hall', 
         status: 'available', 
         seats: 70, 
         facilities: ['Benches', 'Projector'], 
         owner: 'Bharat Thorat',
         ac: false
       },
       { 
         id: 'nttf-side', 
         name: 'NTTF side', 
         type: 'lab', 
         status: 'available', 
         seats: 50, 
         facilities: ['Chairs', 'Projector'], 
         owner: 'Vithal More',
         ac: false
       },
       { 
         id: 'arvr-lab', 
         name: 'ARVR Lab', 
         type: 'lab', 
         status: 'available', 
         seats: 20, 
         facilities: ['Chairs', 'Smart Board'], 
         owner: 'Vaibhav Dhoge',
         ac: false
       },
       { 
         id: 'industry4-lab', 
         name: 'Industry 4.0 Lab', 
         type: 'lab', 
         status: 'available', 
         seats: 20, 
         facilities: ['Chairs', 'Smart Board'], 
         owner: 'Asha Katkar',
         ac: false
       },
       { 
         id: 'athang-sdc', 
         name: 'Athang', 
         type: 'room', 
         status: 'available', 
         seats: 70, 
         facilities: ['Benches'], 
         owner: 'Kishor Malokar',
         ac: false
       }
     ]
   }), [])

   // Merge with real-time data
   const mergeWithLiveData = (layoutRooms) => {
     return layoutRooms.map(room => {
       const liveData = rooms.find(r => r.name?.toLowerCase() === room.name?.toLowerCase())
       if (liveData) {
         // Use the live data but keep the layout ID for reference
         return { 
           ...room, 
           ...liveData,
           id: liveData.id, // Use the real API ID
           // Preserve layout-specific fields if not in live data
           seats: liveData.capacity || room.seats,
           // Safely handle facilities - could be array or string
           facilities: parseFacilities(liveData.facilities).length > 0 
             ? parseFacilities(liveData.facilities) 
             : room.facilities,
           owner: liveData.lab_owner || room.owner,
         }
       }
       return room
     })
   }

   const hrSecondFloor = useMemo(() => mergeWithLiveData(hrBuildingLayout.secondFloor), [hrBuildingLayout.secondFloor, rooms])
   const hrFirstFloor = useMemo(() => mergeWithLiveData(hrBuildingLayout.firstFloor), [hrBuildingLayout.firstFloor, rooms])
   const sdcMainFloor = useMemo(() => mergeWithLiveData(sdcWorkshopLayout.mainFloor), [sdcWorkshopLayout.mainFloor, rooms])

   // Statistics
   const stats = useMemo(() => {
     const totalRooms = rooms.length
     const availableRooms = rooms.filter(r => r.status === 'available').length
     const bookedRooms = rooms.filter(r => r.status === 'booked').length
     const utilizationRate = totalRooms > 0 ? ((bookedRooms / totalRooms) * 100).toFixed(1) : 0

     return { totalRooms, availableRooms, bookedRooms, utilizationRate }
   }, [rooms])

   if (loading) {
     return (
       <div className="min-h-screen bg-gradient-to-br from-cream via-peach to-pink-soft flex items-center justify-center">
         <LoadingSpinner />
       </div>
     )
   }

   if (error) {
     return (
       <div className="min-h-screen bg-gradient-to-br from-cream via-peach to-pink-soft flex items-center justify-center">
         <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-8 max-w-md text-center shadow-2xl border border-tata-red/20">
           <p className="text-red-500">Failed to load lab map: {error}</p>
           <button onClick={handleRefresh} className="mt-4 tata-btn-secondary">
             Retry
           </button>
         </div>
       </div>
     )
   }

   return (
     <div className="min-h-screen bg-gradient-to-br from-cream via-peach to-pink-soft">
       {/* Header */}
       <div className="bg-white/95 backdrop-blur-xl shadow-lg sticky top-0 z-40">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
           <div className="flex justify-between items-center">
             <div className="flex items-center gap-4">
               <div className="w-10 h-10 bg-gradient-to-r from-teal to-teal-light rounded-xl flex items-center justify-center text-white">
                 <Map size={20} />
               </div>
               <div>
                 <h1 className="text-2xl font-bold text-ocean">Lab Map Overview</h1>
                 <p className="text-sm text-gray-600">
                   {isAdmin ? 'Admin View' : 'User View'} • Real-time Status
                 </p>
                 <div className="mt-2 flex items-center gap-2">
                   <label htmlFor="map-date" className="text-xs text-gray-500">Date</label>
                   <input
                     id="map-date"
                     type="date"
                     value={selectedDate}
                     onChange={async (e) => {
                       const newDate = e.target.value
                       setSelectedDate(newDate)
                       await refreshRooms(newDate)
                     }}
                     className="px-2 py-1 border border-gray-300 rounded-md text-xs"
                   />
                 </div>
               </div>
             </div>
            
             <div className="flex items-center gap-4">
               {/* Stats */}
               <div className="hidden md:flex items-center gap-6 text-sm">
                 <div className="flex items-center gap-2">
                   <Building size={16} className="text-teal" />
                   <span className="text-ocean">{stats.totalRooms} Rooms</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <Users size={16} className="text-green-500" />
                   <span className="text-green-600">{stats.availableRooms} Available</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <Clock size={16} className="text-tata-red" />
                   <span className="text-tata-red">{stats.bookedRooms} Booked</span>
                 </div>
                 <div className="text-ocean">
                   {stats.utilizationRate}% Utilized
                 </div>
               </div>
              
               {/* Live Status */}
               <LiveStatusBadge 
                 connected={connected}
                 lastUpdated={lastUpdated}
                 isRefreshing={isRefreshing}
                 onRefresh={handleRefresh}
               />
             </div>
           </div>
         </div>
       </div>

       {/* Main Content */}
       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
         {/* HR Building Section */}
         <div className="mb-12">
           <div className="flex items-center gap-3 mb-6">
             <Building size={24} className="text-teal" />
             <h2 className="text-xl font-bold text-ocean">HR Building</h2>
             <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Second & First Floor</span>
           </div>
          
           {/* Second Floor */}
           <FloorSection 
             title="Second Floor"
             rooms={hrSecondFloor}
             onRoomClick={handleRoomClick}
             selectedRoom={selectedRoom}
             layout="grid"
           />
          
           {/* First Floor */}
           <FloorSection 
             title="First Floor"
             rooms={hrFirstFloor}
             onRoomClick={handleRoomClick}
             selectedRoom={selectedRoom}
             layout="grid"
           />
         </div>

         {/* SDC Workshop Section */}
         <div className="mb-12">
           <div className="flex items-center gap-3 mb-6">
             <Building size={24} className="text-teal" />
             <h2 className="text-xl font-bold text-ocean">SDC Workshop</h2>
             <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Main Floor</span>
           </div>
          
           <FloorSection 
             title="Facilities"
             rooms={sdcMainFloor}
             onRoomClick={handleRoomClick}
             selectedRoom={selectedRoom}
             layout="grid"
           />
         </div>

         {/* Legend */}
         <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-6 shadow-lg">
           <h3 className="text-lg font-semibold text-ocean mb-4">Status Legend</h3>
           <div className="flex flex-wrap gap-6">
             <div className="flex items-center gap-2">
               <div className="w-4 h-4 bg-green-100 border-2 border-green-500 rounded"></div>
               <span className="text-sm text-ocean">Available</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-4 h-4 bg-red-100 border-2 border-red-500 rounded"></div>
               <span className="text-sm text-ocean">Booked</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-4 h-4 bg-amber-100 border-2 border-amber-500 rounded"></div>
               <span className="text-sm text-ocean">Selected</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-4 h-4 bg-gray-100 border-2 border-gray-400 rounded"></div>
               <span className="text-sm text-ocean">Utility/Restricted</span>
             </div>
           </div>
           <div className="mt-4 pt-4 border-t border-gray-200">
             <h4 className="text-sm font-semibold text-ocean mb-2">Room Facilities Icons</h4>
             <div className="flex flex-wrap gap-4 text-xs text-gray-600">
               <span>🪑 Chairs</span>
               <span>📋 Whiteboard</span>
               <span>🖥️ Smart Board</span>
               <span>📽️ Projector</span>
               <span>🪑 Benches</span>
               <span>🎥 Video Conferencing</span>
               <span>🎤 Smart Podium</span>
             </div>
           </div>
         </div>
       </div>

       {/* Booking Selection Bar */}
       {selectedRoom && selectedRoom.status === 'selected' && (
         <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-amber-500 to-amber-600 text-white p-4 shadow-lg z-30">
           <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
             <div className="flex items-center gap-3">
               <Map size={20} />
               <span className="font-semibold">
                 Currently Selecting: {selectedRoom.name}
               </span>
             </div>
             <button
               onClick={() => setSelectedRoom(null)}
               className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
             >
               Clear Selection
             </button>
           </div>
         </div>
       )}

       {/* Modals */}
       {showSimpleModal && selectedRoom && (
         <SimpleBookingModal
           labName={selectedRoom.name}
           labId={selectedRoom.id}
           isOpen={showSimpleModal}
           onClose={() => {
             setShowSimpleModal(false)
             setSelectedRoom(null)
           }}
           onConfirm={handleBookingConfirm}
           isSubmitting={isSubmitting}
         />
       )}
     </div>
   )
 }

 export default LabMap
