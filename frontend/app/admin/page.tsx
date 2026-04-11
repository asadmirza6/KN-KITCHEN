'use client'

/**
 * Admin Dashboard - Protected Route with Real-Time Statistics
 * Shows admin management options and live order statistics.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { isAuthenticated, getCurrentUser } from '@/services/authService'
import type { User } from '@/types/User'
import axios from '@/lib/axios'
import { formatCurrency } from '@/lib/currency'
import ProfitSummary from '@/components/ProfitSummary'


interface OrderStats {
  total_orders: number
  today_orders: number
  total_revenue: number
  today_revenue: number
  total_advances: number
  today_advances: number
  total_pending: number
  today_pending: number
  pending_count: number
  partial_count: number
  paid_count: number
}

interface SystemStatus {
  db_status: 'connected' | 'disconnected'
  today_orders: number
  server_uptime: string
  active_sessions: number
}


export default function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [sessionStartTime] = useState(new Date())

  // SWR hook for order statistics
  const { data: stats, error: statsError, isLoading: statsLoading } = useSWR(
    isAuthenticated() && getCurrentUser()?.role === 'ADMIN' ? '/orders/stats/summary' : null,
    undefined,
    { revalidateOnFocus: false }
  )

  useEffect(() => {
    // Check authentication
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }

    const currentUser = getCurrentUser()
    setUser(currentUser)
  }, [router])

  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours}h ${minutes}m ${secs}s`
  }

  const systemStatus = {
    db_status: statsError ? 'disconnected' : 'connected' as const,
    today_orders: stats?.today_orders || 0,
    server_uptime: formatUptime(Math.floor((new Date().getTime() - sessionStartTime.getTime()) / 1000)),
    active_sessions: 1
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-transparent py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Welcome back, {user.name}! Manage your catering business from here.
          </p>
        </div>

        {/* Total Pending Amount - Prominent Display - ADMIN Only */}
        {user.role === 'ADMIN' && stats && stats.total_pending > 0 && (
          <div className="mb-8 bg-gradient-to-r from-red-500 to-red-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium mb-1">Total Amount Pending Collection</p>
                <p className="text-4xl font-bold">{formatCurrency(stats.total_pending)}</p>
                <p className="text-red-100 text-sm mt-2">
                  From {stats.pending_count} pending and {stats.partial_count} partial payment orders
                </p>
              </div>
              <div className="flex items-center justify-center w-16 h-16 bg-white bg-opacity-20 rounded-full">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* Order Statistics Cards - ADMIN Only */}
        {user.role === 'ADMIN' && statsLoading ? (
          <div className="mb-8 bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="ml-3 text-gray-600">Loading statistics...</p>
            </div>
          </div>
        ) : stats ? (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Today's Orders */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">Today's Orders</p>
              <p className="text-3xl font-bold text-gray-900">{stats.today_orders}</p>
              <p className="text-xs text-gray-500 mt-2">Revenue: {formatCurrency(stats.today_revenue)}</p>
            </div>

            {/* Total Orders */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center justify-center w-10 h-10 bg-indigo-100 rounded-lg">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">Total Orders</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total_orders}</p>
              <p className="text-xs text-gray-500 mt-2">Revenue: {formatCurrency(stats.total_revenue)}</p>
            </div>

            {/* Paid Orders */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">Fully Paid</p>
              <p className="text-3xl font-bold text-green-600">{stats.paid_count}</p>
              <p className="text-xs text-gray-500 mt-2">Orders completed</p>
            </div>

            {/* Pending Payments */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center justify-center w-10 h-10 bg-yellow-100 rounded-lg">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">Awaiting Payment</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.pending_count + stats.partial_count}</p>
              <p className="text-xs text-gray-500 mt-2">Pending: {stats.pending_count} | Partial: {stats.partial_count}</p>
            </div>
          </div>
        ) : user.role === 'ADMIN' ? (
          <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">Could not load order statistics. Please refresh the page.</p>
          </div>
        ) : null}

        {/* Profit Summary Widget - ADMIN Only */}
        {user.role === 'ADMIN' && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Profit Analytics</h2>
            <ProfitSummary />
          </div>
        )}

        {/* Management Cards Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Management</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Manage Items Card - ADMIN Only */}
            {user.role === 'ADMIN' && (
              <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-lg mb-4">
                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Manage Items</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Add, edit, or remove menu items and update pricing.
                  </p>
                  <button
                    onClick={() => router.push('/admin/items')}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                  >
                    Manage Items
                  </button>
                </div>
              </div>
            )}

            {/* Manage Gallery Card - ADMIN Only */}
            {user.role === 'ADMIN' && (
              <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mb-4">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Manage Gallery</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Upload and manage gallery images for your website.
                  </p>
                  <button
                    onClick={() => router.push('/admin/gallery')}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                  >
                    Manage Gallery
                  </button>
                </div>
              </div>
            )}

            {/* Manage Banners Card - ADMIN Only */}
            {user.role === 'ADMIN' && (
              <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mb-4">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Manage Banners</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Update homepage banner images and promotions.
                  </p>
                  <button
                    onClick={() => router.push('/admin/banners')}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                  >
                    Manage Banners
                  </button>
                </div>
              </div>
            )}

            {/* Manage Users Card - ADMIN Only */}
            {user.role === 'ADMIN' && (
              <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-lg mb-4">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Manage Users</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Create and manage ADMIN and STAFF user accounts.
                  </p>
                  <button
                    onClick={() => router.push('/admin/users')}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                  >
                    Manage Users
                  </button>
                </div>
              </div>
            )}

            {/* Quotations Management Card */}
            <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Quotations Management</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Create quotations, send estimates, and approve to convert to orders.
                </p>
                <button
                  onClick={() => router.push('/admin/quotations')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  Manage Quotations
                </button>
              </div>
            </div>

            {/* Manage Packages Card - ADMIN Only */}
            {user.role === 'ADMIN' && (
              <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-center w-12 h-12 bg-pink-100 rounded-lg mb-4">
                    <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Manage Packages</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Create and manage special packages/deals displayed on homepage.
                  </p>
                  <button
                    onClick={() => router.push('/admin/packages')}
                    className="w-full bg-pink-600 hover:bg-pink-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                  >
                    Manage Packages
                  </button>
                </div>
              </div>
            )}

            {/* Orders Management Card */}
            <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden border-2 border-yellow-400">
              <div className="p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-lg mb-4">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Orders Management</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Create, view, edit, and manage customer orders.
                </p>
                <button
                  onClick={() => router.push('/admin/orders')}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  Manage Orders
                </button>
              </div>
            </div>

            {/* ERP Section Header */}
          </div>
        </div>

        {/* ERP Management Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">ERP Management</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Inventory Management Card */}
            {user.role === 'ADMIN' && (
              <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-center w-12 h-12 bg-cyan-100 rounded-lg mb-4">
                    <svg className="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m0 0l8 4m-8-4v10l8 4m0-10l8 4m-8-4v10M7 12l8 4m0 0l8-4" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Inventory Management</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Track stock levels, manage items, and monitor inventory value.
                  </p>
                  <button
                    onClick={() => router.push('/admin/inventory')}
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                  >
                    Manage Inventory
                  </button>
                </div>
              </div>
            )}

            {/* Vendors Management Card */}
            {user.role === 'ADMIN' && (
              <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg mb-4">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5.581m0 0H9m0 0h5.581M9 21h0M5 21h0" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Vendors Management</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Manage vendor information and track credit/debit balances.
                  </p>
                  <button
                    onClick={() => router.push('/admin/vendors')}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                  >
                    Manage Vendors
                  </button>
                </div>
              </div>
            )}

            {/* Staff Management Card */}
            {user.role === 'ADMIN' && (
              <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-center w-12 h-12 bg-teal-100 rounded-lg mb-4">
                    <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0zM6 20a9 9 0 0118 0v2h2v-2a11 11 0 00-20 0v2h2v-2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Staff Management</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Manage staff members, salaries, and advance payments.
                  </p>
                  <button
                    onClick={() => router.push('/admin/staff')}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                  >
                    Manage Staff
                  </button>
                </div>
              </div>
            )}

            {/* Purchase Records Card */}
            {user.role === 'ADMIN' && (
              <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-center w-12 h-12 bg-violet-100 rounded-lg mb-4">
                    <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Purchase Records</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Track purchases from vendors and manage inventory updates.
                  </p>
                  <button
                    onClick={() => router.push('/admin/purchase-records')}
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                  >
                    View Purchases
                  </button>
                </div>
              </div>
            )}

            {/* Recipe Builder Card */}
            {user.role === 'ADMIN' && (
              <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden border-2 border-green-400">
                <div className="p-6">
                  <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mb-4">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Recipe Builder</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Link menu items to ingredients and manage recipes for orders.
                  </p>
                  <button
                    onClick={() => router.push('/admin/recipes')}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                  >
                    Manage Recipes
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Additional Info - System Status */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-blue-800">
                System Status
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                {systemStatus ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p><strong>DB Status:</strong> <span className={systemStatus.db_status === 'connected' ? 'text-green-600' : 'text-red-600'}>{systemStatus.db_status === 'connected' ? '✓ Connected' : '✗ Disconnected'}</span></p>
                      <p><strong>Today's Orders:</strong> {systemStatus.today_orders}</p>
                    </div>
                    <div>
                      <p><strong>Server Uptime:</strong> {systemStatus.server_uptime}</p>
                      <p><strong>Active Sessions:</strong> {systemStatus.active_sessions}</p>
                    </div>
                  </div>
                ) : (
                  <p>Loading system status...</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
