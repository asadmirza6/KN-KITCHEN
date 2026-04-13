'use client'

/**
 * Admin Home Page - Clean Dashboard
 * Shows two main sections: Operations and ERP Management
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { isAuthenticated, getCurrentUser } from '@/services/authService'
import type { User } from '@/types/User'
import { formatCurrency } from '@/lib/currency'
import { swrFetcher, swrConfig } from '@/lib/swr'
import Breadcrumb from '@/components/Breadcrumb'

interface OrderStats {
  total_orders: number
  today_orders: number
  total_revenue: number
  today_revenue: number
  pending_count: number
  partial_count: number
  paid_count: number
}

interface OrderAnalytics {
  total_orders: number
  today_orders: number
  total_revenue: number
  today_revenue: number
  pending_count: number
  partial_count: number
  paid_count: number
  avg_order_value: number
}

export default function AdminHome() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [mounted, setMounted] = useState(false)

  const { data: stats, isLoading: statsLoading } = useSWR(
    isAuthenticated() && getCurrentUser()?.role === 'ADMIN' ? '/orders/stats/summary' : null,
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
      router.push('/')
    }
    setUser(currentUser)
  }, [router])

  if (!mounted || !user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-1 sm:mt-2 text-xs sm:text-sm md:text-base text-gray-600">Welcome back, {user.name}! Manage your catering business.</p>
        </div>

        {/* Order Analytics */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 mb-2 sm:mb-3 md:mb-4">Order Analytics</h2>
          {stats && !statsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
              <div className="bg-white rounded-lg shadow p-3 sm:p-4 md:p-6">
                <p className="text-gray-600 text-xs sm:text-sm">Total Orders</p>
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mt-2">{stats.total_orders}</p>
                <p className="text-xs text-gray-500 mt-2">{formatCurrency(stats.total_revenue)}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-3 sm:p-4 md:p-6">
                <p className="text-gray-600 text-xs sm:text-sm">Today's Orders</p>
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-600 mt-2">{stats.today_orders}</p>
                <p className="text-xs text-gray-500 mt-2">{formatCurrency(stats.today_revenue)}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-3 sm:p-4 md:p-6">
                <p className="text-gray-600 text-xs sm:text-sm">Fully Paid</p>
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-600 mt-2">{stats.paid_count}</p>
                <p className="text-xs text-gray-500 mt-2">Completed</p>
              </div>
              <div className="bg-white rounded-lg shadow p-3 sm:p-4 md:p-6">
                <p className="text-gray-600 text-xs sm:text-sm">Awaiting Payment</p>
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-yellow-600 mt-2">{stats.pending_count + stats.partial_count}</p>
                <p className="text-xs text-gray-500 mt-2">Pending + Partial</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="mt-2 text-gray-600">Loading analytics...</p>
            </div>
          )}
        </div>

        {/* Main Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
          {/* Operations Section */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3 sm:p-4 md:p-6 text-white">
              <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold">📊 Manage Operations</h2>
              <p className="text-blue-100 mt-1 sm:mt-2 text-xs sm:text-sm md:text-base">Orders, quotations, and customer management</p>
            </div>
            <div className="p-3 sm:p-4 md:p-6 space-y-1 sm:space-y-2 md:space-y-3">
              <button
                onClick={() => router.push('/admin/orders')}
                className="w-full text-left px-2 sm:px-3 md:px-4 py-2 sm:py-2 md:py-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 font-medium text-xs sm:text-sm md:text-base transition-colors"
              >
                📋 Manage Orders
              </button>
              <button
                onClick={() => router.push('/admin/quotations')}
                className="w-full text-left px-2 sm:px-3 md:px-4 py-2 sm:py-2 md:py-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 font-medium text-xs sm:text-sm md:text-base transition-colors"
              >
                📄 Manage Quotations
              </button>
            </div>
          </div>

          {/* ERP Management Section */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-3 sm:p-4 md:p-6 text-white">
              <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold">⚙️ ERP & Setup</h2>
              <p className="text-purple-100 mt-1 sm:mt-2 text-xs sm:text-sm md:text-base">Inventory, vendors, recipes, and financial management</p>
            </div>
            <div className="p-3 sm:p-4 md:p-6 space-y-1 sm:space-y-2 md:space-y-3">
              <button
                onClick={() => router.push('/admin/inventory')}
                className="w-full text-left px-2 sm:px-3 md:px-4 py-2 sm:py-2 md:py-3 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 font-medium text-xs sm:text-sm md:text-base transition-colors"
              >
                📦 Inventory Management
              </button>
              <button
                onClick={() => router.push('/admin/recipes')}
                className="w-full text-left px-2 sm:px-3 md:px-4 py-2 sm:py-2 md:py-3 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 font-medium text-xs sm:text-sm md:text-base transition-colors"
              >
                🍳 Recipe Builder
              </button>
              <button
                onClick={() => router.push('/admin/purchase-records')}
                className="w-full text-left px-2 sm:px-3 md:px-4 py-2 sm:py-2 md:py-3 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 font-medium text-xs sm:text-sm md:text-base transition-colors"
              >
                📝 Purchase Records
              </button>
              <button
                onClick={() => router.push('/admin/vendors')}
                className="w-full text-left px-2 sm:px-3 md:px-4 py-2 sm:py-2 md:py-3 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 font-medium text-xs sm:text-sm md:text-base transition-colors"
              >
                🏢 Vendors
              </button>
              <button
                onClick={() => router.push('/admin/staff')}
                className="w-full text-left px-2 sm:px-3 md:px-4 py-2 sm:py-2 md:py-3 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 font-medium text-xs sm:text-sm md:text-base transition-colors"
              >
                👥 Staff Management
              </button>
            </div>
          </div>
        </div>

        {/* Content Management Section */}
        <div className="mt-4 sm:mt-6 md:mt-8 bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-3 sm:p-4 md:p-6 text-white">
            <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold">🎨 Content Management</h2>
            <p className="text-green-100 mt-1 sm:mt-2 text-xs sm:text-sm md:text-base">Menu items, gallery, banners, and packages</p>
          </div>
          <div className="p-3 sm:p-4 md:p-6 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2 md:gap-3">
            <button
              onClick={() => router.push('/admin/items')}
              className="px-2 sm:px-3 md:px-4 py-2 sm:py-2 md:py-3 rounded-lg bg-green-50 hover:bg-green-100 text-green-900 font-medium text-xs sm:text-sm md:text-base transition-colors"
            >
              🍽️ Menu Items
            </button>
            <button
              onClick={() => router.push('/admin/gallery')}
              className="px-2 sm:px-3 md:px-4 py-2 sm:py-2 md:py-3 rounded-lg bg-green-50 hover:bg-green-100 text-green-900 font-medium text-xs sm:text-sm md:text-base transition-colors"
            >
              🖼️ Gallery
            </button>
            <button
              onClick={() => router.push('/admin/banners')}
              className="px-2 sm:px-3 md:px-4 py-2 sm:py-2 md:py-3 rounded-lg bg-green-50 hover:bg-green-100 text-green-900 font-medium text-xs sm:text-sm md:text-base transition-colors"
            >
              🎨 Banners
            </button>
            <button
              onClick={() => router.push('/admin/packages')}
              className="px-2 sm:px-3 md:px-4 py-2 sm:py-2 md:py-3 rounded-lg bg-green-50 hover:bg-green-100 text-green-900 font-medium text-xs sm:text-sm md:text-base transition-colors"
            >
              🎁 Packages
            </button>
          </div>
        </div>

        {/* Settings Section */}
        <div className="mt-4 sm:mt-6 md:mt-8 bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-gray-500 to-gray-600 p-3 sm:p-4 md:p-6 text-white">
            <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold">⚙️ Settings</h2>
          </div>
          <div className="p-3 sm:p-4 md:p-6">
            <button
              onClick={() => router.push('/admin/users')}
              className="px-2 sm:px-3 md:px-4 py-2 sm:py-2 md:py-3 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-900 font-medium text-xs sm:text-sm md:text-base transition-colors"
            >
              👤 Manage Users
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
