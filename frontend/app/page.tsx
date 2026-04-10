'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from '@/lib/axios'
import BannerSlider from '@/components/BannerSlider'
import Gallery from '@/components/Gallery'
import MenuItems from '@/components/MenuItems'
import type { Package } from '@/types/Package'

export default function Home() {
  const router = useRouter()
  const [packages, setPackages] = useState<Package[]>([])
  const [packagesLoading, setPackagesLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Backend pre-warming: wake up Render free-tier on app load
  useEffect(() => {
    const warmupBackend = async () => {
      try {
        // Send a simple GET request to backend root to trigger spin-up
        await axios.get('/', { timeout: 5000 })
      } catch (error) {
        // Silently fail - this is just a warmup request
        console.debug('Backend warmup request completed')
      }
    }

    warmupBackend()
  }, [])

  // Fetch packages
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        setPackagesLoading(true)
        const response = await axios.get('/packages/')
        setPackages(response.data)
      } catch (error) {
        console.error('Failed to fetch packages:', error)
        setPackages([])
      } finally {
        setPackagesLoading(false)
      }
    }

    if (mounted) {
      fetchPackages()
    }
  }, [mounted])

  return (
    <main className="min-h-screen bg-transparent">
      {/* Hero Section - Banner Slider */}
      <BannerSlider />

      {/* Special Packages Section */}
      {mounted && (
        <section id="packages" className="py-16 bg-transparent">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Special Packages</h2>

            {packagesLoading ? (
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                <p className="mt-4 text-gray-600">Loading packages...</p>
              </div>
            ) : packages.length === 0 ? (
              <div className="text-center text-gray-500">
                <p>No special packages available at the moment.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    onClick={() => router.push(`/packages/${pkg.id}`)}
                    className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer overflow-hidden"
                  >
                    {/* Image */}
                    <div className="aspect-square overflow-hidden bg-gray-200">
                      {pkg.image_url ? (
                        <img
                          src={pkg.image_url}
                          alt={pkg.name}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 0 1 2.828 0L16 16m-2-2l1.586-1.586a2 2 0 0 1 2.828 0L20 14m-6-6h.01M6 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-2">{pkg.name}</h3>
                      {pkg.description && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                          {pkg.description}
                        </p>
                      )}
                      {pkg.validity && (
                        <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {pkg.validity}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Menu Items Section */}
      <MenuItems />

      {/* Gallery Section */}
      <Gallery />

      {/* About Section - Transparent background to show watermark */}
      <section id="about" className="py-16 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">About Us</h2>
          <p className="text-center text-gray-600 max-w-3xl mx-auto">
            KN KITCHEN is a professional catering service providing delicious food for all occasions.
            With years of experience and a commitment to quality, we bring excellence to every event.
          </p>
        </div>
      </section>

      {/* Contact Section - Transparent background to show watermark */}
      <section id="contact" className="py-16 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">Contact Us</h2>
          <div className="text-center">
            <p className="text-gray-600 mb-2">📞 Phone: +91 1234567890</p>
            <p className="text-gray-600 mb-2">📧 Email: contact@knkitchen.com</p>
            <p className="text-gray-600">📍 Address: Your Location Here</p>
          </div>
        </div>
      </section>

      {/* Feedback Section - Transparent background to show watermark */}
      <section id="feedback" className="py-16 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">Feedback</h2>
          <p className="text-center text-gray-600 max-w-3xl mx-auto">
            We value your feedback! Please share your experience with us to help us improve our services.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="mb-2">&copy; 2026 KN KITCHEN. All rights reserved.</p>
          <p className="text-sm text-gray-400">Professional Catering Management System</p>
        </div>
      </footer>
    </main>
  )
}
