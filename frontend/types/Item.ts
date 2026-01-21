/**
 * Item interface matching backend Item model.
 * Represents menu items available for catering orders.
 */

export interface Item {
  id: number
  name: string
  price_per_kg: string // Decimal as string (e.g., "250.00")
  image_url: string | null
  created_at: string // ISO 8601 datetime string
}

/**
 * DTO for creating a new item
 */
export interface CreateItemRequest {
  name: string
  price_per_kg: string // Decimal as string
  image?: File // File object for upload
}

/**
 * DTO for updating an existing item
 */
export interface UpdateItemRequest {
  name?: string
  price_per_kg?: string
  image?: File // New image file (optional)
}
