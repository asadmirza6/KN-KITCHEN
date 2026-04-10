'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { isAuthenticated, getCurrentUser } from '@/services/authService'
import type { Item } from '@/types/Item'
import type { User } from '@/types/User'
import axios from '@/lib/axios'
import { formatCurrency } from '@/lib/currency'

interface OrderItem {
  itemId: number
  quantity: number
}

interface ManualItem {
  name: string
  quantity: number
  price: number
}

interface Order {
  id: number
  user_id: number
  created_by_name: string
  customer_name: string
  customer_email: string
  customer_phone: string
  customer_address: string
  items: any[]
  manual_items: any[]
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
  customerAddress: string
  selectedItems: OrderItem[]
  manualItems: ManualItem[]
  advancePayment: string
  deliveryDate: string
  notes: string
}

export default function AdminOrdersPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'partial' | 'paid' | 'cancelled'>('all')

  // SWR hooks for data fetching
  const { data: items = [], error: itemsError, isLoading: itemsLoading, mutate: mutateItems } = useSWR(
    isAuthenticated() && getCurrentUser()?.role === 'ADMIN' ? '/items/admin/all' : null,
    undefined,
    { revalidateOnFocus: false }
  )

  const { data: orders = [], error: ordersError, isLoading: ordersLoading, mutate: mutateOrders } = useSWR(
    isAuthenticated() && getCurrentUser()?.role === 'ADMIN' ? '/orders/' : null,
    undefined,
    { revalidateOnFocus: false }
  )

  const [formData, setFormData] = useState<OrderFormData>({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
    selectedItems: [],
    manualItems: [],
    advancePayment: '',
    deliveryDate: '',
    notes: ''
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }
    const user = getCurrentUser()
    setCurrentUser(user)
  }, [router])

  // Compute filtered orders directly without storing in state
  const getFilteredOrders = () => {
    let filtered = [...orders]
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    if (dateFilter === 'today') {
      filtered = filtered.filter(order => new Date(order.created_at) >= today)
    } else if (dateFilter === 'week') {
      filtered = filtered.filter(order => new Date(order.created_at) >= weekAgo)
    } else if (dateFilter === 'month') {
      filtered = filtered.filter(order => new Date(order.created_at) >= monthAgo)
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter)
    }
    return filtered
  }

  const filteredOrders = getFilteredOrders()

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

  const handleAddManualItem = () => {
    setFormData(prev => ({
      ...prev,
      manualItems: [...prev.manualItems, { name: '', quantity: 0, price: 0 }]
    }))
  }

  const handleRemoveManualItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      manualItems: prev.manualItems.filter((_, i) => i !== index)
    }))
  }

  const handleManualItemChange = (index: number, field: 'name' | 'quantity' | 'price', value: any) => {
    // Prevent NaN values for numeric fields
    let sanitizedValue = value
    if (field === 'quantity' || field === 'price') {
      sanitizedValue = isNaN(value) ? 0 : value
    }

    setFormData(prev => ({
      ...prev,
      manualItems: prev.manualItems.map((item, i) =>
        i === index ? { ...item, [field]: sanitizedValue } : item
      )
    }))
  }

  const calculateTotal = () => {
    const menuTotal = formData.selectedItems.reduce((total, orderItem) => {
      const item = items.find(i => i.id === orderItem.itemId)
      return item ? total + (parseFloat(item.price_per_kg) * orderItem.quantity) : total
    }, 0)

    const manualTotal = formData.manualItems.reduce((total, item) =>
      total + (item.price * item.quantity), 0)

    return menuTotal + manualTotal
  }

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(''); setSuccess(''); setSubmitting(true)
    try {
      if (formData.selectedItems.length === 0 && formData.manualItems.length === 0) throw new Error('Select at least one item (menu or manual)')
      if (!formData.customerName || !formData.customerPhone || !formData.customerAddress) throw new Error('Fill all customer details')

      const totalAmount = calculateTotal()
      const advanceAmount = parseFloat(formData.advancePayment) || 0

      const orderData = {
        customer_name: formData.customerName,
        customer_email: formData.customerEmail,
        customer_phone: formData.customerPhone,
        customer_address: formData.customerAddress,
        items: formData.selectedItems.map(oi => {
          const item = items.find(i => i.id === oi.itemId)
          return {
            item_id: oi.itemId,
            item_name: item?.name || '',
            quantity_kg: oi.quantity,
            price_per_kg: parseFloat(item?.price_per_kg || '0')
          }
        }),
        manual_items: formData.manualItems.map(mi => ({
          name: mi.name,
          quantity_kg: mi.quantity,
          price_per_kg: mi.price
        })),
        total_amount: totalAmount,
        advance_payment: advanceAmount,
        delivery_date: formData.deliveryDate || null,
        notes: formData.notes || null
      }

      await axios.post('/orders/', orderData)
      setSuccess('Order created!')
      setFormData({ customerName: '', customerEmail: '', customerPhone: '', customerAddress: '', selectedItems: [], manualItems: [], advancePayment: '', deliveryDate: '', notes: '' })
      setShowCreateForm(false)
      // Revalidate orders cache
      mutateOrders()
    } catch (err: any) {
      setFormError(err.message || 'Failed to create order')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOrder) return
    setFormError(''); setSuccess(''); setSubmitting(true)
    try {
      const totalAmount = calculateTotal()
      const advanceAmount = parseFloat(formData.advancePayment) || 0
      const updateData = {
        customer_name: formData.customerName,
        customer_email: formData.customerEmail,
        customer_phone: formData.customerPhone,
        customer_address: formData.customerAddress,
        items: formData.selectedItems.map(oi => {
          const item = items.find(i => i.id === oi.itemId)
          return {
            item_id: oi.itemId,
            item_name: item?.name || '',
            quantity_kg: oi.quantity,
            price_per_kg: parseFloat(item?.price_per_kg || '0')
          }
        }),
        manual_items: formData.manualItems.map(mi => ({
          name: mi.name,
          quantity_kg: mi.quantity,
          price_per_kg: mi.price
        })),
        total_amount: totalAmount,
        advance_payment: advanceAmount,
        delivery_date: formData.deliveryDate || null,
        notes: formData.notes || null
      }
      await axios.patch(`/orders/${selectedOrder.id}`, updateData)
      setSuccess('Order updated!')
      setShowEditModal(false)
      setSelectedOrder(null)
      // Revalidate orders cache
      mutateOrders()
    } catch (err: any) {
      setFormError(err.message || 'Failed to update order')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelOrder = async (id: number) => {
    if (!confirm('Cancel this order?')) return
    try {
      await axios.delete(`/orders/${id}`)
      setSuccess('Order cancelled')
      // Revalidate orders cache
      mutateOrders()
    } catch (err: any) {
      setFormError('Failed to cancel')
    }
  }

  const downloadInvoice = async (id: number) => {
    try {
      const res = await axios.get(`/orders/${id}/invoice`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url; link.setAttribute('download', `invoice_${id}.pdf`)
      document.body.appendChild(link); link.click(); link.remove()
    } catch (err) { setFormError('Invoice failed') }
  }

  const getStatusBadge = (s: string) => {
    const colors: {[key: string]: string} = {
      pending: 'bg-yellow-200 text-yellow-900',
      partial: 'bg-blue-200 text-blue-900',
      paid: 'bg-green-200 text-green-900',
      cancelled: 'bg-red-200 text-red-900'
    }
    return (
      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${colors[s] || 'bg-gray-200 text-gray-900'}`}>
        {s.toUpperCase()}
      </span>
    )
  }

  if (!mounted || ordersLoading || itemsLoading) return <div className="p-10 text-center text-black font-bold">Loading...</div>

  return (
    <div className="min-h-screen bg-transparent p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <button onClick={() => router.push('/admin')} className="text-indigo-600 font-bold hover:text-indigo-800">← Back</button>
          <button onClick={() => setShowCreateForm(!showCreateForm)} className="w-full md:w-auto bg-indigo-600 text-white px-4 py-2 rounded font-bold hover:bg-indigo-700">
            {showCreateForm ? 'Close' : '+ New Order'}
          </button>
        </div>
        <h1 className="text-3xl font-bold mb-6 text-black">Orders Management</h1>

        {(ordersError || itemsError || formError) && (
          <div className="bg-red-100 text-red-900 p-4 rounded mb-4 font-bold">
            {formError || ordersError?.message || itemsError?.message || 'Failed to load data'}
          </div>
        )}
        {success && <div className="bg-green-100 text-green-900 p-4 rounded mb-4 font-bold">{success}</div>}

      {/* Create Order Form */}
      {showCreateForm && (
        <div className="bg-white shadow rounded-lg p-4 md:p-6 mb-6">
          <h2 className="text-xl md:text-2xl font-bold mb-4 text-black">Create New Order</h2>
          <form onSubmit={handleCreateOrder}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-bold text-black mb-1">Customer Name</label>
                <input
                  type="text"
                  placeholder="Customer Name"
                  value={formData.customerName}
                  onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                  className="border p-2 rounded w-full text-black font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-1">Customer Email</label>
                <input
                  type="email"
                  placeholder="Customer Email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({...formData, customerEmail: e.target.value})}
                  className="border p-2 rounded w-full text-black font-bold"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-1">Customer Phone</label>
                <input
                  type="tel"
                  placeholder="Customer Phone"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
                  className="border p-2 rounded w-full text-black font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-1">Customer Address</label>
                <input
                  type="text"
                  placeholder="Delivery Address"
                  value={formData.customerAddress}
                  onChange={(e) => setFormData({...formData, customerAddress: e.target.value})}
                  className="border p-2 rounded w-full text-black font-bold"
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-black">Order Items</h3>
                <button type="button" onClick={handleAddItem} className="bg-blue-500 text-white px-3 py-1 rounded text-sm font-bold hover:bg-blue-600">
                  + Add Item
                </button>
              </div>
              <div className="max-h-40 overflow-y-auto border rounded p-2 bg-gray-50">
                {formData.selectedItems.map((orderItem, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <select
                      value={orderItem.itemId}
                      onChange={(e) => handleItemChange(index, 'itemId', parseInt(e.target.value))}
                      className="border p-2 rounded flex-1 text-black font-bold"
                    >
                      {items.map(item => (
                        <option key={item.id} value={item.id}>{item.name} - {formatCurrency(parseFloat(item.price_per_kg))}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={orderItem.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                      className="border p-2 rounded w-20 text-black font-bold"
                      placeholder="Qty"
                    />
                    <button type="button" onClick={() => handleRemoveItem(index)} className="bg-red-500 text-white px-3 py-2 rounded font-bold hover:bg-red-600">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-black">Manual Items</h3>
                <button type="button" onClick={handleAddManualItem} className="bg-purple-500 text-white px-3 py-1 rounded text-sm font-bold hover:bg-purple-600">
                  + Add Manual Item
                </button>
              </div>
              <div className="max-h-40 overflow-y-auto border rounded p-2 bg-gray-50">
                {formData.manualItems.map((item, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Item name"
                      value={item.name}
                      onChange={(e) => handleManualItemChange(index, 'name', e.target.value)}
                      className="border p-2 rounded flex-1 text-black font-bold"
                      required
                    />
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={isNaN(item.quantity) ? '' : item.quantity}
                      onChange={(e) => handleManualItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="border p-2 rounded w-20 text-black font-bold"
                      placeholder="Qty"
                      required
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={isNaN(item.price) ? '' : item.price}
                      onChange={(e) => handleManualItemChange(index, 'price', parseFloat(e.target.value) || 0)}
                      className="border p-2 rounded w-24 text-black font-bold"
                      placeholder="Price"
                      required
                    />
                    <button type="button" onClick={() => handleRemoveManualItem(index)} className="bg-red-500 text-white px-3 py-2 rounded font-bold hover:bg-red-600">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-bold text-black mb-1">Total Amount</label>
                <input
                  type="text"
                  value={formatCurrency(calculateTotal())}
                  className="border p-2 rounded w-full bg-gray-100 text-black font-bold"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-1">Advance Payment</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.advancePayment}
                  onChange={(e) => setFormData({...formData, advancePayment: e.target.value})}
                  className="border p-2 rounded w-full text-black font-bold"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-bold text-black mb-1">Delivery Date (Optional)</label>
                <input
                  type="date"
                  value={formData.deliveryDate}
                  onChange={(e) => setFormData({...formData, deliveryDate: e.target.value})}
                  className="border p-2 rounded w-full text-black font-bold"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="border p-2 rounded w-full text-black font-bold"
                  placeholder="Additional notes"
                />
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-2">
              <button type="submit" disabled={submitting} className="flex-1 bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700">
                {submitting ? 'Creating...' : 'Create Order'}
              </button>
              <button type="button" onClick={() => setShowCreateForm(false)} className="flex-1 bg-gray-300 text-black px-6 py-2 rounded font-bold hover:bg-gray-400">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-4">
          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value as any)} className="border p-2 rounded text-black font-bold flex-1">
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="border p-2 rounded text-black font-bold flex-1">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white shadow rounded-lg overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-4 text-left text-black font-bold">ID</th>
              <th className="p-4 text-left text-black font-bold">Created By</th>
              <th className="p-4 text-left text-black font-bold">Customer</th>
              <th className="p-4 text-left text-black font-bold">Phone</th>
              <th className="p-4 text-left text-black font-bold">Address</th>
              <th className="p-4 text-left text-black font-bold">Total</th>
              <th className="p-4 text-left text-black font-bold">Advance</th>
              <th className="p-4 text-left text-black font-bold">Balance</th>
              <th className="p-4 text-left text-black font-bold">Date</th>
              <th className="p-4 text-left text-black font-bold">Status</th>
              <th className="p-4 text-left text-black font-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map(o => (
              <tr key={o.id} className="border-t hover:bg-gray-50">
                <td className="p-4 text-black font-bold">#{o.id}</td>
                <td className="p-4 text-black font-bold">{o.created_by_name}</td>
                <td className="p-4 text-black">{o.customer_name}</td>
                <td className="p-4 text-black">{o.customer_phone}</td>
                <td className="p-4 text-black">{o.customer_address || 'N/A'}</td>
                <td className="p-4 text-black font-bold">{formatCurrency(parseFloat(o.total_amount))}</td>
                <td className="p-4 text-black">{formatCurrency(parseFloat(o.advance_payment))}</td>
                <td className="p-4 text-black font-bold">{formatCurrency(parseFloat(o.balance))}</td>
                <td className="p-4 text-black">{new Date(o.created_at).toLocaleDateString()}</td>
                <td className="p-4">{getStatusBadge(o.status)}</td>
                <td className="p-4 flex gap-2">
                   <button onClick={() => {
                     setSelectedOrder(o)
                     setFormData({
                       customerName: o.customer_name,
                       customerEmail: o.customer_email,
                       customerPhone: o.customer_phone,
                       customerAddress: o.customer_address || '',
                       selectedItems: o.items.filter((item: any) => !item.is_manual).map((item: any) => ({
                         itemId: item.item_id,
                         quantity: item.quantity_kg
                       })),
                       manualItems: (o.manual_items || []).map((item: any) => ({
                         name: item.name,
                         quantity: item.quantity_kg,
                         price: item.price_per_kg
                       })),
                       advancePayment: o.advance_payment,
                       deliveryDate: o.delivery_date || '',
                       notes: o.notes || ''
                     })
                     setShowEditModal(true)
                   }} className="text-blue-600 hover:text-blue-800 font-bold text-sm">Edit</button>
                   <button onClick={() => {
                     setSelectedOrder(o)
                     setShowDetailsModal(true)
                   }} className="text-indigo-600 hover:text-indigo-800 font-bold text-sm">View</button>
                   <button onClick={() => downloadInvoice(o.id)} className="text-green-600 hover:text-green-800 font-bold text-sm">PDF</button>
                   <button onClick={() => handleCancelOrder(o.id)} className="text-red-600 hover:text-red-800 font-bold text-sm">Cancel</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {filteredOrders.map(o => (
          <div key={o.id} className="bg-white shadow rounded-lg p-4 border-l-4 border-indigo-600">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-lg font-bold text-black">Order #{o.id}</h3>
              <div>{getStatusBadge(o.status)}</div>
            </div>
            <p className="text-black font-bold">{o.customer_name}</p>
            <p className="text-black text-sm">{o.customer_phone}</p>
            <p className="text-black text-sm mb-2">{o.customer_address || 'No address'}</p>
            <div className="grid grid-cols-2 gap-3 my-4 bg-gray-50 p-3 rounded">
              <div>
                <p className="text-xs text-gray-700 font-bold">Total</p>
                <p className="text-black font-bold">{formatCurrency(parseFloat(o.total_amount))}</p>
              </div>
              <div>
                <p className="text-xs text-gray-700 font-bold">Advance</p>
                <p className="text-black font-bold">{formatCurrency(parseFloat(o.advance_payment))}</p>
              </div>
              <div>
                <p className="text-xs text-gray-700 font-bold">Balance</p>
                <p className="text-red-600 font-bold">{formatCurrency(parseFloat(o.balance))}</p>
              </div>
              <div>
                <p className="text-xs text-gray-700 font-bold">Date</p>
                <p className="text-black font-bold">{new Date(o.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => {
                setSelectedOrder(o)
                setFormData({
                  customerName: o.customer_name,
                  customerEmail: o.customer_email,
                  customerPhone: o.customer_phone,
                  customerAddress: o.customer_address || '',
                  selectedItems: o.items.filter((item: any) => !item.is_manual).map((item: any) => ({
                    itemId: item.item_id,
                    quantity: item.quantity_kg
                  })),
                  manualItems: o.items.filter((item: any) => item.is_manual).map((item: any) => ({
                    name: item.item_name,
                    quantity: item.quantity_kg,
                    price: item.price_per_kg
                  })),
                  advancePayment: o.advance_payment,
                  deliveryDate: o.delivery_date || '',
                  notes: o.notes || ''
                })
                setShowEditModal(true)
              }} className="flex-1 bg-blue-600 text-white px-3 py-2 rounded font-bold text-sm hover:bg-blue-700">Edit</button>
              <button onClick={() => {
                setSelectedOrder(o)
                setShowDetailsModal(true)
              }} className="flex-1 bg-indigo-600 text-white px-3 py-2 rounded font-bold text-sm hover:bg-indigo-700">View</button>
              <button onClick={() => downloadInvoice(o.id)} className="flex-1 bg-green-600 text-white px-3 py-2 rounded font-bold text-sm hover:bg-green-700">PDF</button>
              <button onClick={() => handleCancelOrder(o.id)} className="flex-1 bg-red-600 text-white px-3 py-2 rounded font-bold text-sm hover:bg-red-700">Cancel</button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Order Modal */}
      {showEditModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 md:p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl md:text-2xl font-bold mb-4 text-black">Edit Order #{selectedOrder.id}</h2>
            <form onSubmit={handleUpdateOrder}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-bold text-black mb-1">Customer Name</label>
                  <input
                    type="text"
                    placeholder="Customer Name"
                    value={formData.customerName}
                    onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                    className="border p-2 rounded w-full text-black font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-black mb-1">Customer Email</label>
                  <input
                    type="email"
                    placeholder="Customer Email"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({...formData, customerEmail: e.target.value})}
                    className="border p-2 rounded w-full text-black font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-black mb-1">Customer Phone</label>
                  <input
                    type="tel"
                    placeholder="Customer Phone"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
                    className="border p-2 rounded w-full text-black font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-black mb-1">Customer Address</label>
                  <input
                    type="text"
                    placeholder="Delivery Address"
                    value={formData.customerAddress}
                    onChange={(e) => setFormData({...formData, customerAddress: e.target.value})}
                    className="border p-2 rounded w-full text-black font-bold"
                    required
                  />
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-black">Order Items</h3>
                  <button type="button" onClick={handleAddItem} className="bg-blue-500 text-white px-3 py-1 rounded text-sm font-bold hover:bg-blue-600">
                    + Add Item
                  </button>
                </div>
                <div className="max-h-40 overflow-y-auto border rounded p-2 bg-gray-50">
                  {formData.selectedItems.map((orderItem, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <select
                        value={orderItem.itemId}
                        onChange={(e) => handleItemChange(index, 'itemId', parseInt(e.target.value))}
                        className="border p-2 rounded flex-1 text-black font-bold"
                      >
                        {items.map(item => (
                          <option key={item.id} value={item.id}>{item.name} - {formatCurrency(parseFloat(item.price_per_kg))}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={orderItem.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                        className="border p-2 rounded w-20 text-black font-bold"
                        placeholder="Qty"
                      />
                      <button type="button" onClick={() => handleRemoveItem(index)} className="bg-red-500 text-white px-3 py-2 rounded font-bold hover:bg-red-600">
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-black">Manual Items</h3>
                  <button type="button" onClick={handleAddManualItem} className="bg-purple-500 text-white px-3 py-1 rounded text-sm font-bold hover:bg-purple-600">
                    + Add Manual Item
                  </button>
                </div>
                <div className="max-h-40 overflow-y-auto border rounded p-2 bg-gray-50">
                  {formData.manualItems.map((item, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Item name"
                        value={item.name}
                        onChange={(e) => handleManualItemChange(index, 'name', e.target.value)}
                        className="border p-2 rounded flex-1 text-black font-bold"
                        required
                      />
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={isNaN(item.quantity) ? '' : item.quantity}
                        onChange={(e) => handleManualItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className="border p-2 rounded w-20 text-black font-bold"
                        placeholder="Qty"
                        required
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={isNaN(item.price) ? '' : item.price}
                        onChange={(e) => handleManualItemChange(index, 'price', parseFloat(e.target.value) || 0)}
                        className="border p-2 rounded w-24 text-black font-bold"
                        placeholder="Price"
                        required
                      />
                      <button type="button" onClick={() => handleRemoveManualItem(index)} className="bg-red-500 text-white px-3 py-2 rounded font-bold hover:bg-red-600">
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-bold text-black mb-1">Total Amount</label>
                  <input
                    type="text"
                    value={formatCurrency(calculateTotal())}
                    className="border p-2 rounded w-full bg-gray-100 text-black font-bold"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-black mb-1">Advance Payment</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.advancePayment}
                    onChange={(e) => setFormData({...formData, advancePayment: e.target.value})}
                    className="border p-2 rounded w-full text-black font-bold"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-bold text-black mb-1">Delivery Date (Optional)</label>
                  <input
                    type="date"
                    value={formData.deliveryDate}
                    onChange={(e) => setFormData({...formData, deliveryDate: e.target.value})}
                    className="border p-2 rounded w-full text-black font-bold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-black mb-1">Notes (Optional)</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="border p-2 rounded w-full text-black font-bold"
                    placeholder="Additional notes"
                  />
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-2">
                <button type="submit" disabled={submitting} className="flex-1 bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700">
                  {submitting ? 'Updating...' : 'Update Order'}
                </button>
                <button type="button" onClick={() => {
                  setShowEditModal(false)
                  setSelectedOrder(null)
                }} className="flex-1 bg-gray-300 text-black px-6 py-2 rounded font-bold hover:bg-gray-400">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {showDetailsModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 md:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl md:text-2xl font-bold text-black">Order Details #{selectedOrder.id}</h2>
              <button onClick={() => setShowDetailsModal(false)} className="text-black hover:text-gray-700 text-2xl font-bold">&times;</button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-bold text-black">Customer Name</p>
                  <p className="font-bold text-black">{selectedOrder.customer_name}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-black">Email</p>
                  <p className="font-bold text-black">{selectedOrder.customer_email}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-black">Phone</p>
                  <p className="font-bold text-black">{selectedOrder.customer_phone}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-black">Address</p>
                  <p className="font-bold text-black">{selectedOrder.customer_address}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-black">Order Date</p>
                  <p className="font-bold text-black">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                </div>
                {selectedOrder.delivery_date && (
                  <div>
                    <p className="text-sm font-bold text-black">Delivery Date</p>
                    <p className="font-bold text-black">{selectedOrder.delivery_date}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-black">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-black mb-2">Order Items</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border text-sm md:text-base">
                    <thead className="bg-gray-200">
                      <tr>
                        <th className="p-2 text-left border text-black font-bold">Item</th>
                        <th className="p-2 text-left border text-black font-bold">Quantity</th>
                        <th className="p-2 text-left border text-black font-bold">Rate</th>
                        <th className="p-2 text-left border text-black font-bold">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items.map((item: any, idx: number) => (
                        <tr key={idx}>
                          <td className="p-2 border text-black font-bold">{item.item_name}</td>
                          <td className="p-2 border text-black font-bold">{item.quantity_kg} kg</td>
                          <td className="p-2 border text-black font-bold">{formatCurrency(item.price_per_kg)}</td>
                          <td className="p-2 border text-black font-bold">{formatCurrency(item.subtotal)}</td>
                        </tr>
                      ))}
                      {selectedOrder.manual_items && selectedOrder.manual_items.length > 0 && (
                        <>
                          <tr className="bg-yellow-50">
                            <td colSpan={4} className="p-2 border text-black font-bold text-center">Manual Items</td>
                          </tr>
                          {selectedOrder.manual_items.map((item: any, idx: number) => (
                            <tr key={`manual-${idx}`}>
                              <td className="p-2 border text-black font-bold">{item.name}</td>
                              <td className="p-2 border text-black font-bold">{item.quantity_kg} kg</td>
                              <td className="p-2 border text-black font-bold">{formatCurrency(item.price_per_kg)}</td>
                              <td className="p-2 border text-black font-bold">{formatCurrency(item.subtotal)}</td>
                            </tr>
                          ))}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border-t pt-4 bg-gray-50 p-3 rounded">
                <div className="flex justify-between mb-2">
                  <span className="font-bold text-black">Total Amount:</span>
                  <span className="font-bold text-black">{formatCurrency(parseFloat(selectedOrder.total_amount))}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="font-bold text-black">Advance Payment:</span>
                  <span className="font-bold text-black">{formatCurrency(parseFloat(selectedOrder.advance_payment))}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="font-bold text-black">Balance Due:</span>
                  <span className="text-red-600 font-bold">{formatCurrency(parseFloat(selectedOrder.balance))}</span>
                </div>
              </div>

              {selectedOrder.notes && (
                <div>
                  <p className="text-sm font-bold text-black">Notes</p>
                  <p className="font-bold text-black">{selectedOrder.notes}</p>
                </div>
              )}

              <div className="flex flex-col md:flex-row gap-2">
                <button onClick={() => downloadInvoice(selectedOrder.id)} className="flex-1 bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700">
                  Download Invoice
                </button>
                <button onClick={() => setShowDetailsModal(false)} className="flex-1 bg-gray-300 text-black px-4 py-2 rounded font-bold hover:bg-gray-400">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
