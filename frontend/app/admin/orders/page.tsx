'use client'

/**
 * Admin Orders Management Page - FIXED VERSION
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
  user_id: number
  created_by_name: string
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

  // FIXED: loadData logic changed to handle optional user
  const loadData = async (userArg?: User | null) => {
    // Agar argument nahi mila to state wala user use karein
    const userToUse = userArg !== undefined ? userArg : currentUser;
    
    try {
      const itemsData = await fetchItems()
      setItems(itemsData)

      // Only ADMIN can view all orders
      if (userToUse?.role === 'ADMIN') {
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

  const applyFilters = () => {
    let filtered = [...orders]

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

      await axios.post('/orders/', orderData)
      setSuccess('Order created successfully!')

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
      await loadData() // Works now because of optional arg

    } catch (err: any) {
      const errorMessage = err.message || err.response?.data?.detail || 'Failed to create order'
      setError(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const openEditModal = (order: Order) => {
    setSelectedOrder(order)
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

      await axios.patch(`/orders/${selectedOrder.id}`, updateData)
      setSuccess('Order updated successfully!')
      setShowEditModal(false)
      setSelectedOrder(null)
      await loadData() // Works now

    } catch (err: any) {
      const errorMessage = err.message || err.response?.data?.detail || 'Failed to update order'
      setError(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelOrder = async (orderId: number) => {
    if (!confirm('Are you sure you want to cancel this order?')) return
    try {
      await axios.delete(`/orders/${orderId}`)
      setSuccess('Order cancelled successfully!')
      await loadData()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to cancel order')
    }
  }

  const openDetailsModal = (order: Order) => {
    setSelectedOrder(order)
    setShowDetailsModal(true)
  }

  const downloadInvoice = async (orderId: number) => {
    try {
      const response = await axios.get(`/orders/${orderId}/invoice`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `invoice_${orderId}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
      window.URL.revokeObjectURL(url)
      setSuccess('Invoice downloaded successfully')
    } catch (err: any) {
      setError('Failed to download invoice')
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
    if (order.status === 'cancelled') return `${baseClass} opacity-60`
    if (parseFloat(order.balance) > 0) return `${baseClass} bg-red-50`
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex justify-between items-center">
          <button onClick={() => router.push('/admin')} className="text-indigo-600 flex items-center gap-2 font-medium">
             ← Back to Dashboard
          </button>
          <button onClick={() => setShowCreateForm(!showCreateForm)} className="bg-indigo-600 text-white px-4 py-2 rounded-md font-medium">
            {showCreateForm ? 'Hide Form' : '+ Create New Order'}
          </button>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-6">Orders Management</h1>

        {error && <div className="mb-6 bg-red-50 text-red-800 border border-red-200 rounded-lg p-4">{error}</div>}
        {success && <div className="mb-6 bg-green-50 text-green-800 border border-green-200 rounded-lg p-4">{success}</div>}

        {showCreateForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Create New Order</h2>
            <form onSubmit={handleCreateOrder} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input type="text" placeholder="Customer Name" value={formData.customerName} onChange={(e) => setFormData({ ...formData, customerName: e.target.value })} className="border p-2 rounded" />
                <input type="email" placeholder="Customer Email" value={formData.customerEmail} onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })} className="border p-2 rounded" />
                <input type="tel" placeholder="Customer Phone" value={formData.customerPhone} onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })} className="border p-2 rounded" />
              </div>

              <div className="flex justify-between items-center">
                <h3 className="font-medium">Order Items</h3>
                <button type="button" onClick={handleAddItem} className="bg-gray-200 px-3 py-1 rounded">+ Add Item</button>
              </div>

              {formData.selectedItems.map((orderItem, index) => (
                <div key={index} className="flex gap-4 items-center">
                  <select value={orderItem.itemId} onChange={(e) => handleItemChange(index, 'itemId', parseInt(e.target.value))} className="flex-1 border p-2">
                    {items.map(item => <option key={item.id} value={item.id}>{item.name} - {formatCurrency(item.price_per_kg)}</option>)}
                  </select>
                  <input type="number" step="0.5" value={orderItem.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))} className="w-24 border p-2" />
                  <button type="button" onClick={() => handleRemoveItem(index)} className="text-red-500">Remove</button>
                </div>
              ))}

              <div className="bg-gray-50 p-4 rounded text-right">
                <p>Total Amount: <span className="text-xl font-bold">{formatCurrency(calculateTotal())}</span></p>
                <div className="mt-2">
                   <label>Advance Payment: </label>
                   <input type="number" value={formData.advancePayment} onChange={(e) => setFormData({...formData, advancePayment: e.target.value})} className="border p-1" />
                </div>
              </div>

              <div className="flex gap-4">
                <button type="button" onClick={() => setShowCreateForm(false)} className="flex-1 bg-gray-200 py-2">Cancel</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-2">Create Order</button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
             <h2 className="text-xl font-semibold">Orders ({filteredOrders.length})</h2>
             <div className="flex gap-2">
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="border p-2">
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                </select>
             </div>
          </div>
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-4 text-left">ID</th>
                <th className="p-4 text-left">Customer</th>
                <th className="p-4 text-left">Total</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr key={order.id} className={getRowClassName(order)}>
                  <td className="p-4">#{order.id}</td>
                  <td className="p-4">{order.customer_name}</td>
                  <td className="p-4 font-bold">{formatCurrency(order.total_amount)}</td>
                  <td className="p-4">{getStatusBadge(order.status)}</td>
                  <td className="p-4 flex gap-2">
                    <button onClick={() => openDetailsModal(order)} className="text-indigo-600">View</button>
                    <button onClick={() => downloadInvoice(order.id)} className="text-green-600">PDF</button>
                    <button onClick={() => handleCancelOrder(order.id)} className="text-red-600">Cancel</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}