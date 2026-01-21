'use client'

/**
 * Gallery component displaying grid of gallery images.
 * Responsive: 3-4 columns on desktop, 1-2 columns on mobile.
 */

import { useEffect, useState } from 'react'
import { fetchGallery } from '@/services/mediaService'
import type { MediaAsset } from '@/types/MediaAsset'


export default function Gallery() {
  const [images, setImages] = useState<MediaAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadGallery()
  }, [])

  const loadGallery = async () => {
    try {
      const data = await fetchGallery()
      setImages(data)
    } catch (err: any) {
      console.error('Failed to load gallery:', err)
      setError('Failed to load gallery images')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <section id="gallery" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Gallery</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-square bg-gray-200 animate-pulse rounded-lg"></div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section id="gallery" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Gallery</h2>
          <p className="text-center text-red-600">{error}</p>
        </div>
      </section>
    )
  }

  if (images.length === 0) {
    return (
      <section id="gallery" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Gallery</h2>
          <p className="text-center text-gray-600">No gallery images available yet.</p>
        </div>
      </section>
    )
  }

  return (
    <section id="gallery" className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Gallery</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {images.map((image) => (
            <div
              key={image.id}
              className="relative aspect-square overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 group"
            >
              <img
                src={`${process.env.NEXT_PUBLIC_API_URL}${image.image_url}`}
                alt={image.title || 'Gallery image'}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
              {image.title && (
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-3 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <p className="text-sm font-medium">{image.title}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
