'use client'

/**
 * Admin Layout - Includes Sidebar Navigation
 * Wraps all admin pages with consistent sidebar and breadcrumb
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated, getCurrentUser } from '@/services/authService'
import AdminSidebar from '@/components/AdminSidebar'
import Breadcrumb from '@/components/Breadcrumb'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

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
  }, [router])

  if (!mounted) {
    return null
  }

  return (
    <div className="flex">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <main className="flex-1 ml-64 bg-gray-50 min-h-screen">
        {/* Top Navigation Bar */}
        <div className="bg-white shadow-sm sticky top-0 z-40">
          <div className="px-8 py-4 flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">Admin Panel</h1>
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  localStorage.removeItem('auth_token')
                  localStorage.removeItem('current_user')
                  router.push('/login')
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Breadcrumb and Content */}
        <div className="px-8 py-6">
          <Breadcrumb />
          {children}
        </div>
      </main>
    </div>
  )
}
