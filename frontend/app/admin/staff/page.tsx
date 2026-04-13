'use client'

/**
 * Admin Staff Management Page
 * Manage staff and log advance/salary payments.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { isAuthenticated, getCurrentUser } from '@/services/authService'
import axios from '@/lib/axios'
import { swrFetcher, swrConfig } from '@/lib/swr'
import type { User } from '@/types/User'

interface StaffMember {
  id: number
  name: string
  role: string
  monthly_salary: number
  total_advances: number
  remaining_salary: number
  created_at: string
}

interface StaffFormData {
  name: string
  role: string
  monthly_salary: number
}

interface TransactionFormData {
  staff_id: number
  amount: number
  transaction_type: string
}

export default function AdminStaffPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [mounted, setMounted] = useState(false)
  const [showStaffForm, setShowStaffForm] = useState(false)
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null)

  const { data: staff = [], error: staffError, isLoading: staffLoading, mutate: mutateStaff } = useSWR(
    isAuthenticated() && getCurrentUser()?.role === 'ADMIN' ? '/staff' : null,
    swrFetcher,
    swrConfig
  )

  const [staffFormData, setStaffFormData] = useState<StaffFormData>({
    name: '',
    role: '',
    monthly_salary: 0,
  })

  const [transactionFormData, setTransactionFormData] = useState<TransactionFormData>({
    staff_id: 0,
    amount: 0,
    transaction_type: 'Advance',
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

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setSuccess('')
    setSubmitting(true)

    try {
      if (!staffFormData.name.trim()) {
        throw new Error('Staff name is required')
      }
      if (!staffFormData.role.trim()) {
        throw new Error('Role is required')
      }
      if (staffFormData.monthly_salary <= 0) {
        throw new Error('Monthly salary must be greater than 0')
      }

      const formDataToSend = new FormData()
      formDataToSend.append('name', staffFormData.name)
      formDataToSend.append('role', staffFormData.role)
      formDataToSend.append('monthly_salary', staffFormData.monthly_salary.toString())

      await axios.post('/staff', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setSuccess('Staff member created successfully!')
      setStaffFormData({ name: '', role: '', monthly_salary: 0 })
      setShowStaffForm(false)
      mutateStaff()
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to create staff member'
      setFormError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage))
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setSuccess('')
    setSubmitting(true)

    try {
      if (!transactionFormData.staff_id) {
        throw new Error('Please select a staff member')
      }
      if (transactionFormData.amount <= 0) {
        throw new Error('Amount must be greater than 0')
      }

      const formDataToSend = new FormData()
      formDataToSend.append('staff_id', transactionFormData.staff_id.toString())
      formDataToSend.append('amount', transactionFormData.amount.toString())
      formDataToSend.append('transaction_type', transactionFormData.transaction_type)

      await axios.post('/staff-transactions', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setSuccess(`${transactionFormData.transaction_type} recorded successfully!`)
      setTransactionFormData({ staff_id: 0, amount: 0, transaction_type: 'Advance' })
      setShowTransactionForm(false)
      setSelectedStaffId(null)
      mutateStaff()
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to record transaction'
      setFormError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage))
    } finally {
      setSubmitting(false)
    }
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
          <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={() => {
                setShowStaffForm(!showStaffForm)
                setShowTransactionForm(false)
              }}
              className="flex-1 md:flex-none bg-indigo-600 text-white px-4 py-2 rounded font-bold hover:bg-indigo-700"
            >
              {showStaffForm ? 'Close' : '+ Add Staff'}
            </button>
            <button
              onClick={() => {
                setShowTransactionForm(!showTransactionForm)
                setShowStaffForm(false)
              }}
              className="flex-1 md:flex-none bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700"
            >
              {showTransactionForm ? 'Close' : '+ Log Transaction'}
            </button>
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-6 text-black">Staff Management</h1>

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

        {/* Add Staff Form */}
        {showStaffForm && (
          <div className="bg-white shadow rounded-lg p-4 md:p-6 mb-6">
            <h2 className="text-xl md:text-2xl font-bold mb-4 text-black">
              Add New Staff Member
            </h2>

            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-black mb-1">
                    Staff Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Ahmed Khan"
                    value={staffFormData.name}
                    onChange={(e) => setStaffFormData({ ...staffFormData, name: e.target.value })}
                    className="border p-2 rounded w-full text-black font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-1">
                    Role *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Chef, Helper"
                    value={staffFormData.role}
                    onChange={(e) => setStaffFormData({ ...staffFormData, role: e.target.value })}
                    className="border p-2 rounded w-full text-black font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-black mb-1">
                  Monthly Salary *
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={staffFormData.monthly_salary}
                  onChange={(e) => setStaffFormData({ ...staffFormData, monthly_salary: parseFloat(e.target.value) || 0 })}
                  className="border p-2 rounded w-full text-black font-bold"
                  step="0.01"
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Staff'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowStaffForm(false)
                    setStaffFormData({ name: '', role: '', monthly_salary: 0 })
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

        {/* Log Transaction Form */}
        {showTransactionForm && (
          <div className="bg-white shadow rounded-lg p-4 md:p-6 mb-6">
            <h2 className="text-xl md:text-2xl font-bold mb-4 text-black">
              Log Staff Transaction
            </h2>

            <form onSubmit={handleCreateTransaction} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-black mb-1">
                  Select Staff Member *
                </label>
                <select
                  value={transactionFormData.staff_id}
                  onChange={(e) => setTransactionFormData({ ...transactionFormData, staff_id: parseInt(e.target.value) })}
                  className="border p-2 rounded w-full text-black font-bold"
                  required
                >
                  <option value={0}>Select Staff Member</option>
                  {staff.map((member: StaffMember) => (
                    <option key={member.id} value={member.id}>
                      {member.name} - Rs. {member.monthly_salary.toFixed(2)}/month (Remaining: Rs. {member.remaining_salary.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-black mb-1">
                    Transaction Type *
                  </label>
                  <select
                    value={transactionFormData.transaction_type}
                    onChange={(e) => setTransactionFormData({ ...transactionFormData, transaction_type: e.target.value })}
                    className="border p-2 rounded w-full text-black font-bold"
                    required
                  >
                    <option value="Advance">Advance</option>
                    <option value="Salary">Salary Payment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-1">
                    Amount *
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={transactionFormData.amount}
                    onChange={(e) => setTransactionFormData({ ...transactionFormData, amount: parseFloat(e.target.value) || 0 })}
                    className="border p-2 rounded w-full text-black font-bold"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 disabled:opacity-50"
                >
                  {submitting ? 'Recording...' : 'Record Transaction'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowTransactionForm(false)
                    setTransactionFormData({ staff_id: 0, amount: 0, transaction_type: 'Advance' })
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

        {/* Staff Table */}
        <div className="bg-white shadow rounded-lg p-4 md:p-6">
          <h2 className="text-xl font-bold mb-4 text-black">Staff List</h2>

          {!mounted || staffLoading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-gray-600">Loading staff...</p>
            </div>
          ) : staff.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p>No staff members found. Click "Add Staff" to add one.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-black">Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-black">Role</th>
                      <th className="text-left py-3 px-4 font-semibold text-black">Monthly Salary</th>
                      <th className="text-left py-3 px-4 font-semibold text-black">Total Advances</th>
                      <th className="text-left py-3 px-4 font-semibold text-black">Remaining Salary</th>
                      <th className="text-left py-3 px-4 font-semibold text-black">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map((member: StaffMember) => (
                      <tr key={member.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-4 text-black font-bold">{member.name}</td>
                        <td className="py-3 px-4 text-gray-600">{member.role}</td>
                        <td className="py-3 px-4 text-gray-600">Rs. {member.monthly_salary.toFixed(2)}</td>
                        <td className="py-3 px-4 text-gray-600">Rs. {member.total_advances.toFixed(2)}</td>
                        <td className="py-3 px-4 font-bold text-green-600">Rs. {member.remaining_salary.toFixed(2)}</td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded text-sm font-bold ${
                            member.remaining_salary > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {member.remaining_salary > 0 ? 'Available' : 'Exceeded'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4">
                {staff.map((member: StaffMember) => (
                  <div key={member.id} className="bg-white border-l-4 border-indigo-600 rounded-lg p-4">
                    <div className="mb-3">
                      <h3 className="text-lg font-bold text-black">{member.name}</h3>
                      <p className="text-sm text-gray-600">{member.role}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded mb-3">
                      <div>
                        <p className="text-xs text-gray-700 font-bold">Monthly Salary</p>
                        <p className="text-black font-bold">Rs. {member.monthly_salary.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-700 font-bold">Total Advances</p>
                        <p className="text-black font-bold">Rs. {member.total_advances.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-700 font-bold">Remaining Salary</p>
                        <p className="text-green-600 font-bold">Rs. {member.remaining_salary.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-700 font-bold">Status</p>
                        <span className={`px-2 py-1 rounded text-xs font-bold inline-block ${
                          member.remaining_salary > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {member.remaining_salary > 0 ? 'Available' : 'Exceeded'}
                        </span>
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
