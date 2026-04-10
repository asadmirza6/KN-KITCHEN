'use client'

/**
 * Admin Purchase Records Management Page
 * View and manage purchase records from vendors.
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

export default function AdminPurchaseRecordsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [mounted, setMounted] = useState(false)

  const { data: purchases = [], error: purchasesError, isLoading: purchasesLoading } = useSWR(
    isAuthenticated() && getCurrentUser()?.role === 'ADMIN' ? '/purchase-records' : null,
    swrFetcher,
    swrConfig
  )

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
          <h1 className="text-3xl font-bold text-black">Purchase Records</h1>
        </div>

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
            <div className="overflow-x-auto">
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
          )}
        </div>
      </div>
    </div>
  )
}
