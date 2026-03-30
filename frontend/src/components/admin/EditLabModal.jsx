import React, { useState, useEffect } from 'react'
import { X, Edit3, Building, Users, DollarSign, Thermometer, Monitor } from 'lucide-react'
import { adminApi } from '../../api/admin'
import toast from 'react-hot-toast'

const EditLabModal = ({ isOpen, onClose, onLabUpdated, lab }) => {
  const [formData, setFormData] = useState({
    name: '',
    building: '',
    capacity: '',
    hourly_charges: '',
    is_ac: false,
    has_projector: false,
    lab_owner: '',
    facilities: ''
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (lab && isOpen) {
      setFormData({
        name: lab.name || '',
        building: lab.building || '',
        capacity: lab.capacity || '',
        hourly_charges: lab.hourly_charges || '',
        is_ac: lab.is_ac || false,
        has_projector: lab.has_projector || false,
        lab_owner: lab.lab_owner || '',
        facilities: lab.facilities || ''
      })
      setErrors({})
    }
  }, [lab, isOpen])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }))
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Lab name is required'
    }
    
    if (!formData.building.trim()) {
      newErrors.building = 'Building is required'
    }
    
    if (!formData.capacity || formData.capacity <= 0) {
      newErrors.capacity = 'Valid capacity is required'
    }
    
    if (!formData.hourly_charges || formData.hourly_charges <= 0) {
      newErrors.hourly_charges = 'Valid hourly charge is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setLoading(true)
    
    try {
      const updateData = {
        ...formData,
        capacity: parseInt(formData.capacity),
        hourly_charges: parseFloat(formData.hourly_charges)
      }
      
      const response = await adminApi.updateLab(lab.id, updateData)
      
      if (response.data.success) {
        onLabUpdated({
          ...lab,
          ...updateData
        })
        setErrors({})
      }
    } catch (error) {
      console.error('Update lab error:', error)
      
      if (error.response?.data?.error) {
        toast.error(error.response.data.error)
      } else {
        toast.error('Failed to update lab')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setErrors({})
      onClose()
    }
  }

  if (!isOpen || !lab) return null

  return (
    <div className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4'>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto'>
        {/* Header */}
        <div className='flex items-center justify-between p-6 border-b border-gray-200'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-blue/10 rounded-full flex items-center justify-center'>
              <Edit3 size={20} className='text-blue' />
            </div>
            <h2 className='text-xl font-bold text-ocean'>Edit Lab</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className='p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50'
          >
            <X size={20} className='text-gray-500' />
          </button>
        </div>

        {/* Lab Info */}
        <div className='px-6 py-4 bg-gray-50 border-b border-gray-200'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-teal/10 rounded-full flex items-center justify-center'>
              <Building size={20} className='text-teal' />
            </div>
            <div>
              <p className='font-medium text-gray-900'>{lab.name}</p>
              <p className='text-sm text-gray-500'>{lab.building}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className='p-6 space-y-4'>
          {/* Lab Name */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Lab Name *
            </label>
            <div className='relative'>
              <Building size={18} className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' />
              <input
                type='text'
                name='name'
                value={formData.name}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-2 rounded-lg border ${errors.name ? 'border-red-300' : 'border-gray-200'} focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all`}
                placeholder='Enter lab name'
                disabled={loading}
              />
            </div>
            {errors.name && (
              <p className='mt-1 text-sm text-red-600'>{errors.name}</p>
            )}
          </div>

          {/* Building */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Building *
            </label>
            <div className='relative'>
              <Building size={18} className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' />
              <input
                type='text'
                name='building'
                value={formData.building}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-2 rounded-lg border ${errors.building ? 'border-red-300' : 'border-gray-200'} focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all`}
                placeholder='Enter building name'
                disabled={loading}
              />
            </div>
            {errors.building && (
              <p className='mt-1 text-sm text-red-600'>{errors.building}</p>
            )}
          </div>

          {/* Capacity and Hourly Charges */}
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Capacity *
              </label>
              <div className='relative'>
                <Users size={18} className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' />
                <input
                  type='number'
                  name='capacity'
                  value={formData.capacity}
                  onChange={handleChange}
                  min='1'
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border ${errors.capacity ? 'border-red-300' : 'border-gray-200'} focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all`}
                  placeholder='Seats'
                  disabled={loading}
                />
              </div>
              {errors.capacity && (
                <p className='mt-1 text-sm text-red-600'>{errors.capacity}</p>
              )}
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Hourly Charges *
              </label>
              <div className='relative'>
                <DollarSign size={18} className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' />
                <input
                  type='number'
                  name='hourly_charges'
                  value={formData.hourly_charges}
                  onChange={handleChange}
                  min='0'
                  step='0.01'
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border ${errors.hourly_charges ? 'border-red-300' : 'border-gray-200'} focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all`}
                  placeholder='Rate'
                  disabled={loading}
                />
              </div>
              {errors.hourly_charges && (
                <p className='mt-1 text-sm text-red-600'>{errors.hourly_charges}</p>
              )}
            </div>
          </div>

          {/* Lab Owner */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Lab Owner
            </label>
            <div className='relative'>
              <Edit3 size={18} className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' />
              <input
                type='text'
                name='lab_owner'
                value={formData.lab_owner}
                onChange={handleChange}
                className='w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all'
                placeholder='Enter lab owner name'
                disabled={loading}
              />
            </div>
          </div>

          {/* Facilities */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Facilities
            </label>
            <textarea
              name='facilities'
              value={formData.facilities}
              onChange={handleChange}
              rows='3'
              className='w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all resize-none'
              placeholder='Describe lab facilities...'
              disabled={loading}
            />
          </div>

          {/* Features */}
          <div className='space-y-3'>
            <label className='block text-sm font-medium text-gray-700'>
              Features
            </label>
            
            <div className='flex items-center gap-3'>
              <input
                type='checkbox'
                name='is_ac'
                checked={formData.is_ac}
                onChange={handleChange}
                disabled={loading}
                className='w-4 h-4 text-teal border-gray-300 rounded focus:ring-teal focus:ring-2'
              />
              <label htmlFor='is_ac' className='flex items-center gap-2 cursor-pointer'>
                <Thermometer size={16} className='text-blue-400' />
                <span className='text-sm text-gray-700'>Air Conditioning</span>
              </label>
            </div>

            <div className='flex items-center gap-3'>
              <input
                type='checkbox'
                name='has_projector'
                checked={formData.has_projector}
                onChange={handleChange}
                disabled={loading}
                className='w-4 h-4 text-teal border-gray-300 rounded focus:ring-teal focus:ring-2'
              />
              <label htmlFor='has_projector' className='flex items-center gap-2 cursor-pointer'>
                <Monitor size={16} className='text-purple-400' />
                <span className='text-sm text-gray-700'>Projector</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className='flex gap-3 pt-4'>
            <button
              type='button'
              onClick={handleClose}
              disabled={loading}
              className='flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50'
            >
              Cancel
            </button>
            <button
              type='submit'
              disabled={loading}
              className='flex-1 px-4 py-2 bg-gradient-to-r from-blue to-blue-light text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50'
            >
              {loading ? 'Updating...' : 'Update Lab'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditLabModal
