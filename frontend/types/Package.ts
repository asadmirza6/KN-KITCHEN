/**
 * Package interface matching backend Package model.
 * Represents special deals/packages available for catering orders.
 */

export interface Package {
  id: number
  name: string
  description?: string | null
  image_url: string | null
  validity?: string | null
  created_at: string // ISO 8601 datetime string
}

/**
 * DTO for creating a new package
 */
export interface CreatePackageRequest {
  name: string
  description?: string
  validity?: string
  image?: File // File object for upload
}

/**
 * DTO for updating an existing package
 */
export interface UpdatePackageRequest {
  name?: string
  description?: string
  validity?: string
  image?: File // New image file (optional)
}
