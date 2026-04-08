'use client'

/**
 * Admin Banners Management Page
 * Upload and manage homepage banners with Cloudinary
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/services/authService'
import axios from '@/lib/axios'

interface Banner {
  id: number
  type: string
  title: string | null
  image_url: string
  cloudinary_public_id: string | null
  is_active: boolean
  created_at: string
}

export default function AdminBannersPage() {
  const router = useRouter()
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)

  // Upload form state
  const [title, setTitle] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }
    fetchBanners()
  }, [router])

  const fetchBanners = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await axios.get('/media/?type=banner')
      setBanners(response.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch banners')
    } finally {
      setLoading(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!imageFile) {
      setError('Please select an image')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('type', 'banner')
      formData.append('title', title || '')
      formData.append('image', imageFile)

      await axios.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      // Reset form
      setTitle('')
      setImageFile(null)
      setImagePreview(null)
      setShowUpload(false)

      // Refresh banners
      await fetchBanners()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload banner')
    } finally {
      setUploading(false)
    }
  }

  const handleToggleActive = async (banner: Banner) => {
    try {
      await axios.patch(`/media/${banner.id}/toggle-active`)
      await fetchBanners()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to toggle banner status')
    }
  }

  const handleDelete = async (banner: Banner) => {
    if (!confirm(`Are you sure you want to delete this banner${banner.title ? ` "${banner.title}"` : ''}?`)) {
      return
    }

    try {
      await axios.delete(`/media/${banner.id}`)
      await fetchBanners()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete banner')
    }
  }

  const handleCancelUpload = () => {
    setShowUpload(false)
    setTitle('')
    setImageFile(null)
    setImagePreview(null)
    setError(null)
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
            onClick={() => setShowUpload(!showUpload)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload Banner
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Upload Form */}
        {showUpload && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Upload Banner</h2>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title (Optional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., New Year Special Offer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Banner Image * (Recommended: 1920x600px)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleImageChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
                {imagePreview && (
                  <div className="mt-2">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full max-w-2xl h-48 object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={uploading}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading...' : 'Upload Banner'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelUpload}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Banners List */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-4 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Homepage Banners</h2>
              <p className="text-sm text-gray-600 mt-1">
                {banners.length} {banners.length === 1 ? 'banner' : 'banners'} total, {banners.filter(b => b.is_active).length} active
              </p>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-gray-600">Loading banners...</p>
            </div>
          ) : banners.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
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
                  d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                />
              </svg>
              <p>No banners yet. Click "Upload Banner" to add one.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {banners.map((banner) => (
                <div
                  key={banner.id}
                  className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-4 p-4">
                    {/* Banner Preview */}
                    <div className="flex-shrink-0">
                      <img
                        src={banner.image_url}
                        alt={banner.title || 'Banner'}
                        className="w-40 h-24 object-cover rounded"
                      />
                    </div>

                    {/* Banner Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {banner.title || 'Untitled Banner'}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Created {new Date(banner.created_at).toLocaleDateString()}
                      </p>
                      <div className="mt-2">
                        {banner.is_active ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Inactive
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0 flex gap-2">
                      <button
                        onClick={() => handleToggleActive(banner)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${
                          banner.is_active
                            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {banner.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDelete(banner)}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
