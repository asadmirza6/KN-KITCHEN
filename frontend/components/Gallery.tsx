'use client'

/**
 * Gallery component displaying albums with images.
 * Album-based organization for better event/occasion grouping.
 */

import { useEffect, useState } from 'react'
import axios from '@/lib/axios'

interface Album {
  id: number
  title: string
  description: string | null
  image_count: number
  images: GalleryImage[]
  created_at: string
}

interface GalleryImage {
  id: number
  image_url: string
  created_at: string
}

export default function Gallery() {
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null)

  useEffect(() => {
    loadAlbums()
  }, [])

  const loadAlbums = async () => {
    try {
      const response = await axios.get('/albums/')
      setAlbums(response.data)
    } catch (err: any) {
      console.error('Failed to load albums:', err)
      setError('Failed to load gallery albums')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <section id="gallery" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Gallery</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-200 animate-pulse rounded-lg h-64"></div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (error || albums.length === 0) {
    return (
      <section id="gallery" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Gallery</h2>
          <p className="text-center text-gray-600">
            {error || 'No gallery albums available yet. Check back soon!'}
          </p>
        </div>
      </section>
    )
  }

  return (
    <section id="gallery" className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Our Gallery</h2>

        {/* Album Modal/Lightbox */}
        {selectedAlbum && (
          <div
            className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedAlbum(null)}
          >
            <div className="max-w-6xl w-full max-h-[90vh] overflow-y-auto bg-white rounded-lg" onClick={(e) => e.stopPropagation()}>
              {/* Album Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-start z-10">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedAlbum.title}</h3>
                  {selectedAlbum.description && (
                    <p className="text-gray-600 mt-2">{selectedAlbum.description}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-2">
                    {selectedAlbum.image_count} {selectedAlbum.image_count === 1 ? 'photo' : 'photos'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedAlbum(null)}
                  className="text-gray-500 hover:text-gray-700 text-3xl font-light leading-none"
                >
                  &times;
                </button>
              </div>

              {/* Album Images */}
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {selectedAlbum.images.map((image) => (
                  <div key={image.id} className="aspect-square overflow-hidden rounded-lg">
                    <img
                      src={image.image_url}
                      alt="Gallery photo"
                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Albums Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {albums.map((album) => (
            <div
              key={album.id}
              className="bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow duration-300"
              onClick={() => setSelectedAlbum(album)}
            >
              {/* Album Cover - First image or placeholder */}
              <div className="aspect-video overflow-hidden bg-gray-200">
                {album.images.length > 0 ? (
                  <img
                    src={album.images[0].image_url}
                    alt={album.title}
                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg
                      className="w-16 h-16 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}
              </div>

              {/* Album Info */}
              <div className="p-4">
                <h3 className="text-lg font-bold text-gray-900 mb-1">{album.title}</h3>
                {album.description && (
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{album.description}</p>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    {album.image_count} {album.image_count === 1 ? 'photo' : 'photos'}
                  </span>
                  <span className="text-indigo-600 font-medium">View Album →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
