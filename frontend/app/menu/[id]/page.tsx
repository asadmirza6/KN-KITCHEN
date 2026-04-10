'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import axios from '@/lib/axios'
import { formatCurrency } from '@/lib/currency'
import type { Item } from '@/types/Item'

export default function MenuItemDetailPage() {
  const router = useRouter()
  const params = useParams()
  const itemId = params.id as string

  const [item, setItem] = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadItem()
  }, [itemId])

  const loadItem = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`/items/${itemId}`)
      setItem(response.data)
    } catch (err: any) {
      console.error('Failed to load item:', err)
      setError('Failed to load item details')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Loading item details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-transparent py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p className="font-semibold">{error || 'Item not found'}</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
          >
            ← Back to Menu
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
          Back to Menu
        </button>

        {/* Item Detail Card */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
            {/* Image Section */}
            <div>
              {item.image_url ? (
                <img
                  src={item.image_url.startsWith('http') ? item.image_url : `${process.env.NEXT_PUBLIC_API_URL}${item.image_url}`}
                  alt={item.name}
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
              {/* Item Name */}
              <h1 className="text-4xl font-bold text-gray-900 mb-4">{item.name}</h1>

              {/* Unit Type */}
              <div className="mb-6">
                <p className="text-sm text-slate-600 mb-2">Unit Type</p>
                <span className="px-4 py-2 inline-flex text-sm leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                  {item.unit_type === 'per_kg' ? 'per KG' : item.unit_type === 'per_piece' ? 'per Piece' : 'per Liter'}
                </span>
              </div>

              {/* Description */}
              <div className="mb-8">
                <p className="text-sm text-slate-600 mb-3">Description</p>
                <p className="text-slate-700 leading-relaxed text-lg">
                  {item.description || 'No description available for this item.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Related Items Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">More Menu Items</h2>
          <button
            onClick={() => router.push('/')}
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            ← Back to Full Menu
          </button>
        </div>
      </div>
    </div>
  )
}
