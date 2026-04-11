'use client'

/**
 * Admin Recipe Builder Page
 * Manage recipes by linking menu items to inventory ingredients.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { isAuthenticated, getCurrentUser } from '@/services/authService'
import axios from '@/lib/axios'
import { swrFetcher, swrConfig } from '@/lib/swr'
import { recipeService } from '@/services/recipeService'
import type { User } from '@/types/User'
import type { Item } from '@/types/Item'
import type { Recipe } from '@/types/Recipe'

interface InventoryItem {
  id: number
  item_name: string
  unit: string
  current_stock: number
  average_price: number
}

interface RecipeFormData {
  product_id: number
  ingredient_id: number
  quantity_required: number
}

export default function AdminRecipesPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [mounted, setMounted] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')

  const { data: recipes = [], error: recipesError, isLoading: recipesLoading, mutate: mutateRecipes } = useSWR(
    isAuthenticated() && getCurrentUser()?.role === 'ADMIN' ? '/recipes' : null,
    swrFetcher,
    swrConfig
  )

  const { data: items = [], error: itemsError, isLoading: itemsLoading } = useSWR(
    isAuthenticated() && getCurrentUser()?.role === 'ADMIN' ? '/items' : null,
    swrFetcher,
    swrConfig
  )

  const { data: inventory = [], error: inventoryError, isLoading: inventoryLoading } = useSWR(
    isAuthenticated() && getCurrentUser()?.role === 'ADMIN' ? '/inventory' : null,
    swrFetcher,
    swrConfig
  )

  const [formData, setFormData] = useState<RecipeFormData>({
    product_id: 0,
    ingredient_id: 0,
    quantity_required: 0,
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }
    const currentUser = getCurrentUser()
    if (currentUser?.role !== 'ADMIN') {
      router.push('/admin')
    }
    setUser(currentUser)
  }, [router])

  const handleCreateRecipe = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setSuccess('')
    setSubmitting(true)

    try {
      if (!formData.product_id) {
        throw new Error('Please select a menu item')
      }
      if (!formData.ingredient_id) {
        throw new Error('Please select an ingredient')
      }
      if (formData.quantity_required <= 0) {
        throw new Error('Quantity required must be greater than 0')
      }

      await recipeService.createRecipe({
        product_id: formData.product_id,
        ingredient_id: formData.ingredient_id,
        quantity_required: formData.quantity_required,
      })

      setSuccess('Recipe created successfully!')
      setFormData({ product_id: 0, ingredient_id: 0, quantity_required: 0 })
      setShowForm(false)
      mutateRecipes()
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to create recipe'
      setFormError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteRecipe = async (recipeId: number) => {
    if (!confirm('Are you sure you want to delete this recipe?')) {
      return
    }

    try {
      await recipeService.deleteRecipe(recipeId)
      setSuccess('Recipe deleted successfully!')
      mutateRecipes()
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to delete recipe'
      setFormError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage))
    }
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
            {showForm ? 'Close' : '+ Add Recipe'}
          </button>
        </div>

        <h1 className="text-3xl font-bold mb-6 text-black">Recipe Builder</h1>

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

        {/* Create Form */}
        {showForm && (
          <div className="bg-white shadow rounded-lg p-4 md:p-6 mb-6">
            <h2 className="text-xl md:text-2xl font-bold mb-4 text-black">
              Add New Recipe
            </h2>

            <form onSubmit={handleCreateRecipe} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-black mb-1">
                    Menu Item (Product) *
                  </label>
                  <select
                    value={formData.product_id}
                    onChange={(e) => setFormData({ ...formData, product_id: parseInt(e.target.value) })}
                    className="border p-2 rounded w-full text-black font-bold"
                    required
                  >
                    <option value={0}>Select Menu Item</option>
                    {items.map((item: Item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-1">
                    Ingredient *
                  </label>
                  <select
                    value={formData.ingredient_id}
                    onChange={(e) => setFormData({ ...formData, ingredient_id: parseInt(e.target.value) })}
                    className="border p-2 rounded w-full text-black font-bold"
                    required
                  >
                    <option value={0}>Select Ingredient</option>
                    {inventory.map((inv: InventoryItem) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.item_name} ({inv.unit})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-black mb-1">
                  Quantity Required *
                </label>
                <input
                  type="number"
                  placeholder="e.g., 0.5"
                  value={formData.quantity_required}
                  onChange={(e) => setFormData({ ...formData, quantity_required: parseFloat(e.target.value) || 0 })}
                  className="border p-2 rounded w-full text-black font-bold"
                  step="0.01"
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Recipe'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setFormData({ product_id: 0, ingredient_id: 0, quantity_required: 0 })
                    setFormError('')
                  }}
                  className="bg-gray-400 text-white px-4 py-2 rounded font-bold hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Recipes Table */}
        <div className="bg-white shadow rounded-lg p-4 md:p-6">
          <h2 className="text-xl font-bold mb-4 text-black">Recipes</h2>

          {!mounted || recipesLoading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-gray-600">Loading recipes...</p>
            </div>
          ) : recipes.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p>No recipes found. Click "Add Recipe" to create one.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-black">Menu Item</th>
                    <th className="text-left py-3 px-4 font-semibold text-black">Ingredient</th>
                    <th className="text-left py-3 px-4 font-semibold text-black">Unit</th>
                    <th className="text-left py-3 px-4 font-semibold text-black">Quantity Required</th>
                    <th className="text-left py-3 px-4 font-semibold text-black">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recipes.map((recipe: Recipe) => (
                    <tr key={recipe.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-4 text-black font-bold">{recipe.product_name}</td>
                      <td className="py-3 px-4 text-gray-600">{recipe.ingredient_name}</td>
                      <td className="py-3 px-4 text-gray-600">{recipe.ingredient_unit}</td>
                      <td className="py-3 px-4 text-gray-600">{recipe.quantity_required.toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleDeleteRecipe(recipe.id)}
                          className="text-red-600 font-bold hover:text-red-800"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
