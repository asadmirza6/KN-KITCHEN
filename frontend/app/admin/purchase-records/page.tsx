'use client'

/**
 * Admin Purchase Records Management Page
 * Create and view purchase records from vendors with automatic inventory updates.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { isAuthenticated, getCurrentUser } from '@/services/authService'
import axios from '@/lib/axios'
import { swrFetcher, swrConfig } from '@/lib/swr'
import { formatNumber } from '@/lib/currency'
import type { User } from '@/types/User'

interface PurchaseRecord {
  id: number
  vendor_id: number
  vendor_name: string
  inventory_item_id: number
  item_name: string
  quantity: number
  rate: number
  total_amount: number
  date: string
}

interface Vendor {
  id: number
  name: string
  contact_info: string
  category: string
}

interface InventoryItem {
  id: number
  item_name: string
  unit: string
  current_stock: number
  average_price: number
}

interface PurchaseFormData {
  vendor_id: number
  inventory_item_id: number
  quantity: number
  rate: number
}

export default function AdminPurchaseRecordsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [mounted, setMounted] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const { data: purchases = [], error: purchasesError, isLoading: purchasesLoading, mutate: mutatePurchases } = useSWR(
    isAuthenticated() && getCurrentUser()?.role === 'ADMIN' ? '/purchase-records' : null,
    swrFetcher,
    swrConfig
  )

  const { data: vendors = [], error: vendorsError, isLoading: vendorsLoading } = useSWR(
    isAuthenticated() && getCurrentUser()?.role === 'ADMIN' ? '/vendors' : null,
    swrFetcher,
    swrConfig
  )

  const { data: inventory = [], error: inventoryError, isLoading: inventoryLoading } = useSWR(
    isAuthenticated() && getCurrentUser()?.role === 'ADMIN' ? '/inventory' : null,
    swrFetcher,
    swrConfig
  )

  const [formData, setFormData] = useState<PurchaseFormData>({
    vendor_id: 0,
    inventory_item_id: 0,
    quantity: 0,
    rate: 0,
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

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setSuccess('')
    setSubmitting(true)

    try {
      if (!formData.vendor_id) {
        throw new Error('Please select a vendor')
      }
      if (!formData.inventory_item_id) {
        throw new Error('Please select an inventory item')
      }
      if (formData.quantity <= 0) {
        throw new Error('Quantity must be greater than 0')
      }
      if (formData.rate <= 0) {
        throw new Error('Rate must be greater than 0')
      }

      const formDataToSend = new FormData()
      formDataToSend.append('vendor_id', String(parseInt(String(formData.vendor_id))))
      formDataToSend.append('inventory_item_id', String(parseInt(String(formData.inventory_item_id))))
      formDataToSend.append('quantity', String(parseFloat(String(formData.quantity))))
      formDataToSend.append('rate', String(parseFloat(String(formData.rate))))

      await axios.post('/purchase-records', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setSuccess('Purchase record created successfully! Inventory updated with weighted average pricing.')
      setFormData({ vendor_id: 0, inventory_item_id: 0, quantity: 0, rate: 0 })
      setShowForm(false)
      mutatePurchases()
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to create purchase record'
      setFormError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (recordId: number) => {
    try {
      await axios.delete(`/purchase-records/${recordId}`)
      setSuccess('Purchase record deleted and inventory reversed!')
      setDeleteConfirm(null)
      mutatePurchases()
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to delete purchase record'
      setFormError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage))
    }
  }

  const calculateTotal = () => {
    return formatNumber(formData.quantity * formData.rate)
  }

  // Format quantity without decimals
  const formatQuantity = (qty: number): string => {
    return Math.round(qty).toString()
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
            onClick={() => setShowForm(!showForm)}
            className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded font-bold hover:bg-indigo-700 text-sm sm:text-base"
          >
            {showForm ? 'Close' : '+ New Purchase'}
          </button>
        </div>

        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-black mb-4 sm:mb-6">Purchase Records</h1>

        {/* Error/Success Messages */}
        {formError && (
          <div className="bg-red-100 text-red-900 p-3 sm:p-4 rounded mb-4 font-bold text-sm sm:text-base">
            {formError}
          </div>
        )}
        {success && (
          <div className="bg-green-100 text-green-900 p-3 sm:p-4 rounded mb-4 font-bold text-sm sm:text-base">
            {typeof success === 'string' ? success : 'Operation successful'}
          </div>
        )}

        {/* Create Purchase Form */}
        {showForm && (
          <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-6">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-4 text-black">
              Record New Purchase
            </h2>

            <form onSubmit={handleCreatePurchase} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-black mb-1">
                    Vendor *
                  </label>
                  <select
                    value={formData.vendor_id}
                    onChange={(e) => setFormData({ ...formData, vendor_id: parseInt(e.target.value) })}
                    className="border p-2 rounded w-full text-black font-bold text-sm"
                    required
                  >
                    <option value={0}>Select Vendor</option>
                    {vendors.map((vendor: Vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name} ({vendor.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-black mb-1">
                    Inventory Item *
                  </label>
                  <select
                    value={formData.inventory_item_id}
                    onChange={(e) => setFormData({ ...formData, inventory_item_id: parseInt(e.target.value) })}
                    className="border p-2 rounded w-full text-black font-bold text-sm"
                    required
                  >
                    <option value={0}>Select Item</option>
                    {inventory.map((item: InventoryItem) => (
                      <option key={item.id} value={item.id}>
                        {item.item_name} ({item.unit}) - Stock: {formatQuantity(item.current_stock)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-black mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                    className="border p-2 rounded w-full text-black font-bold text-sm"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-black mb-1">
                    Rate per Unit *
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })}
                    className="border p-2 rounded w-full text-black font-bold text-sm"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div className="bg-gray-50 p-3 sm:p-4 rounded">
                <p className="text-xs sm:text-sm text-gray-600">Total Amount:</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">Rs. {calculateTotal()}</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 disabled:opacity-50 text-sm sm:text-base"
                >
                  {submitting ? 'Recording...' : 'Record Purchase'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setFormData({ vendor_id: 0, inventory_item_id: 0, quantity: 0, rate: 0 })
                    setFormError('')
                  }}
                  className="flex-1 bg-gray-400 text-white px-4 py-2 rounded font-bold hover:bg-gray-500 text-sm sm:text-base"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Purchase Records Table */}
        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold mb-4 text-black">Purchase History</h2>

          {!mounted || purchasesLoading ? (
            <div className="p-8 sm:p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-gray-600 text-sm sm:text-base">Loading purchase records...</p>
            </div>
          ) : purchases.length === 0 ? (
            <div className="p-8 sm:p-12 text-center text-gray-500">
              <p className="text-sm sm:text-base">No purchase records found. Click "New Purchase" to add one.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-3 sm:px-4 font-semibold text-black text-sm">Date</th>
                      <th className="text-left py-3 px-3 sm:px-4 font-semibold text-black text-sm">Vendor</th>
                      <th className="text-left py-3 px-3 sm:px-4 font-semibold text-black text-sm">Item</th>
                      <th className="text-left py-3 px-3 sm:px-4 font-semibold text-black text-sm">Quantity</th>
                      <th className="text-left py-3 px-3 sm:px-4 font-semibold text-black text-sm">Rate</th>
                      <th className="text-left py-3 px-3 sm:px-4 font-semibold text-black text-sm">Total Amount</th>
                      <th className="text-left py-3 px-3 sm:px-4 font-semibold text-black text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map((record: PurchaseRecord) => (
                      <tr key={record.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-3 sm:px-4 text-gray-600 text-sm">
                          {new Date(record.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-black font-bold text-sm">{record.vendor_name}</td>
                        <td className="py-3 px-3 sm:px-4 text-gray-600 text-sm">{record.item_name}</td>
                        <td className="py-3 px-3 sm:px-4 text-gray-600 font-bold text-sm">{formatQuantity(record.quantity)}</td>
                        <td className="py-3 px-3 sm:px-4 text-gray-600 text-sm">Rs. {formatNumber(record.rate)}</td>
                        <td className="py-3 px-3 sm:px-4 text-gray-600 font-bold text-sm">Rs. {formatNumber(record.total_amount)}</td>
                        <td className="py-3 px-3 sm:px-4 text-sm">
                          <button
                            onClick={() => setDeleteConfirm(record.id)}
                            className="text-red-600 hover:text-red-800 font-bold"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3 sm:space-y-4">
                {purchases.map((record: PurchaseRecord) => (
                  <div key={record.id} className="bg-white border-l-4 border-indigo-600 rounded-lg p-3 sm:p-4">
                    <div className="flex justify-between items-start mb-2 sm:mb-3">
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-black">{record.vendor_name}</h3>
                        <p className="text-xs sm:text-sm text-gray-600">{new Date(record.date).toLocaleDateString()}</p>
                      </div>
                      <button
                        onClick={() => setDeleteConfirm(record.id)}
                        className="text-red-600 hover:text-red-800 font-bold text-lg"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">{record.item_name}</p>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 bg-gray-50 p-2 sm:p-3 rounded">
                      <div>
                        <p className="text-xs text-gray-700 font-bold">Quantity</p>
                        <p className="text-black font-bold text-sm">{formatQuantity(record.quantity)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-700 font-bold">Rate</p>
                        <p className="text-black font-bold text-sm">Rs. {formatNumber(record.rate)}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-gray-700 font-bold">Total Amount</p>
                        <p className="text-black font-bold text-sm">Rs. {formatNumber(record.total_amount)}</p>
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
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">Delete Purchase Record?</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                Are you sure you want to delete this purchase record? The inventory will be reversed and the weighted average price will be recalculated.
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
