/**
 * Recipe Service
 * Handles API calls for recipe management
 */

import axios from '@/lib/axios'
import type { Recipe, CreateRecipeRequest, UpdateRecipeRequest } from '@/types/Recipe'

export const recipeService = {
  /**
   * Fetch all recipes
   */
  async fetchRecipes(): Promise<Recipe[]> {
    try {
      const response = await axios.get('/recipes')
      return response.data
    } catch (error) {
      console.error('Error fetching recipes:', error)
      throw error
    }
  },

  /**
   * Get a single recipe by ID
   */
  async getRecipe(id: number): Promise<Recipe> {
    try {
      const response = await axios.get(`/recipes/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching recipe ${id}:`, error)
      throw error
    }
  },

  /**
   * Get all recipes for a specific product
   */
  async getRecipesByProduct(productId: number): Promise<Recipe[]> {
    try {
      const response = await axios.get(`/recipes/product/${productId}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching recipes for product ${productId}:`, error)
      throw error
    }
  },

  /**
   * Create a new recipe
   */
  async createRecipe(data: CreateRecipeRequest): Promise<Recipe> {
    try {
      const formData = new FormData()
      formData.append('product_id', data.product_id.toString())
      formData.append('ingredient_id', data.ingredient_id.toString())
      formData.append('quantity_required', data.quantity_required.toString())

      const response = await axios.post('/recipes', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return response.data
    } catch (error) {
      console.error('Error creating recipe:', error)
      throw error
    }
  },

  /**
   * Update a recipe
   */
  async updateRecipe(id: number, data: UpdateRecipeRequest): Promise<Recipe> {
    try {
      const formData = new FormData()
      formData.append('quantity_required', data.quantity_required.toString())

      const response = await axios.put(`/recipes/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return response.data
    } catch (error) {
      console.error(`Error updating recipe ${id}:`, error)
      throw error
    }
  },

  /**
   * Delete a recipe
   */
  async deleteRecipe(id: number): Promise<{ success: boolean; message: string }> {
    try {
      const response = await axios.delete(`/recipes/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error deleting recipe ${id}:`, error)
      throw error
    }
  }
}
