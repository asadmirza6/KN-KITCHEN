/**
 * Profit Summary Component
 * Displays profit analytics for today, this week, and all-time
 */

'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { isAuthenticated, getCurrentUser } from '@/services/authService'
import { swrFetcher, swrConfig } from '@/lib/swr'

interface ProfitData {
  today: {
    orders_count: number
    revenue: number
    cost: number
    profit: number
    margin: number
  }
  this_week: {
    orders_count: number
    revenue: number
    cost: number
    profit: number
    margin: number
  }
  all_time: {
    orders_count: number
    revenue: number
    profit: number
    avg_profit_per_order: number
  }
}

export default function ProfitSummary() {
  const [mounted, setMounted] = useState(false)

  const { data: profitData, isLoading: profitLoading } = useSWR<ProfitData>(
    isAuthenticated() && getCurrentUser()?.role === 'ADMIN' ? '/orders/profit/summary' : null,
    swrFetcher,
    swrConfig
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || profitLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    )
  }

  if (!profitData) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-500 text-center">No profit data available yet</p>
        </div>
      </div>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 2,
    }).format(value)
  }

  return (
    <div className="space-y-6">
      {/* Today's Profit */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-green-100 text-sm font-medium mb-1">Today's Profit</p>
            <p className="text-4xl font-bold">{formatCurrency(profitData.today.profit)}</p>
            <p className="text-green-100 text-sm mt-2">
              {profitData.today.orders_count} order(s) • {profitData.today.margin.toFixed(1)}% margin
            </p>
          </div>
          <div className="flex items-center justify-center w-16 h-16 bg-white bg-opacity-20 rounded-full">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <p className="text-green-100">Revenue</p>
            <p className="font-bold">{formatCurrency(profitData.today.revenue)}</p>
          </div>
          <div>
            <p className="text-green-100">Cost</p>
            <p className="font-bold">{formatCurrency(profitData.today.cost)}</p>
          </div>
          <div>
            <p className="text-green-100">Margin</p>
            <p className="font-bold">{profitData.today.margin.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* This Week & All-Time */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* This Week */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-600">This Week</p>
          </div>
          <p className="text-3xl font-bold text-black mb-2">{formatCurrency(profitData.this_week.profit)}</p>
          <p className="text-xs text-gray-500 mb-3">
            {profitData.this_week.orders_count} order(s) • {profitData.this_week.margin.toFixed(1)}% margin
          </p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Revenue:</span>
              <span className="font-bold text-black">{formatCurrency(profitData.this_week.revenue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Cost:</span>
              <span className="font-bold text-black">{formatCurrency(profitData.this_week.cost)}</span>
            </div>
          </div>
        </div>

        {/* All-Time */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-sm text-gray-600">All-Time</p>
          </div>
          <p className="text-3xl font-bold text-black mb-2">{formatCurrency(profitData.all_time.profit)}</p>
          <p className="text-xs text-gray-500 mb-3">
            {profitData.all_time.orders_count} order(s) completed
          </p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Revenue:</span>
              <span className="font-bold text-black">{formatCurrency(profitData.all_time.revenue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Avg per Order:</span>
              <span className="font-bold text-black">{formatCurrency(profitData.all_time.avg_profit_per_order)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
