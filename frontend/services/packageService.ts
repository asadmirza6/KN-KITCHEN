/**
 * Package API service
 * Handles all package-related API calls
 */

import axios from '@/lib/axios'
import type { Package, CreatePackageRequest, UpdatePackageRequest } from '@/types/Package'

/**
 * Fetch all packages
 */
export async function fetchPackages(): Promise<Package[]> {
  try {
    const response = await axios.get('/packages/')
    return response.data
  } catch (error) {
    console.error('Failed to fetch packages:', error)
    throw error
  }
}

/**
 * Get a single package by ID
 */
export async function getPackage(id: number): Promise<Package> {
  try {
    const response = await axios.get(`/packages/${id}`)
    return response.data
  } catch (error) {
    console.error(`Failed to fetch package ${id}:`, error)
    throw error
  }
}

/**
 * Create a new package with optional image upload
 */
export async function createPackage(data: CreatePackageRequest): Promise<Package> {
  try {
    const formData = new FormData()
    formData.append('name', data.name)
    if (data.description) formData.append('description', data.description)
    if (data.validity) formData.append('validity', data.validity)
    if (data.image) formData.append('image', data.image)

    const response = await axios.post('/packages/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  } catch (error) {
    console.error('Failed to create package:', error)
    throw error
  }
}

/**
 * Update an existing package
 */
export async function updatePackage(id: number, data: UpdatePackageRequest): Promise<Package> {
  try {
    const formData = new FormData()
    if (data.name) formData.append('name', data.name)
    if (data.description) formData.append('description', data.description)
    if (data.validity) formData.append('validity', data.validity)
    if (data.image) formData.append('image', data.image)

    const response = await axios.put(`/packages/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  } catch (error) {
    console.error(`Failed to update package ${id}:`, error)
    throw error
  }
}

/**
 * Delete a package
 */
export async function deletePackage(id: number): Promise<{ success: boolean; message: string }> {
  try {
    const response = await axios.delete(`/packages/${id}`)
    return response.data
  } catch (error) {
    console.error(`Failed to delete package ${id}:`, error)
    throw error
  }
}
