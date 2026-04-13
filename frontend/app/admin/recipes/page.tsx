'use client'

/**
 * Admin Recipe Builder Page
 * Manage recipes by linking menu items to multiple inventory ingredients.
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

interface IngredientRow {
  id: string
  ingredient_id: number
  quantity_required: number
}

interface RecipeFormData {
  product_id: number
  ingredients: IngredientRow[]
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
    ingredients: [{ id: '1', ingredient_id: 0, quantity_required: 0 }],
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

  // Calculate total cost for all ingredients
  const calculateTotalCost = (): number => {
    return formData.ingredients.reduce((total, ingredient) => {
      const inventoryItem = inventory.find((inv: InventoryItem) => inv.id === ingredient.ingredient_id)
      if (inventoryItem) {
        return total + (ingredient.quantity_required * inventoryItem.average_price)
      }
      return total
    }, 0)
  }

  // Calculate suggested selling price with margin
  const calculateSuggestedPrice = (margin: number): number => {
    const cost = calculateTotalCost()
    return cost > 0 ? cost / (1 - margin / 100) : 0
  }

  const addIngredientRow = () => {
    const newId = String(Math.max(...formData.ingredients.map(i => parseInt(i.id)), 0) + 1)
    setFormData({
      ...formData,
      ingredients: [...formData.ingredients, { id: newId, ingredient_id: 0, quantity_required: 0 }]
    })
  }

  const removeIngredientRow = (id: string) => {
    if (formData.ingredients.length > 1) {
      setFormData({
        ...formData,
        ingredients: formData.ingredients.filter(ing => ing.id !== id)
      })
    }
  }

  const updateIngredient = (id: string, field: string, value: any) => {
    setFormData({
      ...formData,
      ingredients: formData.ingredients.map(ing =>
        ing.id === id ? { ...ing, [field]: value } : ing
      )
    })
  }

  const handleCreateRecipe = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setSuccess('')
    setSubmitting(true)

    try {
      if (!formData.product_id) {
        throw new Error('Please select a menu item')
      }

      // Validate all ingredients
      const validIngredients = formData.ingredients.filter(ing => ing.ingredient_id > 0 && ing.quantity_required > 0)
      if (validIngredients.length === 0) {
        throw new Error('Please add at least one ingredient with quantity > 0')
      }

      // Create recipes for each ingredient
      const createdRecipes = []
      for (const ingredient of validIngredients) {
        const recipe = await recipeService.createRecipe({
          product_id: formData.product_id,
          ingredient_id: ingredient.ingredient_id,
          quantity_required: ingredient.quantity_required,
        })
        createdRecipes.push(recipe)
      }

      setSuccess(`Recipe created successfully with ${createdRecipes.length} ingredient(s)!`)
      setFormData({
        product_id: 0,
        ingredients: [{ id: '1', ingredient_id: 0, quantity_required: 0 }],
      })
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

  // Group recipes by product
  const recipesByProduct = recipes.reduce((acc: any, recipe: Recipe) => {
    if (!acc[recipe.product_id]) {
      acc[recipe.product_id] = {
        product_name: recipe.product_name,
        ingredients: []
      }
    }
    acc[recipe.product_id].ingredients.push(recipe)
    return acc
  }, {})

  if (!mounted) {
    return <div className="p-10 text-center text-black font-bold">Loading...</div>
  }

  const totalCost = calculateTotalCost()

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
            {typeof formError === 'string' ? formError : 'An error occurred'}
          </div>
        )}
        {success && (
          <div className="bg-green-100 text-green-900 p-4 rounded mb-4 font-bold">
            {typeof success === 'string' ? success : 'Operation successful'}
          </div>
        )}

        {/* Create Form */}
        {showForm && (
          <div className="bg-white shadow rounded-lg p-4 md:p-6 mb-6">
            <h2 className="text-xl md:text-2xl font-bold mb-4 text-black">
              Add New Recipe
            </h2>

            <form onSubmit={handleCreateRecipe} className="space-y-4">
              {/* Menu Item Selection */}
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

              {/* Ingredients Section */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-bold text-black mb-3">Ingredients</h3>

                {formData.ingredients.map((ingredient, index) => (
                  <div key={ingredient.id} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 pb-3 border-b">
                    {/* Ingredient Dropdown */}
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">
                        Ingredient {index + 1}
                      </label>
                      <select
                        value={ingredient.ingredient_id}
                        onChange={(e) => updateIngredient(ingredient.id, 'ingredient_id', parseInt(e.target.value))}
                        className="border p-2 rounded w-full text-black font-bold text-sm"
                      >
                        <option value={0}>Select Ingredient</option>
                        {inventory.map((inv: InventoryItem) => {
                          const isLowStock = inv.current_stock < 5
                          return (
                            <option key={inv.id} value={inv.id}>
                              {inv.item_name} ({inv.unit}) {isLowStock ? '⚠️ LOW STOCK' : `Stock: ${inv.current_stock.toFixed(2)}`}
                            </option>
                          )
                        })}
                      </select>
                    </div>

                    {/* Quantity Input */}
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">
                        Quantity Required
                      </label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={ingredient.quantity_required}
                        onChange={(e) => updateIngredient(ingredient.id, 'quantity_required', parseFloat(e.target.value) || 0)}
                        className="border p-2 rounded w-full text-black font-bold text-sm"
                        step="0.01"
                      />
                    </div>

                    {/* Delete Button */}
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => removeIngredientRow(ingredient.id)}
                        disabled={formData.ingredients.length === 1}
                        className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white px-3 py-2 rounded font-bold text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add Another Ingredient Button */}
                <button
                  type="button"
                  onClick={addIngredientRow}
                  className="mt-3 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-bold text-sm"
                >
                  + Add Another Ingredient
                </button>
              </div>

              {/* Cost Summary */}
              {totalCost > 0 && (
                <div className="bg-gray-100 p-4 rounded space-y-2">
                  <p className="text-sm text-gray-600">
                    <strong>Total Cost per Plate:</strong> <span className="text-black font-bold">Rs. {totalCost.toFixed(2)}</span>
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-gray-600">30% Margin</p>
                      <p className="font-bold text-black">Rs. {calculateSuggestedPrice(30).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">40% Margin</p>
                      <p className="font-bold text-black">Rs. {calculateSuggestedPrice(40).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">50% Margin</p>
                      <p className="font-bold text-black">Rs. {calculateSuggestedPrice(50).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Buttons */}
              <div className="flex gap-2 pt-4">
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
                    setFormData({
                      product_id: 0,
                      ingredients: [{ id: '1', ingredient_id: 0, quantity_required: 0 }],
                    })
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

        {/* Recipes Table - Grouped by Product */}
        <div className="bg-white shadow rounded-lg p-4 md:p-6">
          <h2 className="text-xl font-bold mb-4 text-black">Recipes by Dish</h2>

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
            <div className="space-y-6">
              {Object.entries(recipesByProduct).map(([productId, data]: [string, any]) => (
                <div key={productId} className="border rounded-lg p-4">
                  <h3 className="text-lg font-bold text-black mb-3">{data.product_name}</h3>

                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-2 font-semibold text-black">Ingredient</th>
                          <th className="text-left py-2 px-2 font-semibold text-black">Unit</th>
                          <th className="text-left py-2 px-2 font-semibold text-black">Qty Required</th>
                          <th className="text-left py-2 px-2 font-semibold text-black">Avg Price</th>
                          <th className="text-left py-2 px-2 font-semibold text-black">Cost</th>
                          <th className="text-left py-2 px-2 font-semibold text-black">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.ingredients.map((recipe: Recipe) => (
                          <tr key={recipe.id} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="py-2 px-2 text-black font-bold">{recipe.ingredient_name}</td>
                            <td className="py-2 px-2 text-gray-600">{recipe.ingredient_unit}</td>
                            <td className="py-2 px-2 text-gray-600">{recipe.quantity_required.toFixed(2)}</td>
                            <td className="py-2 px-2 text-gray-600">Rs. {(inventory.find((i: InventoryItem) => i.id === recipe.ingredient_id)?.average_price || 0).toFixed(2)}</td>
                            <td className="py-2 px-2 text-gray-600 font-bold">
                              Rs. {(recipe.quantity_required * (inventory.find((i: InventoryItem) => i.id === recipe.ingredient_id)?.average_price || 0)).toFixed(2)}
                            </td>
                            <td className="py-2 px-2">
                              <button
                                onClick={() => handleDeleteRecipe(recipe.id)}
                                className="text-red-600 font-bold hover:text-red-800 text-sm"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-3">
                    {data.ingredients.map((recipe: Recipe) => (
                      <div key={recipe.id} className="bg-gray-50 border-l-4 border-indigo-600 rounded p-3">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-black">{recipe.ingredient_name}</h4>
                          <button
                            onClick={() => handleDeleteRecipe(recipe.id)}
                            className="text-red-600 font-bold hover:text-red-800 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-xs text-gray-600 font-bold">Unit</p>
                            <p className="text-black font-bold">{recipe.ingredient_unit}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 font-bold">Qty Required</p>
                            <p className="text-black font-bold">{recipe.quantity_required.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 font-bold">Avg Price</p>
                            <p className="text-black font-bold">Rs. {(inventory.find((i: InventoryItem) => i.id === recipe.ingredient_id)?.average_price || 0).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 font-bold">Cost</p>
                            <p className="text-black font-bold">Rs. {(recipe.quantity_required * (inventory.find((i: InventoryItem) => i.id === recipe.ingredient_id)?.average_price || 0)).toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
