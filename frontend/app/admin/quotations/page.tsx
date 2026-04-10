'use client'

/**
 * Admin Quotations Management Page
 * Create, manage, and approve quotations with PDF generation
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { isAuthenticated } from '@/services/authService'
import axios from '@/lib/axios'
import { formatCurrency } from '@/lib/currency'
import { swrFetcher, swrConfig } from '@/lib/swr'
import {
  createQuotation,
  getQuotations,
  deleteQuotation,
  approveQuotation,
  downloadQuotationEstimate,
  updateQuotation
} from '@/services/quotationService'
import type { Quotation } from '@/types/Quotation'
import type { Item } from '@/types/Item'

interface ManualItem {
  name: string
  quantity_kg: number
  price_per_kg: number
}

interface QuotationFormData {
  customerName: string
  customerEmail: string
  customerPhone: string
  customerAddress: string
  selectedItems: Array<{ itemId: number; quantity: number }>
  manualItems: ManualItem[]
  deliveryDate: string
  validUntil: string
  notes: string
  discount: number
}

export default function AdminQuotationsPage() {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showItemModal, setShowItemModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  // SWR hooks for data fetching
  const { data: quotations = [], error: quotationsError, isLoading: quotationsLoading, mutate: mutateQuotations } = useSWR(
    isAuthenticated() ? '/quotations/' : null,
    swrFetcher,
    swrConfig
  )

  const { data: items = [], error: itemsError, isLoading: itemsLoading } = useSWR(
    isAuthenticated() ? '/items/' : null,
    swrFetcher,
    swrConfig
  )

  const [formData, setFormData] = useState<QuotationFormData>({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
    selectedItems: [],
    manualItems: [],
    deliveryDate: '',
    validUntil: '',
    notes: '',
    discount: 0
  })

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login')
    }
  }, [router])

  const calculateTotal = () => {
    const menuTotal = formData.selectedItems.reduce((total, item) => {
      const menuItem = items.find(i => i.id === item.itemId)
      return menuItem ? total + (parseFloat(menuItem.price_per_kg) * item.quantity) : total
    }, 0)

    const manualTotal = formData.manualItems.reduce((total, item) =>
      total + (item.price_per_kg * item.quantity_kg), 0)

    const subtotal = menuTotal + manualTotal
    const discountAmount = Math.max(0, formData.discount)
    return Math.max(0, subtotal - discountAmount)
  }

  const handleAddItemFromModal = (item: Item) => {
    setFormData({
      ...formData,
      selectedItems: [...formData.selectedItems, { itemId: item.id, quantity: 1 }]
    })
    setShowItemModal(false)
  }

  const handleRemoveItem = (index: number) => {
    setFormData({
      ...formData,
      selectedItems: formData.selectedItems.filter((_, i) => i !== index)
    })
  }

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...formData.selectedItems]
    updated[index] = { ...updated[index], [field]: value }
    setFormData({ ...formData, selectedItems: updated })
  }

  const handleAddManualItem = () => {
    setFormData({
      ...formData,
      manualItems: [...formData.manualItems, { name: '', quantity_kg: 1, price_per_kg: 0 }]
    })
  }

  const handleRemoveManualItem = (index: number) => {
    setFormData({
      ...formData,
      manualItems: formData.manualItems.filter((_, i) => i !== index)
    })
  }

  const handleManualItemChange = (index: number, field: string, value: any) => {
    const updated = [...formData.manualItems]
    const sanitizedValue = field !== 'name' && isNaN(value) ? 0 : value
    updated[index] = { ...updated[index], [field]: sanitizedValue }
    setFormData({ ...formData, manualItems: updated })
  }

  const handleEditQuotation = (quotation: Quotation) => {
    if (quotation.status !== 'pending') {
      setError('Only pending quotations can be edited')
      return
    }

    setEditingId(quotation.id)
    setFormData({
      customerName: quotation.customer_name,
      customerEmail: quotation.customer_email,
      customerPhone: quotation.customer_phone,
      customerAddress: quotation.customer_address,
      selectedItems: quotation.items.map(item => ({
        itemId: item.item_id,
        quantity: item.quantity_kg
      })),
      manualItems: quotation.manual_items,
      deliveryDate: quotation.delivery_date || '',
      validUntil: quotation.valid_until || '',
      notes: quotation.notes || '',
      discount: parseFloat(quotation.discount) || 0
    })
    setShowForm(true)
  }

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.customerName || !formData.customerEmail || !formData.customerPhone || !formData.customerAddress) {
      return
    }

    if (formData.selectedItems.length === 0 && formData.manualItems.length === 0) {
      return
    }

    setSubmitting(true)

    try {
      const total = calculateTotal()

      const payload = {
        customer_name: formData.customerName,
        customer_email: formData.customerEmail,
        customer_phone: formData.customerPhone,
        customer_address: formData.customerAddress,
        items: formData.selectedItems.map(item => {
          const menuItem = items.find(i => i.id === item.itemId)!
          return {
            item_id: item.itemId,
            item_name: menuItem.name,
            quantity_kg: item.quantity,
            price_per_kg: parseFloat(menuItem.price_per_kg)
          }
        }),
        manual_items: formData.manualItems,
        total_amount: total,
        advance_payment: 0,
        delivery_date: formData.deliveryDate || undefined,
        valid_until: formData.validUntil || undefined,
        notes: formData.notes || undefined,
        discount: formData.discount
      }

      if (editingId) {
        // Update existing quotation
        await updateQuotation(editingId, payload)
      } else {
        // Create new quotation
        await createQuotation(payload)
      }

      setFormData({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        customerAddress: '',
        selectedItems: [],
        manualItems: [],
        deliveryDate: '',
        validUntil: '',
        notes: '',
        discount: 0
      })
      setEditingId(null)
      setShowForm(false)
      // Revalidate quotations cache
      mutateQuotations()
    } catch (err: any) {
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteQuotation = async (quotation: Quotation) => {
    if (quotation.status !== 'pending') {
      return
    }

    if (!confirm(`Are you sure you want to delete this quotation for ${quotation.customer_name}?`)) {
      return
    }

    try {
      await deleteQuotation(quotation.id)
      // Revalidate quotations cache
      mutateQuotations()
    } catch (err: any) {
    }
  }

  const handleApproveQuotation = async (quotation: Quotation) => {
    if (!confirm(`Approve quotation for ${quotation.customer_name}? This will convert it to an order.`)) {
      return
    }

    try {
      await approveQuotation(quotation.id)
      // Revalidate quotations cache
      mutateQuotations()
    } catch (err: any) {

    }
  }

  const handleDownloadPDF = async (quotation: Quotation) => {
    try {
      await downloadQuotationEstimate(quotation.id, quotation.customer_name)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to download quotation')
    }
  }

  const handleCancelForm = () => {
    setShowForm(false)
    setFormData({
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      customerAddress: '',
      selectedItems: [],
      manualItems: [],
      deliveryDate: '',
      validUntil: '',
      notes: '',
      discount: 0
    })
    setEditingId(null)
    setError(null)
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-transparent py-8">
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
            Create Quotation
          </button>
        </div>

        {/* Error Message */}
        {(quotationsError || itemsError) && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {quotationsError?.message || itemsError?.message || 'Failed to load data'}
          </div>
        )}

        {/* Create Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingId ? 'Edit Quotation' : 'Create New Quotation'}
            </h2>

            <form onSubmit={handleCreateQuotation} className="space-y-4">
              {/* Customer Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address *
                  </label>
                  <input
                    type="text"
                    value={formData.customerAddress}
                    onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Date
                  </label>
                  <input
                    type="date"
                    value={formData.deliveryDate}
                    onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valid Until
                  </label>
                  <input
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">Items</label>
                  <button
                    type="button"
                    onClick={() => setShowItemModal(true)}
                    className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                  >
                    + Search & Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.selectedItems.map((item, index) => {
                    const menuItem = items.find(i => i.id === item.itemId)
                    return (
                      <div key={index} className="flex gap-2 items-center bg-gray-50 p-3 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{menuItem?.name}</p>
                          <p className="text-sm text-gray-600">{formatCurrency(menuItem?.price_per_kg || 0)}/kg</p>
                        </div>
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={isNaN(item.quantity) ? '' : item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                          placeholder="Qty (kg)"
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                        >
                          Remove
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Manual Items */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">Manual Items</label>
                  <button
                    type="button"
                    onClick={handleAddManualItem}
                    className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                  >
                    + Add Manual Item
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.manualItems.map((item, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleManualItemChange(index, 'name', e.target.value)}
                        placeholder="Item name"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                      />

                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={isNaN(item.quantity_kg) ? '' : item.quantity_kg}
                        onChange={(e) => handleManualItemChange(index, 'quantity_kg', parseFloat(e.target.value))}
                        placeholder="Qty"
                        className="w-20 px-4 py-2 border border-gray-300 rounded-lg"
                      />

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={isNaN(item.price_per_kg) ? '' : item.price_per_kg}
                        onChange={(e) => handleManualItemChange(index, 'price_per_kg', parseFloat(e.target.value))}
                        placeholder="Price"
                        className="w-24 px-4 py-2 border border-gray-300 rounded-lg"
                      />

                      <button
                        type="button"
                        onClick={() => handleRemoveManualItem(index)}
                        className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional notes for the quotation"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              {/* Discount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount (Rs)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={isNaN(formData.discount) ? '' : formData.discount}
                  onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                  placeholder="Enter discount amount"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Subtotal Display */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-right">
                  <p className="text-gray-600">Subtotal:</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(calculateTotal())}</p>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingId ? 'Update Quotation' : 'Create Quotation'}
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

        {/* Item Selection Modal */}
        {showItemModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Select Item</h3>
              <div className="space-y-2">
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleAddItemFromModal(item)}
                    className="w-full text-left p-3 border border-gray-300 rounded-lg hover:bg-indigo-50 hover:border-indigo-500 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-600">{formatCurrency(item.price_per_kg)}/kg</p>
                      </div>
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowItemModal(false)}
                className="mt-4 w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Quotations List */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900">Quotations</h2>
            <p className="text-sm text-gray-600 mt-1">
              {quotations.length} {quotations.length === 1 ? 'quotation' : 'quotations'}
            </p>
          </div>

          {quotationsLoading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-gray-600">Loading quotations...</p>
            </div>
          ) : quotations.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p>No quotations found. Click "Create Quotation" to add one.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">ID</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Customer</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Contact</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Amount</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map((quotation) => (
                    <tr key={quotation.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-900">#{quotation.id}</td>
                      <td className="py-3 px-4 text-gray-900">{quotation.customer_name}</td>
                      <td className="py-3 px-4 text-gray-600 text-sm">{quotation.customer_phone}</td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-900">
                        {formatCurrency(quotation.total_amount)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(quotation.status)}`}>
                          {quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDownloadPDF(quotation)}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            PDF
                          </button>
                          {quotation.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleEditQuotation(quotation)}
                                className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteQuotation(quotation)}
                                className="text-red-600 hover:text-red-700 text-sm font-medium"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => handleApproveQuotation(quotation)}
                                className="text-green-600 hover:text-green-700 text-sm font-medium"
                              >
                                Approve
                              </button>
                            </>
                          )}
                        </div>
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
