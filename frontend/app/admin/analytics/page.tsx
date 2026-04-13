'use client'

/**
 * Admin Analytics Page - Profit & Cost Dashboard
 * Shows monthly profit analytics and detailed order history
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { isAuthenticated, getCurrentUser } from '@/services/authService'
import { formatCurrency, formatNumber } from '@/lib/currency'
import { swrFetcher, swrConfig } from '@/lib/swr'
import type { User } from '@/types/User'

interface MonthlyAnalytics {
  month: number
  year: number
  total_revenue: number
  total_cost: number
  net_profit: number
  avg_margin: number
  order_count: number
}

interface OrderHistory {
  order_id: number
  customer_name: string
  order_date: string
  items_summary: string
  total_amount: number
  total_cost: number
  calculated_profit: number
  profit_margin: number
}

interface HistoryResponse {
  total_orders: number
  orders: OrderHistory[]
}

export default function AdminAnalyticsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [mounted, setMounted] = useState(false)

  // Get current date
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())

  // Fetch monthly analytics
  const { data: analytics, isLoading: analyticsLoading } = useSWR(
    isAuthenticated() && getCurrentUser()?.role === 'ADMIN'
      ? `/orders/analytics/monthly?month=${selectedMonth}&year=${selectedYear}`
      : null,
    swrFetcher,
    swrConfig
  )

  // Fetch order history
  const { data: historyData, isLoading: historyLoading } = useSWR(
    isAuthenticated() && getCurrentUser()?.role === 'ADMIN'
      ? `/orders/analytics/history?month=${selectedMonth}&year=${selectedYear}`
      : null,
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

  if (!mounted || !user) {
    return null
  }

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)

  const history = historyData?.orders || []

  // Calculate daily profit for chart
  const dailyProfits: Record<string, number> = {}
  history.forEach((order: OrderHistory) => {
    const date = new Date(order.order_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    dailyProfits[date] = (dailyProfits[date] || 0) + order.calculated_profit
  })

  const chartData = Object.entries(dailyProfits).map(([date, profit]) => ({
    date,
    profit: Math.round(profit)
  }))

  const maxProfit = Math.max(...chartData.map(d => d.profit), 1)

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">Profit & Cost Analytics</h1>
          <p className="mt-1 sm:mt-2 text-xs sm:text-sm md:text-base text-gray-600">Track historical profit and monthly summaries</p>
        </div>

        {/* Month/Year Filter */}
        <div className="bg-white rounded-lg shadow p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 md:mb-8">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-900 mb-1 sm:mb-2">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded px-2 sm:px-3 py-2 text-xs sm:text-sm font-bold text-gray-900"
              >
                {months.map((month, idx) => (
                  <option key={idx} value={idx + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-900 mb-1 sm:mb-2">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded px-2 sm:px-3 py-2 text-xs sm:text-sm font-bold text-gray-900"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2 md:col-span-2 flex items-end">
              <p className="text-xs sm:text-sm text-gray-600">
                {months[selectedMonth - 1]} {selectedYear}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {analytics && !analyticsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8">
            <div className="bg-white rounded-lg shadow p-3 sm:p-4 md:p-6">
              <p className="text-gray-600 text-xs sm:text-xs md:text-sm">Total Revenue</p>
              <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-blue-600 mt-1 sm:mt-2">
                {formatCurrency(analytics.total_revenue)}
              </p>
              <p className="text-xs text-gray-500 mt-1 sm:mt-2">{analytics.order_count} orders</p>
            </div>

            <div className="bg-white rounded-lg shadow p-3 sm:p-4 md:p-6">
              <p className="text-gray-600 text-xs sm:text-xs md:text-sm">Total Cost</p>
              <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-red-600 mt-1 sm:mt-2">
                {formatCurrency(analytics.total_cost)}
              </p>
              <p className="text-xs text-gray-500 mt-1 sm:mt-2">Ingredient costs</p>
            </div>

            <div className="bg-white rounded-lg shadow p-3 sm:p-4 md:p-6">
              <p className="text-gray-600 text-xs sm:text-xs md:text-sm">Net Profit</p>
              <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-green-600 mt-1 sm:mt-2">
                {formatCurrency(analytics.net_profit)}
              </p>
              <p className="text-xs text-gray-500 mt-1 sm:mt-2">Revenue - Cost</p>
            </div>

            <div className="bg-white rounded-lg shadow p-3 sm:p-4 md:p-6">
              <p className="text-gray-600 text-xs sm:text-xs md:text-sm">Avg Margin</p>
              <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-purple-600 mt-1 sm:mt-2">
                {formatNumber(analytics.avg_margin)}%
              </p>
              <p className="text-xs text-gray-500 mt-1 sm:mt-2">Average margin</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-8 mb-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-2 text-gray-600 text-sm">Loading analytics...</p>
          </div>
        )}

        {/* Daily Profit Chart */}
        {chartData.length > 0 && (
          <div className="bg-white rounded-lg shadow p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 md:mb-8">
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Daily Profit Trend</h2>
            <div className="overflow-x-auto">
              <div className="flex items-end gap-1 sm:gap-2 h-48 min-w-full">
                {chartData.map((data, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center">
                    <div className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t" style={{
                      height: `${(data.profit / maxProfit) * 100}%`,
                      minHeight: data.profit > 0 ? '4px' : '0px'
                    }}></div>
                    <p className="text-xs text-gray-600 mt-2 text-center truncate">{data.date}</p>
                    <p className="text-xs font-bold text-gray-900">{formatCurrency(data.profit)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Order History Table */}
        <div className="bg-white rounded-lg shadow p-3 sm:p-4 md:p-6">
          <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Order History</h2>

          {historyLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="mt-2 text-gray-600 text-sm">Loading orders...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-sm">No completed orders found for this period.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-3 sm:px-4 font-semibold text-black text-sm">Order ID</th>
                      <th className="text-left py-3 px-3 sm:px-4 font-semibold text-black text-sm">Customer</th>
                      <th className="text-left py-3 px-3 sm:px-4 font-semibold text-black text-sm">Items</th>
                      <th className="text-left py-3 px-3 sm:px-4 font-semibold text-black text-sm">Revenue</th>
                      <th className="text-left py-3 px-3 sm:px-4 font-semibold text-black text-sm">Cost</th>
                      <th className="text-left py-3 px-3 sm:px-4 font-semibold text-black text-sm">Profit</th>
                      <th className="text-left py-3 px-3 sm:px-4 font-semibold text-black text-sm">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((order: OrderHistory) => (
                      <tr key={order.order_id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-3 sm:px-4 text-black font-bold text-sm">#{order.order_id}</td>
                        <td className="py-3 px-3 sm:px-4 text-gray-600 text-sm">{order.customer_name}</td>
                        <td className="py-3 px-3 sm:px-4 text-gray-600 text-sm text-xs">{order.items_summary}</td>
                        <td className="py-3 px-3 sm:px-4 text-gray-600 font-bold text-sm">{formatCurrency(order.total_amount)}</td>
                        <td className="py-3 px-3 sm:px-4 text-gray-600 font-bold text-sm">{formatCurrency(order.total_cost)}</td>
                        <td className="py-3 px-3 sm:px-4 text-green-600 font-bold text-sm">{formatCurrency(order.calculated_profit)}</td>
                        <td className="py-3 px-3 sm:px-4 text-gray-600 font-bold text-sm">{formatNumber(order.profit_margin)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3 sm:space-y-4">
                {history.map((order: OrderHistory) => (
                  <div key={order.order_id} className="bg-white border-l-4 border-indigo-600 rounded-lg p-3 sm:p-4">
                    <div className="flex justify-between items-start mb-2 sm:mb-3">
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-black">Order #{order.order_id}</h3>
                        <p className="text-xs sm:text-sm text-gray-600">{order.customer_name}</p>
                      </div>
                      <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                        {formatCurrency(order.calculated_profit)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2 sm:mb-3">{order.items_summary}</p>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 bg-gray-50 p-2 sm:p-3 rounded">
                      <div>
                        <p className="text-xs text-gray-700 font-bold">Revenue</p>
                        <p className="text-black font-bold text-sm">{formatCurrency(order.total_amount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-700 font-bold">Cost</p>
                        <p className="text-black font-bold text-sm">{formatCurrency(order.total_cost)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-700 font-bold">Profit</p>
                        <p className="text-green-600 font-bold text-sm">{formatCurrency(order.calculated_profit)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-700 font-bold">Margin</p>
                        <p className="text-black font-bold text-sm">{formatNumber(order.profit_margin)}%</p>
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
