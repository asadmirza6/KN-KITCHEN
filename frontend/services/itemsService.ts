/**
 * Items service for fetching and managing menu items.
 */

import axios from '@/lib/axios'
import type { Item, CreateItemRequest, UpdateItemRequest } from '@/types/Item'


/**
 * Fetch all menu items
 */
export async function fetchItems(): Promise<Item[]> {
  const response = await axios.get<Item[]>('/items')
  return response.data
}


/**
 * Create a new item (Admin only - will be implemented in Phase 5)
 */
export async function createItem(data: CreateItemRequest): Promise<Item> {
  const formData = new FormData()

  formData.append('name', data.name)
  formData.append('price_per_kg', data.price_per_kg)

  if (data.image) {
    formData.append('image', data.image)
  }

  const response = await axios.post<Item>('/items', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data
}


/**
 * Update an existing item (Admin only - will be implemented in Phase 5)
 */
export async function updateItem(itemId: number, data: UpdateItemRequest): Promise<Item> {
  const formData = new FormData()

  if (data.name) {
    formData.append('name', data.name)
  }
  if (data.price_per_kg) {
    formData.append('price_per_kg', data.price_per_kg)
  }
  if (data.image) {
    formData.append('image', data.image)
  }

  const response = await axios.patch<Item>(`/items/${itemId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data
}


/**
 * Delete an item (Admin only - will be implemented in Phase 5)
 */
export async function deleteItem(itemId: number): Promise<void> {
  await axios.delete(`/items/${itemId}`)
}
