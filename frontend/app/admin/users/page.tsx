'use client'

/**
 * Admin Users Management Page
 * Manage ADMIN and STAFF users (ADMIN only)
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated, getCurrentUser } from '@/services/authService'
import axios from '@/lib/axios'
import Toast from '@/components/Toast'

interface User {
  id: number
  name: string
  email: string
  role: string
  created_at: string
}

interface CurrentUser {
  id: number
  name: string
  email: string
  role: string
}

interface Order {
  id: number
  customer_name: string
  customer_email: string
  customer_phone: string
  total_amount: string
  advance_payment: string
  balance: string
  status: string
  delivery_date: string | null
  notes: string | null
  created_at: string
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success' | 'error', isVisible: false })
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showUserOrders, setShowUserOrders] = useState(false)
  const [userOrders, setUserOrders] = useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showPasswordReset, setShowPasswordReset] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [passwordResetSubmitting, setPasswordResetSubmitting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STAFF'
  })
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    role: 'STAFF'
  })
  const [submitting, setSubmitting] = useState(false)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type, isVisible: true });
  };

  const getUserOrders = async (user: User) => {
    try {
      setLoadingOrders(true);
      setSelectedUser(user);
      const response = await axios.get(`/users/${user.id}/orders`);
      setUserOrders(response.data);
      setShowUserOrders(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch user orders');
      showToast(err.response?.data?.detail || 'Failed to fetch user orders', 'error');
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditFormData({
      name: user.name,
      email: user.email,
      role: user.role
    });
    setSelectedUser(user);
    setShowEditForm(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUser) return;

    try {
      setSubmitting(true);
      const response = await axios.put(`/users/${selectedUser.id}`, {
        name: editFormData.name,
        email: editFormData.email,
        password: 'temp_password_for_validation', // Will be ignored by backend
        role: editFormData.role
      });

      // Optimistically update the user in the list
      setUsers(prevUsers =>
        prevUsers.map(u =>
          u.id === selectedUser.id
            ? {
                id: response.data.id,
                name: response.data.name,
                email: response.data.email,
                role: response.data.role,
                created_at: response.data.created_at
              }
            : u
        )
      );

      // Also refresh from server to ensure consistency
      await fetchUsers(true);

      // Close form and show success
      setShowEditForm(false);
      setSelectedUser(null);
      setEditFormData({ name: '', email: '', role: 'STAFF' });

      showToast('User updated successfully!', 'success');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update user');
      showToast(err.response?.data?.detail || 'Failed to update user', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenPasswordReset = (user: User) => {
    setSelectedUser(user);
    setShowPasswordReset(true);
    setNewPassword('');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUser || newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setPasswordResetSubmitting(true);
      await axios.post(`/users/${selectedUser.id}/reset-password`, {
        new_password: newPassword
      });

      // Close form and show success
      setShowPasswordReset(false);
      setSelectedUser(null);
      setNewPassword('');

      showToast('Password reset successfully!', 'success');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reset password');
      showToast(err.response?.data?.detail || 'Failed to reset password', 'error');
    } finally {
      setPasswordResetSubmitting(false);
    }
  };

  const closeModals = () => {
    setShowUserOrders(false);
    setShowEditForm(false);
    setShowPasswordReset(false);
    setSelectedUser(null);
    setNewPassword('');
    setUserOrders([]);
    setEditFormData({ name: '', email: '', role: 'STAFF' });
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }

    // Get current user info
    const user = getCurrentUser()
    setCurrentUser(user)

    // Check if user is ADMIN
    if (user?.role !== 'ADMIN') {
      router.push('/admin')
      return
    }

    fetchUsers()
  }, [router])

  const fetchUsers = async (showToastOnError = false) => {
    try {
      setLoading(true)
      setError(null)
      const response = await axios.get('/users/')
      setUsers(response.data)
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to fetch users'
      setError(errorMessage)
      if (showToastOnError) {
        showToast(errorMessage, 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.email || !formData.password) {
      setError('Please fill in all required fields')
      showToast('Please fill in all required fields', 'error')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      showToast('Password must be at least 6 characters', 'error')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await axios.post('/users/', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role
      })

      // Reset form
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'STAFF'
      })
      setShowForm(false)

      // Immediately append the new user to the list (optimistic update)
      const newUser = {
        id: response.data.id,
        name: response.data.name,
        email: response.data.email,
        role: response.data.role,
        created_at: response.data.created_at
      }
      setUsers(prevUsers => [...prevUsers, newUser])

      // Also refresh from server to ensure consistency
      await fetchUsers(true)

      // Show success message
      showToast('User created successfully!', 'success');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create user')
      showToast(err.response?.data?.detail || 'Failed to create user', 'error');
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (user: User) => {
    if (user.id === currentUser?.id) {
      setError('Cannot delete your own account')
      showToast('Cannot delete your own account', 'error');
      return
    }

    if (!confirm(`Are you sure you want to delete user "${user.name}"?`)) {
      return
    }

    try {
      await axios.delete(`/users/${user.id}`)

      // Optimistically remove the user from the list
      setUsers(prevUsers => prevUsers.filter(u => u.id !== user.id))

      // Also refresh from server to ensure consistency
      await fetchUsers(true)

      showToast('User deleted successfully!', 'success');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete user')
      showToast(err.response?.data?.detail || 'Failed to delete user', 'error');
    }
  }

  const handleCancelForm = () => {
    setShowForm(false)
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'STAFF'
    })
    setError(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({...toast, isVisible: false})}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <button
            onClick={() => router.push('/admin')}
            className="text-indigo-600 hover:text-indigo-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>

          {currentUser?.role === 'ADMIN' && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add New User
            </button>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Add User Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Add New User
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., Ahmed Khan"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., ahmed@knkitchen.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Minimum 6 characters"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                >
                  <option value="STAFF">STAFF (Can create orders only)</option>
                  <option value="ADMIN">ADMIN (Full access)</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Creating...' : 'Create User'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Users List */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">System Users</h2>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-gray-600">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No users found. Click "Add New User" to create one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.role === 'ADMIN'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {currentUser?.role === 'ADMIN' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => getUserOrders(user)}
                              className="text-blue-600 hover:text-blue-900"
                              title="View user orders"
                            >
                              Orders
                            </button>
                            <button
                              onClick={() => handleEditUser(user)}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="Edit user"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleOpenPasswordReset(user)}
                              className="text-yellow-600 hover:text-yellow-900"
                              title="Reset password"
                            >
                              Reset Pass
                            </button>
                            <button
                              onClick={() => handleDelete(user)}
                              disabled={user.id === currentUser?.id}
                              className={`${
                                user.id === currentUser?.id
                                  ? 'text-gray-400 cursor-not-allowed'
                                  : 'text-red-600 hover:text-red-900'
                              }`}
                              title={user.id === currentUser?.id ? 'Cannot delete your own account' : 'Delete user'}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* View User Orders Modal */}
      {showUserOrders && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-gray-900">
                  Orders for {selectedUser.name}
                </h2>
                <button
                  onClick={closeModals}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {loadingOrders ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  <span className="ml-2 text-gray-600">Loading orders...</span>
                </div>
              ) : userOrders.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No orders found for this user.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {userOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            #{order.id}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{order.customer_name}</div>
                            <div className="text-sm text-gray-500">{order.customer_phone}</div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                            {order.total_amount}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              order.status === 'paid'
                                ? 'bg-green-100 text-green-800'
                                : order.status === 'partial'
                                ? 'bg-yellow-100 text-yellow-800'
                                : order.status === 'cancelled'
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(order.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditForm && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-gray-900">
                  Edit User: {selectedUser.name}
                </h2>
                <button
                  onClick={closeModals}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="e.g., Ahmed Khan"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="e.g., ahmed@knkitchen.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role *
                  </label>
                  <select
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  >
                    <option value="STAFF">STAFF (Can create orders only)</option>
                    <option value="ADMIN">ADMIN (Full access)</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Updating...' : 'Update User'}
                  </button>
                  <button
                    type="button"
                    onClick={closeModals}
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showPasswordReset && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-gray-900">
                  Reset Password: {selectedUser.name}
                </h2>
                <button
                  onClick={closeModals}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password *
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter new password (min 6 chars)"
                    required
                    minLength={6}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={passwordResetSubmitting}
                    className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {passwordResetSubmitting ? 'Resetting...' : 'Reset Password'}
                  </button>
                  <button
                    type="button"
                    onClick={closeModals}
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
