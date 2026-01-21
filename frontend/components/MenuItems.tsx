'use client'

/**
 * Menu items component displaying available catering items.
 * Shows item name and image only for public users (no prices, no order buttons).
 */

import { useEffect, useState } from 'react'
import { fetchItems } from '@/services/itemsService'
import type { Item } from '@/types/Item'


export default function MenuItems() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadItems()
  }, [])

  const loadItems = async () => {
    try {
      const data = await fetchItems()
      setItems(data)
    } catch (err: any) {
      console.error('Failed to load items:', err)
      setError('Failed to load menu items')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Our Menu</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-gray-200 animate-pulse rounded-lg h-64"></div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Our Menu</h2>
          <p className="text-center text-red-600">{error}</p>
        </div>
      </section>
    )
  }

  if (items.length === 0) {
    return (
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Our Menu</h2>
          <p className="text-center text-gray-600">Menu items coming soon!</p>
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Our Menu</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden"
            >
              {/* Item Image */}
              {item.image_url ? (
                <div className="aspect-square relative overflow-hidden">
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_URL}${item.image_url}`}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-square bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                  <p className="text-gray-500 text-sm">No image</p>
                </div>
              )}

              {/* Item Details */}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 text-center">{item.name}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
