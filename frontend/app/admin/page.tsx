'use client'

/**
 * Admin Dashboard - Main Layout with Sidebar
 * Redirects to admin home with sidebar navigation
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated, getCurrentUser } from '@/services/authService'

export default function AdminDashboard() {
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }

    const currentUser = getCurrentUser()
    if (currentUser?.role !== 'ADMIN') {
      router.push('/')
      return
    }

    // Redirect to home page
    router.push('/admin/home')
  }, [router])

  return null
}
