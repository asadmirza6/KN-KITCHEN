'use client'

/**
 * Admin Items Management Page
 * Manage menu items with Cloudinary image upload
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { isAuthenticated, getCurrentUser } from '@/services/authService'
import axios from '@/lib/axios'
import { formatCurrency } from '@/lib/currency'
import { swrFetcher, swrConfig } from '@/lib/swr'
import Toast from '@/components/Toast'

interface Item {
  id: number
  name: string
  description?: string | null
  unit_type: string
  price_per_kg: string
  image_url: string | null
  cloudinary_public_id: string | null
  is_active?: boolean
  created_at: string
}

export default function AdminItemsPage() {
  const router = useRouter()
  const [hasMounted, setHasMounted] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success' | 'error', isVisible: false })

  // SWR hook for items data - use admin endpoint to get ALL items (active and inactive)
  const { data: items = [] as Item[], error: itemsError, isLoading: itemsLoading, mutate: mutateItems } = useSWR(
    isAuthenticated() ? '/items/admin/all' : null,
    swrFetcher,
    swrConfig
  )

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price_per_kg: '',
    unit_type: 'per_kg',
    is_active: true
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type, isVisible: true });
  };

  useEffect(() => {
    setHasMounted(true)
  }, [])

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }
    setCurrentUser(getCurrentUser())
  }, [router])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.price_per_kg) {
      return
    }

    setSubmitting(true)

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('name', formData.name)
      formDataToSend.append('description', formData.description)
      formDataToSend.append('price_per_kg', formData.price_per_kg)
      formDataToSend.append('unit_type', formData.unit_type)
      formDataToSend.append('is_active', String(formData.is_active))

      if (imageFile) {
        formDataToSend.append('image', imageFile)
      }

      if (editingItem) {
        await axios.put(`/items/${editingItem.id}`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      } else {
        await axios.post('/items/', formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      }

      // Reset form
      setFormData({ name: '', description: '', price_per_kg: '', unit_type: 'per_kg', is_active: true })
      setImageFile(null)
      setImagePreview(null)
      setShowForm(false)
      setEditingItem(null)

      // Revalidate items cache
      mutateItems()

      // Show success message
      showToast(editingItem ? 'Item updated successfully!' : 'Item created successfully!', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to save item', 'error');
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (item: Item) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      description: item.description ?? '',
      price_per_kg: item.price_per_kg,
      unit_type: item.unit_type || 'per_kg',
      is_active: item.is_active !== undefined ? item.is_active : true
    })
    setImagePreview(item.image_url)
    setShowForm(true)
  }

  const handleDelete = async (item: Item) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) {
      return
    }

    try {
      await axios.delete(`/items/${item.id}`)
      // Revalidate items cache
      mutateItems()
      showToast('Item deleted successfully!', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to delete item', 'error');
    }
  }

  const handleCancelForm = () => {
    setShowForm(false)
    setEditingItem(null)
    setFormData({ name: '', description: '', price_per_kg: '', unit_type: 'per_kg', is_active: true })
    setImageFile(null)
    setImagePreview(null)
  }

  if (!hasMounted) {
    return (
      <div className="p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent py-8">
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

          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Item
          </button>
        </div>

        {/* Error Message with Cold Start Handling */}
        {itemsError && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p className="font-semibold">⚠️ Connection Issue</p>
            <p className="text-sm mt-1">
              {itemsError?.response?.status === 503
                ? 'Backend is starting up. Please wait a moment and refresh the page.'
                : itemsError?.message || 'Failed to load items. Please try again.'}
            </p>
          </div>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingItem ? 'Edit Item' : 'Add New Item'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., Chicken Biryani"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., Fragrant basmati rice cooked with tender chicken"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Type *
                </label>
                <select
                  value={formData.unit_type}
                  onChange={(e) => setFormData({ ...formData, unit_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                >
                  <option value="per_kg">per KG</option>
                  <option value="per_piece">per Piece</option>
                  <option value="per_liter">per Liter</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price {formData.unit_type === 'per_kg' ? 'per Kg' : formData.unit_type === 'per_piece' ? 'per Piece' : 'per Liter'} (Rs) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price_per_kg}
                  onChange={(e) => setFormData({ ...formData, price_per_kg: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., 250.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Image (Optional)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleImageChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                {imagePreview && (
                  <div className="mt-2">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Show on Home Page Menu
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Saving...' : editingItem ? 'Update Item' : 'Add Item'}
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

        {/* Items List */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Menu Items</h2>
          </div>

          {!hasMounted || itemsLoading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-gray-600">Loading items...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No items found. Click "Add New Item" to create one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Image
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
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
                  {items.map((item: Item) => (
                    <tr key={item.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedItem(item)}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {item.unit_type === 'per_kg' ? 'per KG' : item.unit_type === 'per_piece' ? 'per Piece' : 'per Liter'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatCurrency(item.price_per_kg)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          item.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {item.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(item.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          Edit
                        </button>
                        {currentUser?.role === 'ADMIN' && (
                          <button
                            onClick={() => handleDelete(item)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Side Drawer Overlay */}
        {selectedItem && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setSelectedItem(null)}
          />
        )}

        {/* Side Drawer */}
        <div
          className={`fixed top-0 left-0 h-full w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
            selectedItem ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {selectedItem && (
            <div className="h-full flex flex-col overflow-y-auto">
              {/* Header with Close Button */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Item Details</h2>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 px-6 py-6 space-y-6">
                {/* Product Image */}
                <div className="w-full">
                  {selectedItem.image_url ? (
                    <img
                      src={selectedItem.image_url}
                      alt={selectedItem.name}
                      className="w-full h-64 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                      <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Item Name */}
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedItem.name}</h3>
                </div>

                {/* Category/Unit Type */}
                <div>
                  <p className="text-sm text-slate-600 mb-2">Unit Type</p>
                  <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {selectedItem.unit_type === 'per_kg' ? 'per KG' : selectedItem.unit_type === 'per_piece' ? 'per Piece' : 'per Liter'}
                  </span>
                </div>

                {/* Price */}
                <div>
                  <p className="text-sm text-slate-600 mb-2">Price</p>
                  <p className="text-3xl font-bold text-indigo-600">{formatCurrency(selectedItem.price_per_kg)}</p>
                </div>

                {/* Created Date */}
                <div>
                  <p className="text-sm text-slate-600 mb-2">Created</p>
                  <p className="text-slate-700">{new Date(selectedItem.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>

                {/* Description Section */}
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-slate-600 mb-2">Details</p>
                  <p className="text-slate-700 leading-relaxed">
                    This is a premium menu item available for catering orders. The price shown is per {selectedItem.unit_type === 'per_kg' ? 'kilogram' : selectedItem.unit_type === 'per_piece' ? 'piece' : 'liter'}.
                  </p>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 space-y-3">
                <button
                  onClick={() => {
                    handleEdit(selectedItem)
                    setSelectedItem(null)
                  }}
                  className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  Edit Item
                </button>
                {currentUser?.role === 'ADMIN' && (
                  <button
                    onClick={() => {
                      handleDelete(selectedItem)
                      setSelectedItem(null)
                    }}
                    className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    Delete Item
                  </button>
                )}
                <button
                  onClick={() => setSelectedItem(null)}
                  className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
