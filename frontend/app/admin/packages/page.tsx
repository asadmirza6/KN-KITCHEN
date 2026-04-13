'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { isAuthenticated, getCurrentUser } from '@/services/authService'
import axios from '@/lib/axios'
import { swrFetcher, swrConfig } from '@/lib/swr'
import {
  fetchPackages,
  createPackage,
  updatePackage,
  deletePackage
} from '@/services/packageService'
import type { Package } from '@/types/Package'

interface PackageFormData {
  name: string
  description: string
  validity: string
  image: File | null
}

export default function AdminPackagesPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formError, setFormError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const { data: packages = [], error: packagesError, isLoading: packagesLoading, mutate: mutatePackages } = useSWR(
    isAuthenticated() && getCurrentUser()?.role === 'ADMIN' ? '/packages/' : null,
    swrFetcher,
    swrConfig
  )

  const [formData, setFormData] = useState<PackageFormData>({
    name: '',
    description: '',
    validity: '',
    image: null
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }
    const user = getCurrentUser()
    if (user?.role !== 'ADMIN') {
      router.push('/admin')
    }
  }, [router])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData({ ...formData, image: file })
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleEditPackage = (pkg: Package) => {
    setEditingId(pkg.id)
    setFormData({
      name: pkg.name,
      description: pkg.description || '',
      validity: pkg.validity || '',
      image: null
    })
    setImagePreview(pkg.image_url)
    setShowForm(true)
    setFormError('')
  }

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setSuccess('')
    setSubmitting(true)

    try {
      if (!formData.name.trim()) {
        throw new Error('Package name is required')
      }

      const payload = {
        name: formData.name,
        description: formData.description,
        validity: formData.validity,
        image: formData.image || undefined
      }

      if (editingId) {
        await updatePackage(editingId, payload)
        setSuccess('Package updated successfully!')
      } else {
        await createPackage(payload)
        setSuccess('Package created successfully!')
      }

      setFormData({ name: '', description: '', validity: '', image: null })
      setImagePreview(null)
      setEditingId(null)
      setShowForm(false)
      mutatePackages()
    } catch (err: any) {
      setFormError(err.message || 'Failed to save package')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeletePackage = async (pkg: Package) => {
    if (!confirm(`Delete package "${pkg.name}"?`)) return

    try {
      await deletePackage(pkg.id)
      setSuccess('Package deleted successfully!')
      mutatePackages()
    } catch (err: any) {
      setFormError(err.message || 'Failed to delete package')
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setFormData({ name: '', description: '', validity: '', image: null })
    setImagePreview(null)
    setEditingId(null)
    setFormError('')
  }

  if (!mounted) {
    return <div className="p-10 text-center text-black font-bold">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-transparent p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <button
            onClick={() => router.push('/admin')}
            className="text-indigo-600 font-bold hover:text-indigo-800"
          >
            ← Back
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full md:w-auto bg-indigo-600 text-white px-4 py-2 rounded font-bold hover:bg-indigo-700"
          >
            {showForm ? 'Close' : '+ New Package'}
          </button>
        </div>

        <h1 className="text-3xl font-bold mb-6 text-black">Packages Management</h1>

        {/* Error/Success Messages */}
        {formError && (
          <div className="bg-red-100 text-red-900 p-4 rounded mb-4 font-bold">
            {formError}
          </div>
        )}
        {success && (
          <div className="bg-green-100 text-green-900 p-4 rounded mb-4 font-bold">
            {success}
          </div>
        )}

        {/* Create/Edit Form */}
        {showForm && (
          <div className="bg-white shadow rounded-lg p-4 md:p-6 mb-6">
            <h2 className="text-xl md:text-2xl font-bold mb-4 text-black">
              {editingId ? 'Edit Package' : 'Create New Package'}
            </h2>

            <form onSubmit={handleCreateOrUpdate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-black mb-1">
                    Package Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Wedding Package"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="border p-2 rounded w-full text-black font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-1">
                    Validity
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Valid until Dec 31, 2026"
                    value={formData.validity}
                    onChange={(e) => setFormData({ ...formData, validity: e.target.value })}
                    className="border p-2 rounded w-full text-black font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-black mb-1">
                  Description
                </label>
                <textarea
                  placeholder="Package description..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="border p-2 rounded w-full text-black font-bold"
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-black mb-1">
                  Package Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="border p-2 rounded w-full text-black font-bold"
                />
                {imagePreview && (
                  <div className="mt-2">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingId ? 'Update Package' : 'Create Package'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-gray-400 text-white px-4 py-2 rounded font-bold hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Packages Table */}
        <div className="bg-white shadow rounded-lg p-4 md:p-6">
          <h2 className="text-xl font-bold mb-4 text-black">Packages</h2>

          {!mounted || packagesLoading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-gray-600">Loading packages...</p>
            </div>
          ) : packages.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p>No packages found. Click "+ New Package" to add one.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-black">Image</th>
                      <th className="text-left py-3 px-4 font-semibold text-black">Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-black">Description</th>
                      <th className="text-left py-3 px-4 font-semibold text-black">Validity</th>
                      <th className="text-left py-3 px-4 font-semibold text-black">Created</th>
                      <th className="text-left py-3 px-4 font-semibold text-black">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {packages.map((pkg) => (
                      <tr key={pkg.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          {pkg.image_url ? (
                            <img
                              src={pkg.image_url}
                              alt={pkg.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                              <span className="text-xs text-gray-500">No image</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-black font-bold">{pkg.name}</td>
                        <td className="py-3 px-4 text-gray-600 text-sm">
                          {pkg.description ? pkg.description.substring(0, 50) + '...' : '-'}
                        </td>
                        <td className="py-3 px-4 text-gray-600 text-sm">{pkg.validity || '-'}</td>
                        <td className="py-3 px-4 text-gray-600 text-sm">
                          {new Date(pkg.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditPackage(pkg)}
                              className="bg-blue-500 text-white px-3 py-1 rounded text-sm font-bold hover:bg-blue-600"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeletePackage(pkg)}
                              className="bg-red-500 text-white px-3 py-1 rounded text-sm font-bold hover:bg-red-600"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4">
                {packages.map((pkg) => (
                  <div key={pkg.id} className="bg-white border-l-4 border-indigo-600 rounded-lg p-4">
                    <div className="flex gap-3 mb-3">
                      {pkg.image_url ? (
                        <img
                          src={pkg.image_url}
                          alt={pkg.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                          <span className="text-xs text-gray-500">No image</span>
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-black">{pkg.name}</h3>
                        <p className="text-xs text-gray-600 mt-1">
                          Created {new Date(pkg.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded mb-3 space-y-2">
                      <div>
                        <p className="text-xs text-gray-700 font-bold">Description</p>
                        <p className="text-sm text-gray-600">{pkg.description || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-700 font-bold">Validity</p>
                        <p className="text-sm text-gray-600">{pkg.validity || '-'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditPackage(pkg)}
                        className="flex-1 bg-blue-500 text-white px-3 py-2 rounded text-sm font-bold hover:bg-blue-600"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeletePackage(pkg)}
                        className="flex-1 bg-red-500 text-white px-3 py-2 rounded text-sm font-bold hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
