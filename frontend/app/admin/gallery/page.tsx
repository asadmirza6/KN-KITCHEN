'use client'

/**
 * Admin Gallery Management Page - Album Based System
 * Upload and manage photo albums with multiple images
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated, getCurrentUser } from '@/services/authService'
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
  cloudinary_public_id: string | null
  created_at: string
}

export default function AdminGalleryPage() {
  const router = useRouter()
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAlbumForm, setShowAlbumForm] = useState(false)
  const [showImageUpload, setShowImageUpload] = useState(false)
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)

  // Album form state
  const [albumFormData, setAlbumFormData] = useState({
    title: '',
    description: ''
  })

  // Image upload state
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }
    setCurrentUser(getCurrentUser())
    fetchAlbums()
  }, [router])

  const fetchAlbums = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await axios.get('/albums/')
      setAlbums(response.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch albums')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!albumFormData.title) {
      setError('Please provide an album title')
      return
    }

    try {
      await axios.post('/albums/', albumFormData)
      setAlbumFormData({ title: '', description: '' })
      setShowAlbumForm(false)
      await fetchAlbums()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create album')
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setImageFiles(files)

    // Create previews
    const previews: string[] = []
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        previews.push(reader.result as string)
        if (previews.length === files.length) {
          setImagePreviews(previews)
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const handleUploadImages = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedAlbum || imageFiles.length === 0) {
      setError('Please select images to upload')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      imageFiles.forEach((file) => {
        formData.append('images', file)
      })

      await axios.post(`/albums/${selectedAlbum.id}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      // Reset form
      setImageFiles([])
      setImagePreviews([])
      setShowImageUpload(false)
      setSelectedAlbum(null)

      // Refresh albums
      await fetchAlbums()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload images')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteAlbum = async (album: Album) => {
    if (!confirm(`Are you sure you want to delete album "${album.title}" and all its ${album.image_count} images?`)) {
      return
    }

    try {
      await axios.delete(`/albums/${album.id}`)
      await fetchAlbums()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete album')
    }
  }

  const handleDeleteImage = async (albumId: number, imageId: number) => {
    if (!confirm('Are you sure you want to delete this image?')) {
      return
    }

    try {
      await axios.delete(`/albums/${albumId}/images/${imageId}`)
      await fetchAlbums()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete image')
    }
  }

  const openImageUpload = (album: Album) => {
    setSelectedAlbum(album)
    setShowImageUpload(true)
  }

  return (
    <div className="min-h-screen bg-transparent py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <button
            onClick={() => router.push('/admin')}
            className="text-indigo-600 hover:text-indigo-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>

          <button
            onClick={() => setShowAlbumForm(!showAlbumForm)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Album
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Create Album Form */}
        {showAlbumForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Album</h2>

            <form onSubmit={handleCreateAlbum} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Album Title *
                </label>
                <input
                  type="text"
                  value={albumFormData.title}
                  onChange={(e) => setAlbumFormData({ ...albumFormData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., Wedding Event 2026"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Description
                </label>
                <textarea
                  value={albumFormData.description}
                  onChange={(e) => setAlbumFormData({ ...albumFormData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Describe the event or occasion..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
                >
                  Create Album
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAlbumForm(false)
                    setAlbumFormData({ title: '', description: '' })
                  }}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Upload Images Modal */}
        {showImageUpload && selectedAlbum && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Upload Images to "{selectedAlbum.title}"
            </h2>

            <form onSubmit={handleUploadImages} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Multiple Images *
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleImageChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  multiple
                  required
                />
                {imagePreviews.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {imagePreviews.map((preview, index) => (
                      <img
                        key={index}
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={uploading}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? `Uploading ${imageFiles.length} images...` : `Upload ${imageFiles.length} Images`}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowImageUpload(false)
                    setSelectedAlbum(null)
                    setImageFiles([])
                    setImagePreviews([])
                  }}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Albums List */}
        <div className="space-y-6">
          {loading ? (
            <div className="bg-white rounded-lg shadow-lg p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-gray-600">Loading albums...</p>
            </div>
          ) : albums.length === 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-12 text-center text-gray-500">
              <svg
                className="mx-auto h-16 w-16 text-gray-400 mb-4"
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
              <p>No albums yet. Click "Create Album" to add one.</p>
            </div>
          ) : (
            albums.map((album) => (
              <div key={album.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                {/* Album Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{album.title}</h3>
                      {album.description && (
                        <p className="text-sm text-gray-600 mt-1">{album.description}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        {album.image_count} {album.image_count === 1 ? 'image' : 'images'} • Created {new Date(album.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openImageUpload(album)}
                        className="bg-indigo-600 text-white px-3 py-1 text-sm rounded hover:bg-indigo-700"
                      >
                        Add Images
                      </button>
                      {currentUser?.role === 'ADMIN' && (
                        <button
                          onClick={() => handleDeleteAlbum(album)}
                          className="bg-red-600 text-white px-3 py-1 text-sm rounded hover:bg-red-700"
                        >
                          Delete Album
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Album Images Grid */}
                {album.images.length > 0 ? (
                  <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {album.images.map((image) => (
                      <div key={image.id} className="relative group">
                        <img
                          src={image.image_url}
                          alt="Gallery image"
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        {currentUser?.role === 'ADMIN' && (
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-opacity flex items-center justify-center rounded-lg">
                            <button
                              onClick={() => handleDeleteImage(album.id, image.id)}
                              className="opacity-0 group-hover:opacity-100 bg-red-600 text-white px-2 py-1 text-xs rounded hover:bg-red-700 transition-opacity"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500 text-sm">
                    No images in this album yet. Click "Add Images" to upload.
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
