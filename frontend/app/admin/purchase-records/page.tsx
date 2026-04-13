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

      // DEBUG: Log form data before sending
      console.log('DEBUG: Purchase Form Data', {
        vendor_id: formData.vendor_id,
        inventory_item_id: formData.inventory_item_id,
        quantity: formData.quantity,
        rate: formData.rate,
      })

      const formDataToSend = new FormData()
      formDataToSend.append('vendor_id', String(parseInt(String(formData.vendor_id))))
      formDataToSend.append('inventory_item_id', String(parseInt(String(formData.inventory_item_id))))
      formDataToSend.append('quantity', String(parseFloat(String(formData.quantity))))
      formDataToSend.append('rate', String(parseFloat(String(formData.rate))))

      console.log('DEBUG: FormData entries:')
      formDataToSend.forEach((value, key) => {
        console.log(`  ${key}: ${value}`)
      })

      const response = await axios.post('/purchase-records', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      console.log('DEBUG: Purchase created successfully', response.data)

      setSuccess('Purchase record created successfully! Inventory updated with weighted average pricing.')
      setFormData({ vendor_id: 0, inventory_item_id: 0, quantity: 0, rate: 0 })
      setShowForm(false)
      mutatePurchases()
    } catch (err: any) {
      console.error('DEBUG: Error creating purchase', err)
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to create purchase record'
      setFormError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage))
    } finally {
      setSubmitting(false)
    }
  }

  const calculateTotal = () => {
    return (formData.quantity * formData.rate).toFixed(2)
  }

  if (!mounted) {
    return <div className="p-10 text-center text-black font-bold">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-transparent p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <button
            onClick={() => router.push('/admin')}
            className="text-indigo-600 font-bold hover:text-indigo-800"
          >
            ← Back
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full md:w-auto bg-indigo-600 text-white px-4 py-2 rounded font-bold hover:bg-indigo-700"
          >
            {showForm ? 'Close' : '+ New Purchase'}
          </button>
        </div>

        <h1 className="text-3xl font-bold text-black mb-6">Purchase Records</h1>

        {/* Error/Success Messages */}
        {formError && (
          <div className="bg-red-100 text-red-900 p-4 rounded mb-4 font-bold">
            {formError}
          </div>
        )}
        {success && (
          <div className="bg-green-100 text-green-900 p-4 rounded mb-4 font-bold">
            {typeof success === 'string' ? success : 'Operation successful'}
          </div>
        )}

        {/* Create Purchase Form */}
        {showForm && (
          <div className="bg-white shadow rounded-lg p-4 md:p-6 mb-6">
            <h2 className="text-xl md:text-2xl font-bold mb-4 text-black">
              Record New Purchase
            </h2>

            <form onSubmit={handleCreatePurchase} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-black mb-1">
                    Vendor *
                  </label>
                  <select
                    value={formData.vendor_id}
                    onChange={(e) => setFormData({ ...formData, vendor_id: parseInt(e.target.value) })}
                    className="border p-2 rounded w-full text-black font-bold"
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
                  <label className="block text-sm font-bold text-black mb-1">
                    Inventory Item *
                  </label>
                  <select
                    value={formData.inventory_item_id}
                    onChange={(e) => setFormData({ ...formData, inventory_item_id: parseInt(e.target.value) })}
                    className="border p-2 rounded w-full text-black font-bold"
                    required
                  >
                    <option value={0}>Select Item</option>
                    {inventory.map((item: InventoryItem) => (
                      <option key={item.id} value={item.id}>
                        {item.item_name} ({item.unit}) - Stock: {item.current_stock.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-black mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                    className="border p-2 rounded w-full text-black font-bold"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-1">
                    Rate (per unit) *
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })}
                    className="border p-2 rounded w-full text-black font-bold"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div className="bg-gray-100 p-3 rounded">
                <p className="text-sm text-gray-600">
                  Total Amount: <span className="font-bold text-black">Rs. {calculateTotal()}</span>
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 disabled:opacity-50"
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
                  className="bg-gray-400 text-white px-4 py-2 rounded font-bold hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Purchase Records Table */}
        <div className="bg-white shadow rounded-lg p-4 md:p-6">
          <h2 className="text-xl font-bold mb-4 text-black">All Purchases</h2>

          {!mounted || purchasesLoading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-gray-600">Loading purchase records...</p>
            </div>
          ) : purchases.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p>No purchase records found.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-black">Vendor</th>
                      <th className="text-left py-3 px-4 font-semibold text-black">Item</th>
                      <th className="text-left py-3 px-4 font-semibold text-black">Quantity</th>
                      <th className="text-left py-3 px-4 font-semibold text-black">Rate</th>
                      <th className="text-left py-3 px-4 font-semibold text-black">Total Amount</th>
                      <th className="text-left py-3 px-4 font-semibold text-black">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map((record: PurchaseRecord) => (
                      <tr key={record.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-4 text-black font-bold">{record.vendor_name}</td>
                        <td className="py-3 px-4 text-gray-600">{record.item_name}</td>
                        <td className="py-3 px-4 text-gray-600">{record.quantity.toFixed(2)}</td>
                        <td className="py-3 px-4 text-gray-600">Rs. {record.rate.toFixed(2)}</td>
                        <td className="py-3 px-4 text-gray-600 font-bold">Rs. {record.total_amount.toFixed(2)}</td>
                        <td className="py-3 px-4 text-gray-600 text-sm">
                          {new Date(record.date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4">
                {purchases.map((record: PurchaseRecord) => (
                  <div key={record.id} className="bg-white border-l-4 border-indigo-600 rounded-lg p-4">
                    <div className="mb-3">
                      <h3 className="text-lg font-bold text-black">{record.vendor_name}</h3>
                      <p className="text-sm text-gray-600">{record.item_name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded">
                      <div>
                        <p className="text-xs text-gray-700 font-bold">Quantity</p>
                        <p className="text-black font-bold">{record.quantity.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-700 font-bold">Rate</p>
                        <p className="text-black font-bold">Rs. {record.rate.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-700 font-bold">Total Amount</p>
                        <p className="text-black font-bold">Rs. {record.total_amount.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-700 font-bold">Date</p>
                        <p className="text-black font-bold text-sm">{new Date(record.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
