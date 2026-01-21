'use client'

/**
 * Admin Orders Management Page - COMPLETE CRUD
 * Full order management with create, view, update, cancel, filters, and statistics.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated, getCurrentUser } from '@/services/authService'
import { fetchItems } from '@/services/itemsService'
import type { Item } from '@/types/Item'
import type { User } from '@/types/User'
import axios from '@/lib/axios'
import { formatCurrency } from '@/lib/currency'


interface OrderItem {
  itemId: number
  quantity: number
}

interface Order {
  id: number
  customer_name: string
  customer_email: string
  customer_phone: string
  items: any[]
  total_amount: string
  advance_payment: string
  balance: string
  delivery_date: string | null
  notes: string | null
  status: string
  created_at: string
}

interface OrderFormData {
  customerName: string
  customerEmail: string
  customerPhone: string
  selectedItems: OrderItem[]
  advancePayment: string
  deliveryDate: string
  notes: string
}


export default function AdminOrdersPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')

  // UI state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  // Filter state
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'partial' | 'paid' | 'cancelled'>('all')

  // Form state
  const [formData, setFormData] = useState<OrderFormData>({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    selectedItems: [],
    advancePayment: '',
    deliveryDate: '',
    notes: ''
  })

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }

    const user = getCurrentUser()
    setCurrentUser(user)
    loadData(user)
  }, [router])

  useEffect(() => {
    applyFilters()
  }, [orders, dateFilter, statusFilter])

  const loadData = async (user: User | null) => {
    try {
      const itemsData = await fetchItems()
      setItems(itemsData)

      // Only ADMIN can view all orders
      if (user?.role === 'ADMIN') {
        const ordersData = await axios.get<Order[]>('/orders/')
        setOrders(ordersData.data)
      }
    } catch (err: any) {
      console.error('Failed to load data:', err)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...orders]

    // Date filter
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    if (dateFilter === 'today') {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.created_at)
        return orderDate >= today
      })
    } else if (dateFilter === 'week') {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.created_at)
        return orderDate >= weekAgo
      })
    } else if (dateFilter === 'month') {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.created_at)
        return orderDate >= monthAgo
      })
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter)
    }

    setFilteredOrders(filtered)
  }

  const handleAddItem = () => {
    if (items.length > 0) {
      setFormData(prev => ({
        ...prev,
        selectedItems: [...prev.selectedItems, { itemId: items[0].id, quantity: 1 }]
      }))
    }
  }

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      selectedItems: prev.selectedItems.filter((_, i) => i !== index)
    }))
  }

  const handleItemChange = (index: number, field: 'itemId' | 'quantity', value: number) => {
    setFormData(prev => ({
      ...prev,
      selectedItems: prev.selectedItems.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  const calculateTotal = () => {
    return formData.selectedItems.reduce((total, orderItem) => {
      const item = items.find(i => i.id === orderItem.itemId)
      if (item) {
        return total + (parseFloat(item.price_per_kg) * orderItem.quantity)
      }
      return total
    }, 0)
  }

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    try {
      // Validate
      if (formData.selectedItems.length === 0) {
        throw new Error('Please select at least one item')
      }

      if (!formData.customerName || !formData.customerEmail || !formData.customerPhone) {
        throw new Error('Please fill in all customer details')
      }

      const totalAmount = calculateTotal()
      const advanceAmount = parseFloat(formData.advancePayment) || 0

      if (advanceAmount < 0 || advanceAmount > totalAmount) {
        throw new Error('Invalid advance payment amount')
      }

      // Prepare order data
      const orderData = {
        customer_name: formData.customerName,
        customer_email: formData.customerEmail,
        customer_phone: formData.customerPhone,
        items: formData.selectedItems.map(orderItem => {
          const item = items.find(i => i.id === orderItem.itemId)
          return {
            item_id: orderItem.itemId,
            item_name: item?.name || '',
            quantity_kg: orderItem.quantity,
            price_per_kg: parseFloat(item?.price_per_kg || '0')
          }
        }),
        total_amount: totalAmount,
        advance_payment: advanceAmount,
        delivery_date: formData.deliveryDate || null,
        notes: formData.notes || null
      }

      // Submit order
      await axios.post('/orders/', orderData)

      setSuccess('Order created successfully!')

      // Reset form
      setFormData({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        selectedItems: [],
        advancePayment: '',
        deliveryDate: '',
        notes: ''
      })

      setShowCreateForm(false)

      // Reload orders
      await loadData()

    } catch (err: any) {
      const errorMessage = err.message || err.response?.data?.detail || 'Failed to create order'
      setError(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const openEditModal = (order: Order) => {
    setSelectedOrder(order)

    // Pre-fill form with order data
    setFormData({
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      customerPhone: order.customer_phone,
      selectedItems: order.items.map(item => ({
        itemId: item.item_id,
        quantity: item.quantity_kg
      })),
      advancePayment: order.advance_payment,
      deliveryDate: order.delivery_date || '',
      notes: order.notes || ''
    })

    setShowEditModal(true)
  }

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOrder) return

    setError('')
    setSuccess('')
    setSubmitting(true)

    try {
      const totalAmount = calculateTotal()
      const advanceAmount = parseFloat(formData.advancePayment) || 0

      if (advanceAmount < 0 || advanceAmount > totalAmount) {
        throw new Error('Invalid advance payment amount')
      }

      // Prepare update data
      const updateData = {
        customer_name: formData.customerName,
        customer_email: formData.customerEmail,
        customer_phone: formData.customerPhone,
        items: formData.selectedItems.map(orderItem => {
          const item = items.find(i => i.id === orderItem.itemId)
          return {
            item_id: orderItem.itemId,
            item_name: item?.name || '',
            quantity_kg: orderItem.quantity,
            price_per_kg: parseFloat(item?.price_per_kg || '0')
          }
        }),
        total_amount: totalAmount,
        advance_payment: advanceAmount,
        delivery_date: formData.deliveryDate || null,
        notes: formData.notes || null
      }

      // Update order
      await axios.patch(`/orders/${selectedOrder.id}`, updateData)

      setSuccess('Order updated successfully!')
      setShowEditModal(false)
      setSelectedOrder(null)

      // Reload orders
      await loadData()

    } catch (err: any) {
      const errorMessage = err.message || err.response?.data?.detail || 'Failed to update order'
      setError(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelOrder = async (orderId: number) => {
    if (!confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
      return
    }

    setError('')
    setSuccess('')

    try {
      await axios.delete(`/orders/${orderId}`)
      setSuccess('Order cancelled successfully!')
      await loadData()
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to cancel order'
      setError(errorMessage)
    }
  }

  const openDetailsModal = (order: Order) => {
    setSelectedOrder(order)
    setShowDetailsModal(true)
  }

  const downloadInvoice = async (orderId: number) => {
    try {
      const response = await axios.get(`/orders/${orderId}/invoice`, {
        responseType: 'blob'
      })

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `invoice_${orderId}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
      window.URL.revokeObjectURL(url)

      setSuccess('Invoice downloaded successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to download invoice')
      setTimeout(() => setError(''), 5000)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { bg: 'bg-red-100', text: 'text-red-800', label: 'Pending' },
      partial: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Partial' },
      paid: { bg: 'bg-green-100', text: 'text-green-800', label: 'Paid' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Cancelled' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  const getRowClassName = (order: Order) => {
    const baseClass = 'hover:bg-gray-50 transition-colors'
    if (order.status === 'cancelled') {
      return `${baseClass} opacity-60`
    }
    if (parseFloat(order.balance) > 0) {
      return `${baseClass} bg-red-50`
    }
    return baseClass
  }

  const calculateTotalPending = () => {
    return filteredOrders
      .filter(order => order.status !== 'cancelled')
      .reduce((sum, order) => sum + parseFloat(order.balance), 0)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
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
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
          >
            {showCreateForm ? 'Hide Form' : '+ Create New Order'}
          </button>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-6">Orders Management</h1>

        {/* Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {/* Create Form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Order</h2>
            <form onSubmit={handleCreateOrder} className="space-y-6">
              {/* Customer Details */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Customer Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.customerEmail}
                      onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                    <input
                      type="tel"
                      required
                      value={formData.customerPhone}
                      onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium text-gray-900">Order Items</h3>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-sm bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded-md"
                  >
                    + Add Item
                  </button>
                </div>

                {formData.selectedItems.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No items selected</p>
                ) : (
                  <div className="space-y-3">
                    {formData.selectedItems.map((orderItem, index) => {
                      const item = items.find(i => i.id === orderItem.itemId)
                      const itemTotal = item ? parseFloat(item.price_per_kg) * orderItem.quantity : 0

                      return (
                        <div key={index} className="flex items-center gap-4 p-4 border border-gray-200 rounded-md">
                          <div className="flex-1">
                            <select
                              value={orderItem.itemId}
                              onChange={(e) => handleItemChange(index, 'itemId', parseInt(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            >
                              {items.map(item => (
                                <option key={item.id} value={item.id}>
                                  {item.name} - {formatCurrency(item.price_per_kg)}/kg
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="w-32">
                            <input
                              type="number"
                              min="0.5"
                              step="0.5"
                              value={orderItem.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="Qty (kg)"
                            />
                          </div>
                          <div className="w-32">
                            <p className="text-lg font-semibold text-gray-900">{formatCurrency(itemTotal)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Payment Details */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Payment Details</h3>
                <div className="bg-gray-50 p-4 rounded-md space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Total Amount:</span>
                    <span className="text-xl font-bold text-gray-900">{formatCurrency(calculateTotal())}</span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Advance Payment</label>
                    <input
                      type="number"
                      min="0"
                      max={calculateTotal()}
                      step="0.01"
                      value={formData.advancePayment}
                      onChange={(e) => setFormData({ ...formData, advancePayment: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Balance:</span>
                    <span className="text-lg font-semibold text-indigo-600">
                      {formatCurrency(calculateTotal() - (parseFloat(formData.advancePayment) || 0))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Date</label>
                  <input
                    type="date"
                    value={formData.deliveryDate}
                    onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Additional notes..."
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || formData.selectedItems.length === 0}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Creating...' : 'Create Order'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Staff User Notice */}
        {currentUser?.role === 'STAFF' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Staff Member Access
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    As a staff member, you can create new orders using the form above. To view order history and manage payments, please contact an administrator.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters & Statistics - ADMIN Only */}
        {currentUser?.role === 'ADMIN' && (
        <>
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            {/* Date Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setDateFilter('all')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  dateFilter === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All Time
              </button>
              <button
                onClick={() => setDateFilter('today')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  dateFilter === 'today'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setDateFilter('week')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  dateFilter === 'week'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                This Week
              </button>
              <button
                onClick={() => setDateFilter('month')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  dateFilter === 'month'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                This Month
              </button>
            </div>

            {/* Status Filter */}
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Total Pending Badge */}
            <div className="bg-red-100 border border-red-300 rounded-lg px-4 py-2">
              <p className="text-sm text-red-600 font-medium">Total Pending to Collect</p>
              <p className="text-2xl font-bold text-red-700">{formatCurrency(calculateTotalPending())}</p>
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Orders ({filteredOrders.length})
          </h2>

          {filteredOrders.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No orders found matching the filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Advance</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pending</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className={getRowClassName(order)}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{order.id}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{order.customer_name}</div>
                        <div className="text-sm text-gray-500">{order.customer_phone}</div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {order.items.length} item(s)
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {formatCurrency(order.total_amount)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(order.advance_payment)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                        {formatCurrency(order.balance)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openDetailsModal(order)}
                            className="text-indigo-600 hover:text-indigo-700 font-medium"
                            title="View Details"
                          >
                            View
                          </button>
                          <button
                            onClick={() => downloadInvoice(order.id)}
                            className="text-green-600 hover:text-green-700 font-medium"
                            title="Download Invoice PDF"
                          >
                            PDF
                          </button>
                          {order.status !== 'cancelled' && (
                            <>
                              <button
                                onClick={() => openEditModal(order)}
                                className="text-blue-600 hover:text-blue-700 font-medium"
                                title="Edit Order"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleCancelOrder(order.id)}
                                className="text-red-600 hover:text-red-700 font-medium"
                                title="Cancel Order"
                              >
                                Cancel
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
        </>
        )}
      </div>

      {/* Edit Modal - ADMIN Only */}
      {currentUser?.role === 'ADMIN' && showEditModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-900">Edit Order #{selectedOrder.id}</h2>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setSelectedOrder(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpdateOrder} className="space-y-6">
              {/* Customer Details */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Customer Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.customerEmail}
                      onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                    <input
                      type="tel"
                      required
                      value={formData.customerPhone}
                      onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium text-gray-900">Order Items</h3>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-sm bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded-md"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.selectedItems.map((orderItem, index) => {
                    const item = items.find(i => i.id === orderItem.itemId)
                    const itemTotal = item ? parseFloat(item.price_per_kg) * orderItem.quantity : 0

                    return (
                      <div key={index} className="flex items-center gap-4 p-4 border border-gray-200 rounded-md">
                        <div className="flex-1">
                          <select
                            value={orderItem.itemId}
                            onChange={(e) => handleItemChange(index, 'itemId', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            {items.map(item => (
                              <option key={item.id} value={item.id}>
                                {item.name} - {formatCurrency(item.price_per_kg)}/kg
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="w-32">
                          <input
                            type="number"
                            min="0.5"
                            step="0.5"
                            value={orderItem.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Qty (kg)"
                          />
                        </div>
                        <div className="w-32">
                          <p className="text-lg font-semibold text-gray-900">{formatCurrency(itemTotal)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Payment Details */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Payment Details</h3>
                <div className="bg-gray-50 p-4 rounded-md space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Total Amount:</span>
                    <span className="text-xl font-bold text-gray-900">{formatCurrency(calculateTotal())}</span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Advance Payment</label>
                    <input
                      type="number"
                      min="0"
                      max={calculateTotal()}
                      step="0.01"
                      value={formData.advancePayment}
                      onChange={(e) => setFormData({ ...formData, advancePayment: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Balance:</span>
                    <span className="text-lg font-semibold text-indigo-600">
                      {formatCurrency(calculateTotal() - (parseFloat(formData.advancePayment) || 0))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Date</label>
                  <input
                    type="date"
                    value={formData.deliveryDate}
                    onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Additional notes..."
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedOrder(null)
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Updating...' : 'Update Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal - ADMIN Only */}
      {currentUser?.role === 'ADMIN' && showDetailsModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">Order Details #{selectedOrder.id}</h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false)
                  setSelectedOrder(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Status */}
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Status</h3>
                {getStatusBadge(selectedOrder.status)}
              </div>

              {/* Customer Details */}
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Customer Information</h3>
                <div className="bg-gray-50 p-4 rounded-md space-y-2">
                  <p><span className="font-medium">Name:</span> {selectedOrder.customer_name}</p>
                  <p><span className="font-medium">Email:</span> {selectedOrder.customer_email}</p>
                  <p><span className="font-medium">Phone:</span> {selectedOrder.customer_phone}</p>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Order Items</h3>
                <div className="bg-gray-50 p-4 rounded-md space-y-3">
                  {selectedOrder.items.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                      <div>
                        <p className="font-medium">{item.item_name}</p>
                        <p className="text-sm text-gray-600">
                          {item.quantity_kg} kg × {formatCurrency(item.price_per_kg)}/kg
                        </p>
                      </div>
                      <p className="font-semibold">{formatCurrency(item.subtotal)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Details */}
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Payment Details</h3>
                <div className="bg-gray-50 p-4 rounded-md space-y-2">
                  <div className="flex justify-between">
                    <span>Total Amount:</span>
                    <span className="font-semibold">{formatCurrency(selectedOrder.total_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Advance Paid:</span>
                    <span className="font-semibold text-green-600">{formatCurrency(selectedOrder.advance_payment)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-300 pt-2">
                    <span className="font-medium">Pending Balance:</span>
                    <span className="font-bold text-red-600">{formatCurrency(selectedOrder.balance)}</span>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              {(selectedOrder.delivery_date || selectedOrder.notes) && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Additional Information</h3>
                  <div className="bg-gray-50 p-4 rounded-md space-y-2">
                    {selectedOrder.delivery_date && (
                      <p><span className="font-medium">Delivery Date:</span> {selectedOrder.delivery_date}</p>
                    )}
                    {selectedOrder.notes && (
                      <p><span className="font-medium">Notes:</span> {selectedOrder.notes}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Order Metadata */}
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Order Information</h3>
                <div className="bg-gray-50 p-4 rounded-md space-y-2">
                  <p><span className="font-medium">Order Date:</span> {new Date(selectedOrder.created_at).toLocaleString()}</p>
                  <p><span className="font-medium">Order ID:</span> #{selectedOrder.id}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => downloadInvoice(selectedOrder.id)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Invoice PDF
              </button>
              <button
                onClick={() => {
                  setShowDetailsModal(false)
                  setSelectedOrder(null)
                }}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
