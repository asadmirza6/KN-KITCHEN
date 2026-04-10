/**
 * Item interface matching backend Item model.
 * Represents menu items available for catering orders.
 */

export interface Item {
  id: number
  name: string
  description?: string | null
  unit_type?: string
  price_per_kg: string // Decimal as string (e.g., "250.00")
  image_url: string | null
  is_active?: boolean
  created_at: string // ISO 8601 datetime string
}

/**
 * DTO for creating a new item
 */
export interface CreateItemRequest {
  name: string
  description?: string
  price_per_kg: string // Decimal as string
  unit_type?: string
  is_active?: boolean
  image?: File // File object for upload
}

/**
 * DTO for updating an existing item
 */
export interface UpdateItemRequest {
  name?: string
  description?: string
  price_per_kg?: string
  unit_type?: string
  is_active?: boolean
  image?: File // New image file (optional)
}
