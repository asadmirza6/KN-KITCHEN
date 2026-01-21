/**
 * MediaAsset interface matching backend MediaAsset model.
 * Represents uploaded media (banners, gallery images).
 */

export type MediaType = 'banner' | 'gallery' | 'item'

export interface MediaAsset {
  id: number
  type: MediaType
  title: string | null
  image_url: string
  is_active: boolean
  created_at: string // ISO 8601 datetime string
}

/**
 * DTO for uploading media
 */
export interface UploadMediaRequest {
  type: MediaType
  title?: string
  image: File // File object for upload
}

/**
 * DTO for fetching media by type
 */
export interface FetchMediaParams {
  type?: MediaType
  active_only?: boolean
}
