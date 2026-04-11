'use client'

/**
 * Admin Inventory Management Page
 * View stock levels, add new stock, and manage inventory items.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { isAuthenticated, getCurrentUser } from '@/services/authService'
import axios from '@/lib/axios'
import { swrFetcher, swrConfig } from '@/lib/swr'
import type { User } from '@/types/User'

interface InventoryItem {
  id: number
  item_name: string
  current_stock: number
  unit: string
  average_price: number
  created_at: string
  updated_at: string
}

interface InventoryFormData {
  item_name: string
  unit: string
  current_stock: number
  average_price: number
}

export default function AdminInventoryPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [mounted, setMounted] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')

  const { data: inventory = [], error: inventoryError, isLoading: inventoryLoading, mutate: mutateInventory } = useSWR(
    isAuthenticated() && getCurrentUser()?.role === 'ADMIN' ? '/inventory' : null,
    swrFetcher,
    swrConfig
  )

  const [formData, setFormData] = useState<InventoryFormData>({
    item_name: '',
    unit: '',
    current_stock: 0,
    average_price: 0,
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

  const handleCreateInventory = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setSuccess('')
    setSubmitting(true)

    try {
      if (!formData.item_name.trim()) {
        throw new Error('Item name is required')
      }
      if (!formData.unit.trim()) {
        throw new Error('Unit is required')
      }

      const formDataToSend = new FormData()
      formDataToSend.append('item_name', formData.item_name)
      formDataToSend.append('unit', formData.unit)
      formDataToSend.append('current_stock', formData.current_stock.toString())
      formDataToSend.append('average_price', formData.average_price.toString())

      const response = await axios.post('/inventory', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setSuccess('Inventory item created successfully!')
      setFormData({ item_name: '', unit: '', current_stock: 0, average_price: 0 })
      setShowForm(false)
      mutateInventory()
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to create inventory item'
      setFormError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage))
    } finally {
      setSubmitting(false)
    }
  }

  // Check if stock is low (threshold: 5 units)
  const isLowStock = (stock: number): boolean => {
    return stock < 5
  }

  // Get low stock items
  const lowStockItems = inventory.filter((item: InventoryItem) => isLowStock(item.current_stock))

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
            {showForm ? 'Close' : '+ Add Inventory Item'}
          </button>
        </div>

        <h1 className="text-3xl font-bold mb-6 text-black">Inventory Management</h1>

        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-bold text-red-800">Low Stock Alert</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p className="font-bold mb-2">{lowStockItems.length} item(s) have low stock (less than 5 units):</p>
                  <ul className="list-disc list-inside space-y-1">
                    {lowStockItems.map((item: InventoryItem) => (
                      <li key={item.id}>
                        <strong>{item.item_name}</strong> - Current: {item.current_stock.toFixed(2)} {item.unit}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error/Success Messages */}
        {formError && (
          <div className="bg-red-100 text-red-900 p-4 rounded mb-4 font-bold">
            {formError}
          </div>
        )}
        {success && (
          <div className="bg-green-100 text-green-900 p-4 rounded mb-4 font-bold">
            {success}
          </div>
        )}

        {/* Create Form */}
        {showForm && (
          <div className="bg-white shadow rounded-lg p-4 md:p-6 mb-6">
            <h2 className="text-xl md:text-2xl font-bold mb-4 text-black">
              Add New Inventory Item
            </h2>

            <form onSubmit={handleCreateInventory} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-black mb-1">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Chicken Breast"
                    value={formData.item_name}
                    onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                    className="border p-2 rounded w-full text-black font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-1">
                    Unit *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., kg, ltr, pieces"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="border p-2 rounded w-full text-black font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-black mb-1">
                    Initial Stock
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={formData.current_stock}
                    onChange={(e) => setFormData({ ...formData, current_stock: parseFloat(e.target.value) || 0 })}
                    className="border p-2 rounded w-full text-black font-bold"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-1">
                    Average Price
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={formData.average_price}
                    onChange={(e) => setFormData({ ...formData, average_price: parseFloat(e.target.value) || 0 })}
                    className="border p-2 rounded w-full text-black font-bold"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Item'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setFormData({ item_name: '', unit: '', current_stock: 0, average_price: 0 })
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

        {/* Inventory Table */}
        <div className="bg-white shadow rounded-lg p-4 md:p-6">
          <h2 className="text-xl font-bold mb-4 text-black">Current Inventory</h2>

          {!mounted || inventoryLoading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-gray-600">Loading inventory...</p>
            </div>
          ) : inventory.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p>No inventory items found. Click "Add Inventory Item" to add one.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-black">Item Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-black">Current Stock</th>
                    <th className="text-left py-3 px-4 font-semibold text-black">Unit</th>
                    <th className="text-left py-3 px-4 font-semibold text-black">Avg Price</th>
                    <th className="text-left py-3 px-4 font-semibold text-black">Total Value</th>
                    <th className="text-left py-3 px-4 font-semibold text-black">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item: InventoryItem) => (
                    <tr key={item.id} className={`border-b border-gray-200 hover:bg-gray-50 ${isLowStock(item.current_stock) ? 'bg-red-50' : ''}`}>
                      <td className="py-3 px-4 text-black font-bold">
                        <div className="flex items-center gap-2">
                          {item.item_name}
                          {isLowStock(item.current_stock) && (
                            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded font-bold">⚠️ LOW</span>
                          )}
                        </div>
                      </td>
                      <td className={`py-3 px-4 font-bold ${isLowStock(item.current_stock) ? 'text-red-600' : 'text-gray-600'}`}>
                        {item.current_stock.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{item.unit}</td>
                      <td className="py-3 px-4 text-gray-600">Rs. {item.average_price.toFixed(2)}</td>
                      <td className="py-3 px-4 text-gray-600 font-bold">
                        Rs. {(item.current_stock * item.average_price).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-sm">
                        {new Date(item.updated_at).toLocaleDateString()}
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
  )
}
