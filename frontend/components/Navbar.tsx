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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  return (
    <nav className="sticky top-0 z-50 bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
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

          {/* Navigation Links (Center) - Desktop Only */}
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

          {/* Right Section - Desktop */}
          <div className="hidden md:flex md:items-center md:space-x-4">
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

          {/* Hamburger Menu - Mobile Only */}
          <div className="md:hidden flex items-center space-x-2">
            {mounted && user && user.role === 'ADMIN' && (
              <a
                href="/admin"
                className="text-gray-700 hover:text-indigo-600 px-2 py-1 text-xs font-medium transition-colors"
              >
                Admin
              </a>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-indigo-600 hover:bg-gray-100 focus:outline-none transition-colors"
              aria-expanded="false"
            >
              <svg
                className="block h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu - Dropdown */}
      {mounted && mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <a
              href="/"
              onClick={closeMobileMenu}
              className="block text-gray-700 hover:text-indigo-600 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium transition-colors"
            >
              HOME
            </a>
            <a
              href="#packages"
              onClick={closeMobileMenu}
              className="block text-gray-700 hover:text-indigo-600 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium transition-colors"
            >
              PACKAGES
            </a>
            <a
              href="#about"
              onClick={closeMobileMenu}
              className="block text-gray-700 hover:text-indigo-600 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium transition-colors"
            >
              ABOUT
            </a>
            <a
              href="#gallery"
              onClick={closeMobileMenu}
              className="block text-gray-700 hover:text-indigo-600 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium transition-colors"
            >
              GALLERY
            </a>
            <a
              href="#contact"
              onClick={closeMobileMenu}
              className="block text-gray-700 hover:text-indigo-600 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium transition-colors"
            >
              CONTACT
            </a>
            <a
              href="#feedback"
              onClick={closeMobileMenu}
              className="block text-gray-700 hover:text-indigo-600 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium transition-colors"
            >
              FEEDBACK
            </a>

            {/* Mobile Auth Section */}
            <div className="border-t border-gray-200 pt-2 mt-2">
              {user ? (
                <>
                  <div className="px-3 py-2 text-sm text-gray-700 font-medium">
                    Welcome, {user.name}
                  </div>
                  <button
                    onClick={() => {
                      handleLogout()
                      closeMobileMenu()
                    }}
                    className="w-full text-left block text-red-600 hover:text-red-700 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    handleLogin()
                    closeMobileMenu()
                  }}
                  className="w-full text-left block text-indigo-600 hover:text-indigo-700 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium transition-colors"
                >
                  Login
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
