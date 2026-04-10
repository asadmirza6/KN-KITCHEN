'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import axios from '@/lib/axios'
import type { Package } from '@/types/Package'

export default function PackageDetailPage() {
  const router = useRouter()
  const params = useParams()
  const packageId = params.id as string

  const [pkg, setPkg] = useState<Package | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    loadPackage()
  }, [packageId])

  const loadPackage = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`/packages/${packageId}`)
      setPkg(response.data)
    } catch (err: any) {
      console.error('Failed to load package:', err)
      setError('Failed to load package details')
    } finally {
      setLoading(false)
    }
  }

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-transparent py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Loading package details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !pkg) {
    return (
      <div className="min-h-screen bg-transparent py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p className="font-semibold">{error || 'Package not found'}</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => router.push('/')}
          className="text-indigo-600 hover:text-indigo-700 font-medium mb-8 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </button>

        {/* Package Detail Card */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
            {/* Image Section */}
            <div>
              {pkg.image_url ? (
                <img
                  src={pkg.image_url.startsWith('http') ? pkg.image_url : `${process.env.NEXT_PUBLIC_API_URL}${pkg.image_url}`}
                  alt={pkg.name}
                  className="w-full h-96 object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-96 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center">
                  <svg className="w-24 h-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Details Section */}
            <div className="flex flex-col justify-center">
              {/* Package Name */}
              <h1 className="text-4xl font-bold text-gray-900 mb-6">{pkg.name}</h1>

              {/* Description */}
              <div className="mb-8">
                <p className="text-sm text-slate-600 mb-3">Description</p>
                <p className="text-slate-700 leading-relaxed text-lg">
                  {pkg.description || 'No description available for this package.'}
                </p>
              </div>

              {/* Validity Badge */}
              {pkg.validity && (
                <div className="mb-8">
                  <p className="text-sm text-slate-600 mb-2">Validity</p>
                  <span className="px-4 py-2 inline-flex text-sm leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {pkg.validity}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Back to Home Button */}
        <div className="mt-16">
          <button
            onClick={() => router.push('/')}
            className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}
