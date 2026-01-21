/**
 * Media service for fetching and managing banners and gallery images.
 */

import axios from '@/lib/axios'
import type { MediaAsset, UploadMediaRequest, FetchMediaParams } from '@/types/MediaAsset'


/**
 * Fetch media assets, optionally filtered by type
 */
export async function fetchMedia(params?: FetchMediaParams): Promise<MediaAsset[]> {
  const queryParams = new URLSearchParams()

  if (params?.type) {
    queryParams.append('type', params.type)
  }

  const url = `/media${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
  const response = await axios.get<MediaAsset[]>(url)

  return response.data
}


/**
 * Fetch banners (convenience method)
 */
export async function fetchBanners(): Promise<MediaAsset[]> {
  return fetchMedia({ type: 'banner' })
}


/**
 * Fetch gallery images (convenience method)
 */
export async function fetchGallery(): Promise<MediaAsset[]> {
  return fetchMedia({ type: 'gallery' })
}


/**
 * Upload a new media asset (Admin only)
 */
export async function uploadMedia(data: UploadMediaRequest): Promise<MediaAsset> {
  const formData = new FormData()

  formData.append('type', data.type)
  if (data.title) {
    formData.append('title', data.title)
  }
  formData.append('image', data.image)

  const response = await axios.post<MediaAsset>('/media/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data
}


/**
 * Toggle active status of a media asset (Admin only)
 */
export async function toggleActive(mediaId: number): Promise<MediaAsset> {
  const response = await axios.patch<MediaAsset>(`/media/${mediaId}/toggle-active`)
  return response.data
}


/**
 * Delete a media asset (Admin only)
 */
export async function deleteMedia(mediaId: number): Promise<void> {
  await axios.delete(`/media/${mediaId}`)
}
