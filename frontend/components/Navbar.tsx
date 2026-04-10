'use client'

/**
 * Responsive navigation bar component.
 * Shows logo, navigation links, and login/logout button.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated, getCurrentUser, logout } from '@/services/authService'
import type { User } from '@/types/User'


export default function Navbar() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (isAuthenticated()) {
      setUser(getCurrentUser())
    }
  }, [])

  const handleLogout = async () => {
    await logout()
    setUser(null)
    router.push('/')
    router.refresh()
  }

  const handleLogin = () => {
    router.push('/login')
  }

  return (
    <nav className="sticky top-0 z-50 bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <a href="/" className="flex items-center gap-2">
              <img
                src="/images/logo.jpeg"
                alt="KN KITCHEN Logo"
                className="h-12 w-auto object-contain"
              />
              <span className="text-2xl font-bold text-indigo-600 hidden sm:block">
                KN KITCHEN
              </span>
            </a>
          </div>

          {/* Navigation Links (Center) */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            <a
              href="/"
              className="text-gray-700 hover:text-indigo-600 px-3 py-2 text-sm font-medium transition-colors"
            >
              HOME
            </a>
            <a
              href="#packages"
              className="text-gray-700 hover:text-indigo-600 px-3 py-2 text-sm font-medium transition-colors"
            >
              PACKAGES
            </a>
            <a
              href="#about"
              className="text-gray-700 hover:text-indigo-600 px-3 py-2 text-sm font-medium transition-colors"
            >
              ABOUT
            </a>
            <a
              href="#gallery"
              className="text-gray-700 hover:text-indigo-600 px-3 py-2 text-sm font-medium transition-colors"
            >
              GALLERY
            </a>
            <a
              href="#contact"
              className="text-gray-700 hover:text-indigo-600 px-3 py-2 text-sm font-medium transition-colors"
            >
              CONTACT
            </a>
            <a
              href="#feedback"
              className="text-gray-700 hover:text-indigo-600 px-3 py-2 text-sm font-medium transition-colors"
            >
              FEEDBACK
            </a>
          </div>

          {/* Login/Logout Button (Right) */}
          <div className="flex items-center space-x-4">
            {mounted && user ? (
              <>
                {user.role === 'ADMIN' && (
                  <a
                    href="/admin"
                    className="text-gray-700 hover:text-indigo-600 px-3 py-2 text-sm font-medium transition-colors"
                  >
                    Admin Panel
                  </a>
                )}
                <span className="text-sm text-gray-700">
                  Welcome, <span className="font-medium">{user.name}</span>
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Logout
                </button>
              </>
            ) : mounted ? (
              <button
                onClick={handleLogin}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Login
              </button>
            ) : (
              <div className="w-20 h-10 bg-gray-200 rounded-md animate-pulse" />
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mounted && (
        <div className="md:hidden border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <a
              href="/"
              className="block text-gray-700 hover:text-indigo-600 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium"
            >
              HOME
            </a>
            <a
              href="#packages"
              className="block text-gray-700 hover:text-indigo-600 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium"
            >
              PACKAGES
            </a>
            <a
              href="#about"
              className="block text-gray-700 hover:text-indigo-600 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium"
            >
              ABOUT
            </a>
            <a
              href="#gallery"
              className="block text-gray-700 hover:text-indigo-600 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium"
            >
              GALLERY
            </a>
            <a
              href="#contact"
              className="block text-gray-700 hover:text-indigo-600 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium"
            >
              CONTACT
            </a>
            <a
              href="#feedback"
              className="block text-gray-700 hover:text-indigo-600 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium"
            >
              FEEDBACK
            </a>
            {user && user.role === 'ADMIN' && (
              <a
                href="/admin"
                className="block text-gray-700 hover:text-indigo-600 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium"
              >
                Admin Panel
              </a>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
