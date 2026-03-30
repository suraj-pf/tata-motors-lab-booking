import React, { useState } from 'react'
import { X, AlertTriangle, Trash2, Check } from 'lucide-react'

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, itemType, itemName, warningMessage }) => {
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const handleConfirm = async () => {
    if (!confirmed) {
      return
    }
    
    setLoading(true)
    
    try {
      await onConfirm()
    } catch (error) {
      console.error('Delete error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setConfirmed(false)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4'>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto'>
        {/* Header */}
        <div className='flex items-center justify-between p-6 border-b border-gray-200'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-red/10 rounded-full flex items-center justify-center'>
              <AlertTriangle size={20} className='text-red' />
            </div>
            <h2 className='text-xl font-bold text-ocean'>Delete {itemType}</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className='p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50'
          >
            <X size={20} className='text-gray-500' />
          </button>
        </div>

        {/* Content */}
        <div className='p-6'>
          {/* Warning Icon */}
          <div className='w-16 h-16 bg-red/10 rounded-full flex items-center justify-center mx-auto mb-4'>
            <Trash2 size={32} className='text-red' />
          </div>

          {/* Warning Message */}
          <div className='text-center mb-6'>
            <h3 className='text-lg font-semibold text-gray-900 mb-2'>
              Are you sure you want to delete "{itemName}"?
            </h3>
            <p className='text-gray-600 text-sm leading-relaxed'>
              {warningMessage}
            </p>
          </div>

          {/* Confirmation Checkbox */}
          <div className='mb-6'>
            <label className='flex items-start gap-3 cursor-pointer'>
              <input
                type='checkbox'
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                disabled={loading}
                className='mt-1 w-4 h-4 text-red border-gray-300 rounded focus:ring-red focus:ring-2'
              />
              <span className='text-sm text-gray-700'>
                I understand that this action is permanent and cannot be undone
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className='flex gap-3'>
            <button
              type='button'
              onClick={handleClose}
              disabled={loading}
              className='flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50'
            >
              Cancel
            </button>
            <button
              type='button'
              onClick={handleConfirm}
              disabled={!confirmed || loading}
              className='flex-1 px-4 py-2 bg-gradient-to-r from-red to-red-light text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
            >
              {loading ? (
                <>
                  <div className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Delete {itemType}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DeleteConfirmationModal
