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
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)

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

      await axios.post('/vendors', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setSuccess('Vendor created successfully!')
      setFormData({ name: '', contact_info: '', category: '' })
      setShowForm(false)
      mutateVendors()
    } catch (err: any) {
      setFormError(err.response?.data?.detail || err.message || 'Failed to create vendor')
    } finally {
      setSubmitting(false)
    }
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
            {showForm ? 'Close' : '+ Add Vendor'}
          </button>
        </div>

        <h1 className="text-3xl font-bold mb-6 text-black">Vendors Management</h1>

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
              Add New Vendor
            </h2>

            <form onSubmit={handleCreateVendor} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-black mb-1">
                  Vendor Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., ABC Meat Suppliers"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="border p-2 rounded w-full text-black font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-black mb-1">
                  Contact Info *
                </label>
                <input
                  type="text"
                  placeholder="Phone, email, address"
                  value={formData.contact_info}
                  onChange={(e) => setFormData({ ...formData, contact_info: e.target.value })}
                  className="border p-2 rounded w-full text-black font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-black mb-1">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="border p-2 rounded w-full text-black font-bold"
                  required
                >
                  <option value="">Select Category</option>
                  <option value="Meat">Meat</option>
                  <option value="Grocery">Grocery</option>
                  <option value="Dairy">Dairy</option>
                  <option value="Vegetables">Vegetables</option>
                  <option value="Spices">Spices</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Vendor'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setFormData({ name: '', contact_info: '', category: '' })
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

        {/* Vendors Table */}
        <div className="bg-white shadow rounded-lg p-4 md:p-6">
          <h2 className="text-xl font-bold mb-4 text-black">Vendors List</h2>

          {!mounted || vendorsLoading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-gray-600">Loading vendors...</p>
            </div>
          ) : vendors.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p>No vendors found. Click "Add Vendor" to add one.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-black">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-black">Category</th>
                    <th className="text-left py-3 px-4 font-semibold text-black">Contact</th>
                    <th className="text-left py-3 px-4 font-semibold text-black">Total Purchases</th>
                    <th className="text-left py-3 px-4 font-semibold text-black">Total Payments</th>
                    <th className="text-left py-3 px-4 font-semibold text-black">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((vendor: Vendor) => (
                    <tr key={vendor.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-4 text-black font-bold">{vendor.name}</td>
                      <td className="py-3 px-4 text-gray-600">{vendor.category}</td>
                      <td className="py-3 px-4 text-gray-600 text-sm">{vendor.contact_info}</td>
                      <td className="py-3 px-4 text-gray-600">Rs. {vendor.total_purchases.toFixed(2)}</td>
                      <td className="py-3 px-4 text-gray-600">Rs. {vendor.total_payments.toFixed(2)}</td>
                      <td className={`py-3 px-4 font-bold ${getBalanceColor(vendor.balance)}`}>
                        Rs. {vendor.balance.toFixed(2)}
                        <div className="text-xs text-gray-500 mt-1">
                          {vendor.balance > 0 ? '(We owe)' : vendor.balance < 0 ? '(They owe)' : '(Settled)'}
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
