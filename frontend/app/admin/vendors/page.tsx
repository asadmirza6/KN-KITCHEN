'use client'

/**
 * Admin Vendors Management Page
 * Manage vendors and view their credit/debit balance.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { isAuthenticated, getCurrentUser } from '@/services/authService'
import axios from '@/lib/axios'
import { swrFetcher, swrConfig } from '@/lib/swr'
import { formatNumber } from '@/lib/currency'
import type { User } from '@/types/User'

interface Vendor {
  id: number
  name: string
  contact_info: string
  category: string
  total_purchases: number
  total_payments: number
  balance: number
  created_at: string
}

interface VendorFormData {
  name: string
  contact_info: string
  category: string
}

export default function AdminVendorsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [mounted, setMounted] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const { data: vendors = [], error: vendorsError, isLoading: vendorsLoading, mutate: mutateVendors } = useSWR(
    isAuthenticated() && getCurrentUser()?.role === 'ADMIN' ? '/vendors' : null,
    swrFetcher,
    swrConfig
  )

  const [formData, setFormData] = useState<VendorFormData>({
    name: '',
    contact_info: '',
    category: '',
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }
    const currentUser = getCurrentUser()
    if (currentUser?.role !== 'ADMIN') {
      router.push('/admin')
    }
    setUser(currentUser)
  }, [router])

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setSuccess('')
    setSubmitting(true)

    try {
      if (!formData.name.trim()) {
        throw new Error('Vendor name is required')
      }
      if (!formData.contact_info.trim()) {
        throw new Error('Contact info is required')
      }
      if (!formData.category.trim()) {
        throw new Error('Category is required')
      }

      const formDataToSend = new FormData()
      formDataToSend.append('name', formData.name)
      formDataToSend.append('contact_info', formData.contact_info)
      formDataToSend.append('category', formData.category)

      if (editingId) {
        await axios.put(`/vendors/${editingId}`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        setSuccess('Vendor updated successfully!')
        setEditingId(null)
      } else {
        await axios.post('/vendors', formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        setSuccess('Vendor created successfully!')
      }

      setFormData({ name: '', contact_info: '', category: '' })
      setShowForm(false)
      mutateVendors()
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to save vendor'
      setFormError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage))
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (vendor: Vendor) => {
    setFormData({
      name: vendor.name,
      contact_info: vendor.contact_info,
      category: vendor.category,
    })
    setEditingId(vendor.id)
    setShowForm(true)
    setFormError('')
  }

  const handleDelete = async (vendorId: number) => {
    try {
      await axios.delete(`/vendors/${vendorId}`)
      setSuccess('Vendor deleted successfully!')
      setDeleteConfirm(null)
      mutateVendors()
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to delete vendor'
      setFormError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage))
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({ name: '', contact_info: '', category: '' })
    setFormError('')
  }

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'text-red-600' // We are owed money
    if (balance < 0) return 'text-green-600' // We owe money
    return 'text-gray-600'
  }

  if (!mounted) {
    return <div className="p-10 text-center text-black font-bold">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-transparent p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-6">
          <button
            onClick={() => router.push('/admin')}
            className="text-indigo-600 font-bold hover:text-indigo-800 text-sm sm:text-base"
          >
            ← Back
          </button>
          <button
            onClick={() => {
              setShowForm(!showForm)
              if (showForm) handleCancel()
            }}
            className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded font-bold hover:bg-indigo-700 text-sm sm:text-base"
          >
            {showForm ? 'Close' : '+ Add Vendor'}
          </button>
        </div>

        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6 text-black">Vendors Management</h1>

        {/* Error/Success Messages */}
        {formError && (
          <div className="bg-red-100 text-red-900 p-3 sm:p-4 rounded mb-4 font-bold text-sm sm:text-base">
            {formError}
          </div>
        )}
        {success && (
          <div className="bg-green-100 text-green-900 p-3 sm:p-4 rounded mb-4 font-bold text-sm sm:text-base">
            {success}
          </div>
        )}

        {/* Create/Edit Form */}
        {showForm && (
          <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-6">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-4 text-black">
              {editingId ? 'Edit Vendor' : 'Add New Vendor'}
            </h2>

            <form onSubmit={handleCreateVendor} className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-black mb-1">
                  Vendor Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., ABC Meat Suppliers"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="border p-2 rounded w-full text-black font-bold text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-black mb-1">
                  Contact Info *
                </label>
                <input
                  type="text"
                  placeholder="Phone, email, address"
                  value={formData.contact_info}
                  onChange={(e) => setFormData({ ...formData, contact_info: e.target.value })}
                  className="border p-2 rounded w-full text-black font-bold text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-black mb-1">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="border p-2 rounded w-full text-black font-bold text-sm"
                  required
                >
                  <option value="">Select Category</option>
                  <option value="Meat">Meat</option>
                  <option value="Grocery">Grocery</option>
                  <option value="Dairy">Dairy</option>
                  <option value="Spices">Spices</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 disabled:opacity-50 text-sm sm:text-base"
                >
                  {submitting ? 'Saving...' : editingId ? 'Update Vendor' : 'Create Vendor'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 bg-gray-400 text-white px-4 py-2 rounded font-bold hover:bg-gray-500 text-sm sm:text-base"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Vendors Table */}
        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold mb-4 text-black">Vendors List</h2>

          {!mounted || vendorsLoading ? (
            <div className="p-8 sm:p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-gray-600 text-sm sm:text-base">Loading vendors...</p>
            </div>
          ) : vendors.length === 0 ? (
            <div className="p-8 sm:p-12 text-center text-gray-500">
              <p className="text-sm sm:text-base">No vendors found. Click "Add Vendor" to add one.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-3 sm:px-4 font-semibold text-black text-sm">Name</th>
                      <th className="text-left py-3 px-3 sm:px-4 font-semibold text-black text-sm">Category</th>
                      <th className="text-left py-3 px-3 sm:px-4 font-semibold text-black text-sm">Contact</th>
                      <th className="text-left py-3 px-3 sm:px-4 font-semibold text-black text-sm">Total Purchases</th>
                      <th className="text-left py-3 px-3 sm:px-4 font-semibold text-black text-sm">Total Payments</th>
                      <th className="text-left py-3 px-3 sm:px-4 font-semibold text-black text-sm">Balance</th>
                      <th className="text-left py-3 px-3 sm:px-4 font-semibold text-black text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.map((vendor: Vendor) => (
                      <tr key={vendor.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-3 sm:px-4 text-black font-bold text-sm">{vendor.name}</td>
                        <td className="py-3 px-3 sm:px-4 text-gray-600 text-sm">{vendor.category}</td>
                        <td className="py-3 px-3 sm:px-4 text-gray-600 text-sm text-xs">{vendor.contact_info}</td>
                        <td className="py-3 px-3 sm:px-4 text-gray-600 font-bold text-sm">Rs. {formatNumber(vendor.total_purchases)}</td>
                        <td className="py-3 px-3 sm:px-4 text-gray-600 font-bold text-sm">Rs. {formatNumber(vendor.total_payments)}</td>
                        <td className={`py-3 px-3 sm:px-4 font-bold text-sm ${getBalanceColor(vendor.balance)}`}>
                          Rs. {formatNumber(Math.abs(vendor.balance))}
                          <p className="text-xs text-gray-600">{vendor.balance > 0 ? 'We owe' : vendor.balance < 0 ? 'They owe' : 'Settled'}</p>
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(vendor)}
                              className="text-blue-600 hover:text-blue-800 font-bold"
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(vendor.id)}
                              className="text-red-600 hover:text-red-800 font-bold"
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3 sm:space-y-4">
                {vendors.map((vendor: Vendor) => (
                  <div key={vendor.id} className="bg-white border-l-4 border-indigo-600 rounded-lg p-3 sm:p-4">
                    <div className="flex justify-between items-start mb-2 sm:mb-3">
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-black">{vendor.name}</h3>
                        <p className="text-xs sm:text-sm text-gray-600">{vendor.category}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(vendor)}
                          className="text-blue-600 hover:text-blue-800 font-bold text-lg"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(vendor.id)}
                          className="text-red-600 hover:text-red-800 font-bold text-lg"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mb-2 sm:mb-3">{vendor.contact_info}</p>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 bg-gray-50 p-2 sm:p-3 rounded">
                      <div>
                        <p className="text-xs text-gray-700 font-bold">Total Purchases</p>
                        <p className="text-black font-bold text-sm">Rs. {formatNumber(vendor.total_purchases)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-700 font-bold">Total Payments</p>
                        <p className="text-black font-bold text-sm">Rs. {formatNumber(vendor.total_payments)}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-gray-700 font-bold">Balance</p>
                        <p className={`font-bold text-sm ${getBalanceColor(vendor.balance)}`}>
                          Rs. {formatNumber(Math.abs(vendor.balance))} ({vendor.balance > 0 ? 'We owe' : vendor.balance < 0 ? 'They owe' : 'Settled'})
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteConfirm !== null && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">Delete Vendor?</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                Are you sure you want to delete this vendor? This action cannot be undone if there are no purchase records.
              </p>
              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded font-bold hover:bg-red-700 text-sm sm:text-base"
                >
                  Delete
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 bg-gray-400 text-white px-4 py-2 rounded font-bold hover:bg-gray-500 text-sm sm:text-base"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
