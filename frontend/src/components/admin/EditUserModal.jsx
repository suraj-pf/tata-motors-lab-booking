import React, { useState, useEffect } from 'react'
import { X, Edit3, Mail, Shield, Building, Key } from 'lucide-react'
import { adminApi } from '../../api/admin'
import toast from 'react-hot-toast'

const EditUserModal = ({ isOpen, onClose, onUserUpdated, user }) => {
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    role: 'staff',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        name: user.name || '',
        department: user.department || '',
        role: user.role || 'staff',
        password: ''
      })
      setErrors({})
    }
  }, [user, isOpen])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }
    
    if (!formData.department.trim()) {
      newErrors.department = 'Department is required'
    }
    
    if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
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
        name: formData.name,
        department: formData.department,
        role: formData.role
      }
      
      // Only include password if it's provided
      if (formData.password.trim()) {
        updateData.password = formData.password
      }
      
      const response = await adminApi.updateUser(user.id, updateData)
      
      if (response.data.success) {
        onUserUpdated({
          ...user,
          ...updateData
        })
        setFormData({
          name: '',
          department: '',
          role: 'staff',
          password: ''
        })
        setErrors({})
      }
    } catch (error) {
      console.error('Update user error:', error)
      
      if (error.response?.data?.error) {
        toast.error(error.response.data.error)
      } else {
        toast.error('Failed to update user')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setFormData({
        name: '',
        department: '',
        role: 'staff',
        password: ''
      })
      setErrors({})
      onClose()
    }
  }

  if (!isOpen || !user) return null

  return (
    <div className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4'>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto'>
        {/* Header */}
        <div className='flex items-center justify-between p-6 border-b border-gray-200'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-blue/10 rounded-full flex items-center justify-center'>
              <Edit3 size={20} className='text-blue' />
            </div>
            <h2 className='text-xl font-bold text-ocean'>Edit User</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className='p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50'
          >
            <X size={20} className='text-gray-500' />
          </button>
        </div>

        {/* User Info */}
        <div className='px-6 py-4 bg-gray-50 border-b border-gray-200'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-teal/10 rounded-full flex items-center justify-center'>
              <span className='text-teal font-semibold text-sm'>
                {user.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              <p className='font-medium text-gray-900'>{user.name}</p>
              <p className='text-sm text-gray-500'>@{user.username}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className='p-6 space-y-4'>
          {/* Name */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Full Name *
            </label>
            <div className='relative'>
              <Edit3 size={18} className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' />
              <input
                type='text'
                name='name'
                value={formData.name}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-2 rounded-lg border ${errors.name ? 'border-red-300' : 'border-gray-200'} focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all`}
                placeholder='Enter full name'
                disabled={loading}
              />
            </div>
            {errors.name && (
              <p className='mt-1 text-sm text-red-600'>{errors.name}</p>
            )}
          </div>

          {/* Department */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Department *
            </label>
            <div className='relative'>
              <Building size={18} className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' />
              <input
                type='text'
                name='department'
                value={formData.department}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-2 rounded-lg border ${errors.department ? 'border-red-300' : 'border-gray-200'} focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all`}
                placeholder='Enter department'
                disabled={loading}
              />
            </div>
            {errors.department && (
              <p className='mt-1 text-sm text-red-600'>{errors.department}</p>
            )}
          </div>

          {/* Role */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Role *
            </label>
            <div className='relative'>
              <Shield size={18} className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' />
              <select
                name='role'
                value={formData.role}
                onChange={handleChange}
                className='w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all appearance-none'
                disabled={loading}
              >
                <option value='staff'>Staff</option>
                <option value='admin'>Admin</option>
              </select>
            </div>
          </div>

          {/* Password (Optional) */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              New Password <span className='text-gray-500'>(leave blank to keep current)</span>
            </label>
            <div className='relative'>
              <Key size={18} className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' />
              <input
                type='password'
                name='password'
                value={formData.password}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-2 rounded-lg border ${errors.password ? 'border-red-300' : 'border-gray-200'} focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all`}
                placeholder='Enter new password (optional)'
                disabled={loading}
              />
            </div>
            {errors.password && (
              <p className='mt-1 text-sm text-red-600'>{errors.password}</p>
            )}
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
              {loading ? 'Updating...' : 'Update User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditUserModal
