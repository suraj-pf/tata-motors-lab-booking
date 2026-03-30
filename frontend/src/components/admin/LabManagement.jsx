import React, { useState, useEffect } from 'react'
import { adminApi } from '../../api/admin'
import { Search, Building, Edit3, Trash2, Monitor, Users, DollarSign, Snowflake, ToggleLeft, ToggleRight } from 'lucide-react'
import LoadingSpinner from '../common/LoadingSpinner'
import EditLabModal from './EditLabModal'
import DeleteConfirmationModal from './DeleteConfirmationModal'
import toast from 'react-hot-toast'

const LabManagement = () => {
  const [labs, setLabs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedLab, setSelectedLab] = useState(null)

  useEffect(() => {
    fetchLabs()
  }, [])

  const fetchLabs = async () => {
    try {
      const response = await adminApi.getAllLabs()
      setLabs(response.data.labs || [])
    } catch (error) {
      toast.error('Failed to load labs')
      console.error('Failed to fetch labs:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredLabs = labs.filter(lab =>
    lab.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lab.building?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lab.lab_owner?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleEditLab = (lab) => {
    setSelectedLab(lab)
    setShowEditModal(true)
  }

  const handleDeleteLab = (lab) => {
    setSelectedLab(lab)
    setShowDeleteModal(true)
  }

  const handleToggleLabStatus = async (lab) => {
    try {
      const newStatus = !lab.is_active
      await adminApi.toggleLabStatus(lab.id)
      
      setLabs(prev => prev.map(l => 
        l.id === lab.id ? { ...l, is_active: newStatus } : l
      ))
      
      toast.success(`Lab ${newStatus ? 'enabled' : 'disabled'} successfully`)
    } catch (error) {
      toast.error('Failed to update lab status')
      console.error('Failed to toggle lab status:', error)
    }
  }

  const handleLabUpdated = (updatedLab) => {
    setLabs(prev => prev.map(l => 
      l.id === updatedLab.id ? updatedLab : l
    ))
    setShowEditModal(false)
    setSelectedLab(null)
    toast.success('Lab updated successfully')
  }

  const handleLabDeleted = () => {
    setLabs(prev => prev.filter(l => l.id !== selectedLab.id))
    setShowDeleteModal(false)
    setSelectedLab(null)
    toast.success('Lab deleted successfully')
  }

  const getStatusBadgeColor = (isActive) => {
    return isActive 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-red-100 text-red-800 border-red-200'
  }

  if (loading) {
    return <LoadingSpinner fullScreen message='Loading labs...' />
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
          <h2 className='text-2xl font-bold text-ocean mb-1'>Lab Management</h2>
          <p className='text-gray-600'>Manage lab facilities and their configurations</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className='bg-white/95 backdrop-blur-xl rounded-xl p-4 shadow-lg'>
        <div className='relative max-w-md'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' size={20} />
          <input
            type='text'
            placeholder='Search labs...'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='w-full pl-10 pr-4ki py-2 rounded-lg border border-gray-200 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all'
          />
        </div>
      </div>

      {/* Labs Grid */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        {filteredLabs.length === 0 ? (
          <div className='col-span-full bg-white/95 backdrop-blur-xl rounded-xl p-12 text-center shadow-lg'>
            <Building size={48} className='text-gray-300 mx-auto mb-3' />
            <p className='text-lg font-medium text-gray-900'>No labs found</p>
            <p className='text-sm text-gray-500'>Try adjusting your search</p>
          </div>
        ) : (
          filteredLabs.map((lab) => (
            <div
              key={lab.id}
              className='bg-white/95 backdrop-blur-xl rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow'
            >
              {/* Lab Header */}
              <div className='p-4 border-b border-gray-100'>
                <div className='flex items-start justify-between mb-2'>
                  <h3 className='text-lg font-semibold text-ocean'>{lab.name}</h3>
                  <div className='flex items-center gap-2'>
                    <button
                      onClick={() => handleToggleLabStatus(lab)}
                      className='p-1 hover:bg-gray-100 rounded-lg transition-colors'
                      title={lab.is_active ? 'Disable lab' : 'Enable lab'}
                    >
                      {lab.is_active ? (
                        <ToggleRight size={20} className='text-green-600' />
                      ) : (
                        <ToggleLeft size={20} className='text-red-600' />
                      )}
                    </button>
                    <span className={`inline-flex px-2ki py-1 text-xs font-semibold rounded-full border ${getStatusBadgeColor(lab.is_active)}`}>
                      {lab.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                </div>
                <div className='flex items-center gap-2 text-sm text-gray-600'>
                  <Building size={14} />
                  <span>{lab.building}</span>
                </div>
              </div>

              {/* Lab Details */}
              <div className='p-4 space-y-3'>
                <div className='grid grid-cols-2 gap-3'>
                  <div className='flex items-center gap-2 text-sm'>
                    <Users size={16} className='text-gray-400' />
                    <span className='text-gray-700'>{lab.capacity} seats</span>
                  </div>
                  <div className='flex items-center gap-2 text-sm'>
                    <DollarSign size={16} className='text-gray-400' />
                    <span className='text-gray-700'>₹{lab.hourly_charges}/hr</span>
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-3'>
                  <div className='flex items-center gap-2 text-sm'>
                    {lab.is_ac ? (
                      <>
                        <Snowflake size={16} className='text-blue-400' />
                        <span className='text-gray-700'>AC</span>
                      </>
                    ) : (
                      <>
                        <div className='w-4 h-4 border-2 border-gray-300 rounded' />
                        <span className='text-gray-700'>Non-AC</span>
                      </>
                    )}
                  </div>
                  <div className='flex items-center gap-2 text-sm'>
                    {lab.has_projector ? (
                      <>
                        <Monitor size={16} className='text-purple-400' />
                        <span className='text-gray-700'>Projector</span>
                      </>
                    ) : (
                      <>
                        <div className='w-4 h-4 border-2 border-gray-300 rounded' />
                        <span className='text-gray-700'>No Projector</span>
                      </>
                    )}
                  </div>
                </div>

                <div className='pt-2 border-t border-gray-100'>
                  <p className='text-sm text-gray-600'>
                    <span className='font-medium'>Owner:</span> {lab.lab_owner || 'Not assigned'}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className='p-4 bg-gray-50 border-t border-gray-100'>
                <div className='flex gap-2'>
                  <button
                    onClick={() => handleEditLab(lab)}
                    className='flex-1 flex items-center justify-center gap-2 px-ki py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium'
                  >
                    <Edit3 size={14} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteLab(lab)}
                    className='flex-1 flex items-center justify-center gap-2 pxki py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium'
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Lab Modal */}
      {showEditModal && selectedLab && (
        <EditLabModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setSelectedLab(null)
          }}
          onLabUpdated={handleLabUpdated}
          lab={selectedLab}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedLab && (
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false)
            setSelectedLab(null)
          }}
          onConfirm={handleLabDeleted}
          itemType='lab'
          itemName={selectedLab.name}
          warningMessage='This will permanently delete the lab and all associated bookings. This action cannot be undone.'
        />
      )}
    </div>
  )
}

export default LabManagement
