'use client'

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

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'partial' | 'paid' | 'cancelled'>('all')

  const [formData, setFormData] = useState<OrderFormData>({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    selectedItems: [],
    advancePayment: '',
    deliveryDate: '',
    notes: ''
  })

  // FIXED: loadData logic with optional parameter
  const loadData = async (userArg?: User | null) => {
    try {
      const itemsData = await fetchItems()
      setItems(itemsData)

      // Use provided user or fall back to state or fresh fetch
      const user = userArg || currentUser || getCurrentUser();
      
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
      filtered = filtered.filter(order => new Date(order.created_at) >= today)
    } else if (dateFilter === 'week') {
      filtered = filtered.filter(order => new Date(order.created_at) >= weekAgo)
    } else if (dateFilter === 'month') {
      filtered = filtered.filter(order => new Date(order.created_at) >= monthAgo)
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
      return item ? total + (parseFloat(item.price_per_kg) * orderItem.quantity) : total
    }, 0)
  }

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSuccess(''); setSubmitting(true)
    try {
      if (formData.selectedItems.length === 0) throw new Error('Select at least one item')
      if (!formData.customerName || !formData.customerEmail || !formData.customerPhone) throw new Error('Fill customer details')

      const totalAmount = calculateTotal()
      const advanceAmount = parseFloat(formData.advancePayment) || 0

      const orderData = {
        customer_name: formData.customerName,
        customer_email: formData.customerEmail,
        customer_phone: formData.customerPhone,
        items: formData.selectedItems.map(oi => {
          const item = items.find(i => i.id === oi.itemId)
          return {
            item_id: oi.itemId,
            item_name: item?.name || '',
            quantity_kg: oi.quantity,
            price_per_kg: parseFloat(item?.price_per_kg || '0')
          }
        }),
        total_amount: totalAmount,
        advance_payment: advanceAmount,
        delivery_date: formData.deliveryDate || null,
        notes: formData.notes || null
      }

      await axios.post('/orders/', orderData)
      setSuccess('Order created!')
      setFormData({ customerName: '', customerEmail: '', customerPhone: '', selectedItems: [], advancePayment: '', deliveryDate: '', notes: '' })
      setShowCreateForm(false)
      await loadData() // No error now
    } catch (err: any) {
      setError(err.message || 'Failed to create order')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOrder) return
    setError(''); setSuccess(''); setSubmitting(true)
    try {
      const totalAmount = calculateTotal()
      const advanceAmount = parseFloat(formData.advancePayment) || 0
      const updateData = {
        customer_name: formData.customerName,
        customer_email: formData.customerEmail,
        customer_phone: formData.customerPhone,
        items: formData.selectedItems.map(oi => {
          const item = items.find(i => i.id === oi.itemId)
          return {
            item_id: oi.itemId,
            item_name: item?.name || '',
            quantity_kg: oi.quantity,
            price_per_kg: parseFloat(item?.price_per_kg || '0')
          }
        }),
        total_amount: totalAmount,
        advance_payment: advanceAmount,
        delivery_date: formData.deliveryDate || null,
        notes: formData.notes || null
      }
      await axios.patch(`/orders/${selectedOrder.id}`, updateData)
      setSuccess('Order updated!')
      setShowEditModal(false)
      setSelectedOrder(null)
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to update order')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelOrder = async (id: number) => {
    if (!confirm('Cancel this order?')) return
    try {
      await axios.delete(`/orders/${id}`)
      setSuccess('Order cancelled')
      await loadData()
    } catch (err: any) {
      setError('Failed to cancel')
    }
  }

  const downloadInvoice = async (id: number) => {
    try {
      const res = await axios.get(`/orders/${id}/invoice`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url; link.setAttribute('download', `invoice_${id}.pdf`)
      document.body.appendChild(link); link.click(); link.remove()
    } catch (err) { setError('Invoice failed') }
  }

  const getStatusBadge = (s: string) => (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full bg-gray-100`}>{s}</span>
  )

  if (loading) return <div className="p-10 text-center">Loading...</div>

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between mb-6">
        <button onClick={() => router.push('/admin')} className="text-indigo-600">← Back</button>
        <button onClick={() => setShowCreateForm(!showCreateForm)} className="bg-indigo-600 text-white px-4 py-2 rounded">
          {showCreateForm ? 'Close' : '+ New Order'}
        </button>
      </div>
      <h1 className="text-2xl font-bold mb-6">Orders Management</h1>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
      {success && <div className="bg-green-100 text-green-700 p-3 rounded mb-4">{success}</div>}

      {/* Create Order Form */}
      {showCreateForm && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Create New Order</h2>
          <form onSubmit={handleCreateOrder}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <input
                type="text"
                placeholder="Customer Name"
                value={formData.customerName}
                onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                className="border p-2 rounded"
                required
              />
              <input
                type="email"
                placeholder="Customer Email"
                value={formData.customerEmail}
                onChange={(e) => setFormData({...formData, customerEmail: e.target.value})}
                className="border p-2 rounded"
                required
              />
              <input
                type="tel"
                placeholder="Customer Phone"
                value={formData.customerPhone}
                onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
                className="border p-2 rounded"
                required
              />
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">Order Items</h3>
                <button type="button" onClick={handleAddItem} className="bg-blue-500 text-white px-3 py-1 rounded text-sm">
                  + Add Item
                </button>
              </div>
              {formData.selectedItems.map((orderItem, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <select
                    value={orderItem.itemId}
                    onChange={(e) => handleItemChange(index, 'itemId', parseInt(e.target.value))}
                    className="border p-2 rounded flex-1"
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
                    className="border p-2 rounded w-24"
                    placeholder="Qty"
                  />
                  <button type="button" onClick={() => handleRemoveItem(index)} className="bg-red-500 text-white px-3 py-2 rounded">
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Total Amount</label>
                <input
                  type="text"
                  value={formatCurrency(calculateTotal())}
                  className="border p-2 rounded w-full bg-gray-100"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Advance Payment</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.advancePayment}
                  onChange={(e) => setFormData({...formData, advancePayment: e.target.value})}
                  className="border p-2 rounded w-full"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Delivery Date (Optional)</label>
                <input
                  type="date"
                  value={formData.deliveryDate}
                  onChange={(e) => setFormData({...formData, deliveryDate: e.target.value})}
                  className="border p-2 rounded w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="border p-2 rounded w-full"
                  placeholder="Additional notes"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button type="submit" disabled={submitting} className="bg-green-600 text-white px-6 py-2 rounded">
                {submitting ? 'Creating...' : 'Create Order'}
              </button>
              <button type="button" onClick={() => setShowCreateForm(false)} className="bg-gray-300 px-6 py-2 rounded">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4 mb-4">
        <div className="flex gap-4">
          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value as any)} className="border p-2 rounded">
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="border p-2 rounded">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-4 text-left">ID</th>
              <th className="p-4 text-left">Customer</th>
              <th className="p-4 text-left">Phone</th>
              <th className="p-4 text-left">Total</th>
              <th className="p-4 text-left">Advance</th>
              <th className="p-4 text-left">Balance</th>
              <th className="p-4 text-left">Date</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map(o => (
              <tr key={o.id} className="border-t">
                <td className="p-4">#{o.id}</td>
                <td className="p-4">{o.customer_name}</td>
                <td className="p-4">{o.customer_phone}</td>
                <td className="p-4">{formatCurrency(parseFloat(o.total_amount))}</td>
                <td className="p-4">{formatCurrency(parseFloat(o.advance_payment))}</td>
                <td className="p-4">{formatCurrency(parseFloat(o.balance))}</td>
                <td className="p-4">{new Date(o.created_at).toLocaleDateString()}</td>
                <td className="p-4">{getStatusBadge(o.status)}</td>
                <td className="p-4 flex gap-2">
                   <button onClick={() => {
                     setSelectedOrder(o)
                     setFormData({
                       customerName: o.customer_name,
                       customerEmail: o.customer_email,
                       customerPhone: o.customer_phone,
                       selectedItems: o.items.map((item: any) => ({
                         itemId: item.item_id,
                         quantity: item.quantity_kg
                       })),
                       advancePayment: o.advance_payment,
                       deliveryDate: o.delivery_date || '',
                       notes: o.notes || ''
                     })
                     setShowEditModal(true)
                   }} className="text-blue-600 hover:underline">Edit</button>
                   <button onClick={() => {
                     setSelectedOrder(o)
                     setShowDetailsModal(true)
                   }} className="text-indigo-600 hover:underline">View</button>
                   <button onClick={() => downloadInvoice(o.id)} className="text-green-600 hover:underline">PDF</button>
                   <button onClick={() => handleCancelOrder(o.id)} className="text-red-600 hover:underline">Cancel</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Order Modal */}
      {showEditModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Edit Order #{selectedOrder.id}</h2>
            <form onSubmit={handleUpdateOrder}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Customer Name"
                  value={formData.customerName}
                  onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                  className="border p-2 rounded"
                  required
                />
                <input
                  type="email"
                  placeholder="Customer Email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({...formData, customerEmail: e.target.value})}
                  className="border p-2 rounded"
                  required
                />
                <input
                  type="tel"
                  placeholder="Customer Phone"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
                  className="border p-2 rounded"
                  required
                />
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">Order Items</h3>
                  <button type="button" onClick={handleAddItem} className="bg-blue-500 text-white px-3 py-1 rounded text-sm">
                    + Add Item
                  </button>
                </div>
                {formData.selectedItems.map((orderItem, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <select
                      value={orderItem.itemId}
                      onChange={(e) => handleItemChange(index, 'itemId', parseInt(e.target.value))}
                      className="border p-2 rounded flex-1"
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
                      className="border p-2 rounded w-24"
                      placeholder="Qty"
                    />
                    <button type="button" onClick={() => handleRemoveItem(index)} className="bg-red-500 text-white px-3 py-2 rounded">
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Total Amount</label>
                  <input
                    type="text"
                    value={formatCurrency(calculateTotal())}
                    className="border p-2 rounded w-full bg-gray-100"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Advance Payment</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.advancePayment}
                    onChange={(e) => setFormData({...formData, advancePayment: e.target.value})}
                    className="border p-2 rounded w-full"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Delivery Date (Optional)</label>
                  <input
                    type="date"
                    value={formData.deliveryDate}
                    onChange={(e) => setFormData({...formData, deliveryDate: e.target.value})}
                    className="border p-2 rounded w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="border p-2 rounded w-full"
                    placeholder="Additional notes"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button type="submit" disabled={submitting} className="bg-green-600 text-white px-6 py-2 rounded">
                  {submitting ? 'Updating...' : 'Update Order'}
                </button>
                <button type="button" onClick={() => {
                  setShowEditModal(false)
                  setSelectedOrder(null)
                }} className="bg-gray-300 px-6 py-2 rounded">
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
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Order Details #{selectedOrder.id}</h2>
              <button onClick={() => setShowDetailsModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Customer Name</p>
                  <p className="font-semibold">{selectedOrder.customer_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-semibold">{selectedOrder.customer_email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-semibold">{selectedOrder.customer_phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Order Date</p>
                  <p className="font-semibold">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                </div>
                {selectedOrder.delivery_date && (
                  <div>
                    <p className="text-sm text-gray-600">Delivery Date</p>
                    <p className="font-semibold">{selectedOrder.delivery_date}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="font-semibold">{getStatusBadge(selectedOrder.status)}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Order Items</h3>
                <table className="w-full border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left border">Item</th>
                      <th className="p-2 text-left border">Quantity</th>
                      <th className="p-2 text-left border">Rate</th>
                      <th className="p-2 text-left border">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="p-2 border">{item.item_name}</td>
                        <td className="p-2 border">{item.quantity_kg} kg</td>
                        <td className="p-2 border">{formatCurrency(item.price_per_kg)}</td>
                        <td className="p-2 border">{formatCurrency(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between mb-2">
                  <span className="font-semibold">Total Amount:</span>
                  <span className="font-bold">{formatCurrency(parseFloat(selectedOrder.total_amount))}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="font-semibold">Advance Payment:</span>
                  <span>{formatCurrency(parseFloat(selectedOrder.advance_payment))}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="font-semibold">Balance Due:</span>
                  <span className="text-red-600 font-bold">{formatCurrency(parseFloat(selectedOrder.balance))}</span>
                </div>
              </div>

              {selectedOrder.notes && (
                <div>
                  <p className="text-sm text-gray-600">Notes</p>
                  <p className="font-semibold">{selectedOrder.notes}</p>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => downloadInvoice(selectedOrder.id)} className="bg-green-600 text-white px-4 py-2 rounded">
                  Download Invoice
                </button>
                <button onClick={() => setShowDetailsModal(false)} className="bg-gray-300 px-4 py-2 rounded">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}