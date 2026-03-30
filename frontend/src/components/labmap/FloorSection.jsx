import React from 'react'
import RoomBlock from './RoomBlock'

const FloorSection = ({ 
  title, 
  rooms, 
  onRoomClick, 
  selectedRoom, 
  layout = 'grid' 
}) => {
  // Filter out utility rooms for better layout
  const regularRooms = rooms.filter(room => room.type !== 'utility')
  const utilityRooms = rooms.filter(room => room.type === 'utility')

  // Get grid layout classes based on room count
  const getGridClasses = (roomCount) => {
    if (roomCount <= 2) return 'grid-cols-1 md:grid-cols-2'
    if (roomCount <= 4) return 'grid-cols-2 md:grid-cols-4'
    if (roomCount <= 6) return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
    return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
  }

  const gridClasses = getGridClasses(regularRooms.length)

  return (
    <div className="mb-8">
      {/* Floor Title */}
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-lg font-semibold text-ocean">{title}</h3>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">
            {regularRooms.filter(r => r.status === 'available').length} Available
          </span>
          <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full">
            {regularRooms.filter(r => r.status === 'booked').length} Booked
          </span>
        </div>
      </div>

      {/* Main Rooms Grid */}
      <div className={`grid ${gridClasses} gap-4 mb-6`}>
        {regularRooms.map((room) => (
          <RoomBlock
            key={room.id}
            room={room}
            isSelected={selectedRoom?.id === room.id}
            onClick={onRoomClick}
            size={room.type === 'hall' ? 'large' : 'medium'}
          />
        ))}
      </div>

      {/* Utility Rooms */}
      {utilityRooms.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-600 mb-3">Utility Areas</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {utilityRooms.map((room) => (
              <RoomBlock
                key={room.id}
                room={room}
                isSelected={selectedRoom?.id === room.id}
                onClick={onRoomClick}
                size="small"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default FloorSection
