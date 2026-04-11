/**
 * Recipe Types
 * Defines TypeScript interfaces for recipe management
 */

export interface Recipe {
  id: number
  product_id: number
  product_name: string
  ingredient_id: number
  ingredient_name: string
  ingredient_unit: string
  quantity_required: number
}

export interface CreateRecipeRequest {
  product_id: number
  ingredient_id: number
  quantity_required: number
}

export interface UpdateRecipeRequest {
  quantity_required: number
}
