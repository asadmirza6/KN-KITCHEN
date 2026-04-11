"""
Recipe API endpoints for managing product ingredients.
Handles recipe CRUD operations linking menu items to inventory ingredients.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Form
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime

from ..database import get_session
from ..models import Recipe, Item, Inventory
from ..middleware.auth import verify_jwt, require_admin

router = APIRouter()


@router.get("/")
def get_recipes(
    session: Session = Depends(get_session),
    product_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100
):
    """
    Fetch all recipes with optional product filter.

    Returns list of recipes with product and ingredient details.
    """
    try:
        query = select(Recipe)

        if product_id:
            query = query.where(Recipe.product_id == product_id)

        recipes = session.exec(
            query.offset(skip).limit(limit)
        ).all()

        result = []
        for recipe in recipes:
            product = session.get(Item, recipe.product_id)
            ingredient = session.get(Inventory, recipe.ingredient_id)

            result.append({
                "id": recipe.id,
                "product_id": recipe.product_id,
                "product_name": product.name if product else None,
                "ingredient_id": recipe.ingredient_id,
                "ingredient_name": ingredient.item_name if ingredient else None,
                "ingredient_unit": ingredient.unit if ingredient else None,
                "quantity_required": recipe.quantity_required,
            })

        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching recipes: {str(e)}"
        )


@router.get("/{recipe_id}")
def get_recipe(
    recipe_id: int,
    session: Session = Depends(get_session)
):
    """
    Fetch a single recipe by ID.
    """
    try:
        recipe = session.get(Recipe, recipe_id)
        if not recipe:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Recipe {recipe_id} not found"
            )

        product = session.get(Item, recipe.product_id)
        ingredient = session.get(Inventory, recipe.ingredient_id)

        return {
            "id": recipe.id,
            "product_id": recipe.product_id,
            "product_name": product.name if product else None,
            "ingredient_id": recipe.ingredient_id,
            "ingredient_name": ingredient.item_name if ingredient else None,
            "ingredient_unit": ingredient.unit if ingredient else None,
            "quantity_required": recipe.quantity_required,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching recipe: {str(e)}"
        )


@router.get("/product/{product_id}")
def get_recipes_by_product(
    product_id: int,
    session: Session = Depends(get_session)
):
    """
    Fetch all recipes for a specific product (menu item).
    Used when processing orders to deduct ingredients from inventory.
    """
    try:
        # Verify product exists
        product = session.get(Item, product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product {product_id} not found"
            )

        recipes = session.exec(
            select(Recipe).where(Recipe.product_id == product_id)
        ).all()

        result = []
        for recipe in recipes:
            ingredient = session.get(Inventory, recipe.ingredient_id)

            result.append({
                "id": recipe.id,
                "product_id": recipe.product_id,
                "product_name": product.name,
                "ingredient_id": recipe.ingredient_id,
                "ingredient_name": ingredient.item_name if ingredient else None,
                "ingredient_unit": ingredient.unit if ingredient else None,
                "quantity_required": recipe.quantity_required,
            })

        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching recipes for product: {str(e)}"
        )


@router.post("/", dependencies=[Depends(verify_jwt), Depends(require_admin)])
def create_recipe(
    product_id: int = Form(...),
    ingredient_id: int = Form(...),
    quantity_required: float = Form(...),
    session: Session = Depends(get_session)
):
    """
    Create a new recipe linking a product to an ingredient.

    Args:
        product_id: ID of the menu item (product)
        ingredient_id: ID of the inventory item (ingredient)
        quantity_required: Quantity of ingredient required for one unit of product
    """
    try:
        # Validate product exists
        product = session.get(Item, product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product {product_id} not found"
            )

        # Validate ingredient exists
        ingredient = session.get(Inventory, ingredient_id)
        if not ingredient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Ingredient {ingredient_id} not found"
            )

        # Validate quantity
        if quantity_required <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Quantity required must be greater than 0"
            )

        # Check if recipe already exists
        existing = session.exec(
            select(Recipe).where(
                (Recipe.product_id == product_id) &
                (Recipe.ingredient_id == ingredient_id)
            )
        ).first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Recipe already exists for {product.name} with {ingredient.item_name}"
            )

        # Create recipe
        new_recipe = Recipe(
            product_id=product_id,
            ingredient_id=ingredient_id,
            quantity_required=quantity_required
        )

        session.add(new_recipe)
        session.commit()
        session.refresh(new_recipe)

        return {
            "id": new_recipe.id,
            "product_id": new_recipe.product_id,
            "product_name": product.name,
            "ingredient_id": new_recipe.ingredient_id,
            "ingredient_name": ingredient.item_name,
            "ingredient_unit": ingredient.unit,
            "quantity_required": new_recipe.quantity_required,
        }
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating recipe: {str(e)}"
        )


@router.put("/{recipe_id}", dependencies=[Depends(verify_jwt), Depends(require_admin)])
def update_recipe(
    recipe_id: int,
    quantity_required: float = Form(...),
    session: Session = Depends(get_session)
):
    """
    Update a recipe's quantity required.
    Requires admin authentication.
    """
    try:
        recipe = session.get(Recipe, recipe_id)
        if not recipe:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Recipe {recipe_id} not found"
            )

        if quantity_required <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Quantity required must be greater than 0"
            )

        recipe.quantity_required = quantity_required
        session.add(recipe)
        session.commit()
        session.refresh(recipe)

        product = session.get(Item, recipe.product_id)
        ingredient = session.get(Inventory, recipe.ingredient_id)

        return {
            "id": recipe.id,
            "product_id": recipe.product_id,
            "product_name": product.name if product else None,
            "ingredient_id": recipe.ingredient_id,
            "ingredient_name": ingredient.item_name if ingredient else None,
            "ingredient_unit": ingredient.unit if ingredient else None,
            "quantity_required": recipe.quantity_required,
        }
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating recipe: {str(e)}"
        )


@router.delete("/{recipe_id}", dependencies=[Depends(verify_jwt), Depends(require_admin)])
def delete_recipe(
    recipe_id: int,
    session: Session = Depends(get_session)
):
    """
    Delete a recipe.
    Requires admin authentication.
    """
    try:
        recipe = session.get(Recipe, recipe_id)
        if not recipe:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Recipe {recipe_id} not found"
            )

        product = session.get(Item, recipe.product_id)
        ingredient = session.get(Inventory, recipe.ingredient_id)

        session.delete(recipe)
        session.commit()

        return {
            "success": True,
            "message": f"Recipe for {product.name if product else 'product'} with {ingredient.item_name if ingredient else 'ingredient'} deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting recipe: {str(e)}"
        )
