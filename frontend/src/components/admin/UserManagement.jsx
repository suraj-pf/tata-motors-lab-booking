import React, { useState, useEffect } from 'react'
import { adminApi } from '../../api/admin'
import { Search, UserPlus, Trash2, Shield, Edit3, X, Check, AlertTriangle, ToggleLeft, ToggleRight } from 'lucide-react'
import LoadingSpinner from '../common/LoadingSpinner'
import CreateUserModal from './CreateUserModal'
import EditUserModal from './EditUserModal'
import DeleteConfirmationModal from './DeleteConfirmationModal'
import toast from 'react-hot-toast'

const UserManagement = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await adminApi.getUsers()
      setUsers(response.data.users || [])
    } catch (error) {
      toast.error('Failed to load users')
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.bc_number?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCreateUser = () => {
    setShowCreateModal(true)
  }

  const handleEditUser = (user) => {
    setSelectedUser(user)
    setShowEditModal(true)
  }

  const handleDeleteUser = (user) => {
    setSelectedUser(user)
    setShowDeleteModal(true)
  }

  const handleToggleUserStatus = async (user) => {
    try {
      const newStatus = !user.is_active
      await adminApi.toggleUserStatus(user.id)
      
      setUsers(prev => prev.map(u => 
        u.id === user.id ? { ...u, is_active: newStatus } : u
      ))
      
      toast.success(`User ${newStatus ? 'enabled' : 'disabled'} successfully`)
    } catch (error) {
      toast.error('Failed to update user status')
      console.error('Failed to toggle user status:', error)
    }
  }

  const handleUserCreated = (newUser) => {
    setUsers(prev => [newUser, ...prev])
    setShowCreateModal(false)
    toast.success('User created successfully')
  }

  const handleUserUpdated = (updatedUser) => {
    setUsers(prev => prev.map(u => 
      u.id === updatedUser.id ? updatedUser : u
    ))
    setShowEditModal(false)
    setSelectedUser(null)
    toast.success('User updated successfully')
  }

  const handleUserDeleted = () => {
    setUsers(prev => prev.filter(u => u.id !== selectedUser.id))
    setShowDeleteModal(false)
    setSelectedUser(null)
    toast.success('User deleted successfully')
  }

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'staff':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusBadgeColor = (isActive) => {
    return isActive 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-red-100 text-red-800 border-red-200'
  }

  if (loading) {
    return <LoadingSpinner fullScreen message='Loading users...' />
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
          <h2 className='text-2xl font-bold text-ocean mb-1'>User Management</h2>
          <p className='text-gray-600'>Manage system users and their permissions</p>
        </div>
        <button
          onClick={handleCreateUser}
          className='tata-btn flex items-center gap-2'
        >
          <UserPlus size={18} />
          Create User
        </button>
      </div>

      {/* Search Bar */}
      <div className='bg-white/95 backdrop-blur-xl rounded-xl p-4 shadow-lg'>
        <div className='relative max-w-md'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' size={20} />
          <input
            type='text'
            placeholder='Search users...'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all'
          />
        </div>
      </div>

      {/* Users Table */}
      <div className='bg-white/95 backdrop-blur-xl rounded-xl shadow-lg overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead className='bg-gray-50 border-b border-gray-200'>
              <tr>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  User
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Contact
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Role
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Status
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-200'>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan='5' className='px-6 py-12 text-center text-gray-500'>
                    <div className='flex flex-col items-center'>
                      <Shield size={48} className='text-gray-300 mb-3' />
                      <p className='text-lg font-medium'>No users found</p>
                      <p className='text-sm'>Try adjusting your search or create a new user</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className='hover:bg-gray-50 transition-colors'>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center'>
                        <div className='w-10 h-10 bg-teal/10 rounded-full flex items-center justify-center mr-3'>
                          <span className='text-teal font-semibold text-sm'>
                            {user.name?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <div className='text-sm font-medium text-gray-900'>
                            {user.name}
                          </div>
                          <div className='text-sm text-gray-500'>
                            {user.username}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='text-sm text-gray-900'>
                        {user.email}
                      </div>
                      <div className='text-sm text-gray-500'>
                        {user.department} • {user.bc_number}
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center gap-2'>
                        <button
                          onClick={() => handleToggleUserStatus(user)}
                          className='p-1 hover:bg-gray-100 rounded-lg transition-colors'
                          title={user.is_active ? 'Disable user' : 'Enable user'}
                        >
                          {user.is_active ? (
                            <ToggleRight size={20} className='text-green-600' />
                          ) : (
                            <ToggleLeft size={20} className='text-red-600' />
                          )}
                        </button>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusBadgeColor(user.is_active)}`}>
                          {user.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm font-medium'>
                      <div className='flex items-center gap-2'>
                        <button
                          onClick={() => handleEditUser(user)}
                          className='p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors'
                          title='Edit user'
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className='p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors'
                          title='Delete user'
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onUserCreated={handleUserCreated}
        />
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <EditUserModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setSelectedUser(null)
          }}
          onUserUpdated={handleUserUpdated}
          user={selectedUser}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedUser && (
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false)
            setSelectedUser(null)
          }}
          onConfirm={handleUserDeleted}
          itemType='user'
          itemName={selectedUser.name}
          warningMessage='This will permanently delete the user and all their associated data. This action cannot be undone.'
        />
      )}
    </div>
  )
}

export default UserManagement
