"""
Inventory API endpoints for stock management.
Handles inventory CRUD operations with weighted average costing logic.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Form
from sqlmodel import Session, select
from typing import List, Optional
from decimal import Decimal
from datetime import datetime

from ..database import get_session
from ..models import Inventory, PurchaseRecord, Vendor
from ..middleware.auth import verify_jwt, require_admin

router = APIRouter()


@router.get("/")
def get_inventory(
    session: Session = Depends(get_session),
    skip: int = 0,
    limit: int = 100
):
    """
    Fetch all inventory items with pagination.

    Returns list of inventory items with current stock and average price.
    """
    try:
        inventory_items = session.exec(
            select(Inventory)
            .offset(skip)
            .limit(limit)
            .order_by(Inventory.created_at.desc())
        ).all()

        return [
            {
                "id": item.id,
                "item_name": item.item_name,
                "current_stock": item.current_stock,
                "unit": item.unit,
                "average_price": float(item.average_price),
                "created_at": item.created_at.isoformat(),
                "updated_at": item.updated_at.isoformat(),
            }
            for item in inventory_items
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching inventory: {str(e)}"
        )


@router.get("/{item_id}")
def get_inventory_item(
    item_id: int,
    session: Session = Depends(get_session)
):
    """
    Fetch a single inventory item by ID.
    """
    try:
        item = session.get(Inventory, item_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Inventory item {item_id} not found"
            )

        return {
            "id": item.id,
            "item_name": item.item_name,
            "current_stock": item.current_stock,
            "unit": item.unit,
            "average_price": float(item.average_price),
            "created_at": item.created_at.isoformat(),
            "updated_at": item.updated_at.isoformat(),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching inventory item: {str(e)}"
        )


@router.post("/", dependencies=[Depends(verify_jwt), Depends(require_admin)])
def create_inventory_item(
    item_name: str = Form(...),
    unit: str = Form(...),
    current_stock: str = Form("0.0"),
    average_price: str = Form("0.00"),
    session: Session = Depends(get_session)
):
    """
    Create a new inventory item.
    Requires admin authentication.

    Args:
        item_name: Name of the inventory item
        unit: Unit of measurement (kg, ltr, pieces, etc.)
        current_stock: Initial stock quantity
        average_price: Initial average price per unit
    """
    try:
        if not item_name.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Item name is required"
            )

        # Convert current_stock from string to float
        try:
            stock_float = float(current_stock)
        except:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current stock must be a valid number"
            )

        # Convert average_price from string to Decimal
        try:
            price_decimal = Decimal(average_price)
        except:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Average price must be a valid number"
            )

        # Check if item already exists
        existing = session.exec(
            select(Inventory).where(Inventory.item_name == item_name.strip())
        ).first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Inventory item '{item_name}' already exists"
            )

        new_item = Inventory(
            item_name=item_name.strip(),
            unit=unit.strip(),
            current_stock=stock_float,
            average_price=price_decimal
        )

        session.add(new_item)
        session.commit()
        session.refresh(new_item)

        return {
            "id": new_item.id,
            "item_name": new_item.item_name,
            "current_stock": new_item.current_stock,
            "unit": new_item.unit,
            "average_price": float(new_item.average_price),
            "created_at": new_item.created_at.isoformat(),
            "updated_at": new_item.updated_at.isoformat(),
        }
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating inventory item: {str(e)}"
        )


@router.put("/{item_id}", dependencies=[Depends(verify_jwt), Depends(require_admin)])
def update_inventory_item(
    item_id: int,
    item_name: Optional[str] = None,
    unit: Optional[str] = None,
    session: Session = Depends(get_session)
):
    """
    Update inventory item details (name, unit only).
    Stock and price are updated via PurchaseRecord creation.
    Requires admin authentication.
    """
    try:
        item = session.get(Inventory, item_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Inventory item {item_id} not found"
            )

        if item_name:
            item.item_name = item_name.strip()
        if unit:
            item.unit = unit.strip()

        item.updated_at = datetime.utcnow()
        session.add(item)
        session.commit()
        session.refresh(item)

        return {
            "id": item.id,
            "item_name": item.item_name,
            "current_stock": item.current_stock,
            "unit": item.unit,
            "average_price": float(item.average_price),
            "created_at": item.created_at.isoformat(),
            "updated_at": item.updated_at.isoformat(),
        }
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating inventory item: {str(e)}"
        )


def update_inventory_with_weighted_average(
    inventory_item: Inventory,
    new_quantity: float,
    new_price: Decimal,
    session: Session
):
    """
    CRITICAL LOGIC: Update inventory stock and average price using weighted average costing.

    Formula: New_Average_Price = ((Old_Stock * Old_Price) + (New_Quantity * New_Price)) / Total_Stock

    Safety Check: Prevents division by zero if stock becomes 0.
    """
    try:
        old_stock = inventory_item.current_stock
        old_price = inventory_item.average_price

        # Calculate total stock after purchase
        total_stock = old_stock + new_quantity

        # Update current stock
        inventory_item.current_stock = total_stock

        # Calculate weighted average price (with zero-division safety)
        if total_stock > 0:
            weighted_sum = (old_stock * old_price) + (new_quantity * new_price)
            inventory_item.average_price = weighted_sum / Decimal(str(total_stock))
        else:
            # If stock is 0, keep the new price
            inventory_item.average_price = new_price

        inventory_item.updated_at = datetime.utcnow()
        session.add(inventory_item)

        return inventory_item
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating inventory with weighted average: {str(e)}"
        )
