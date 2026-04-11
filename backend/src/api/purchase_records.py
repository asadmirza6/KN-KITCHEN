"""
Purchase Record API endpoints for inventory purchases.
Handles purchase creation with automatic inventory and weighted average price updates.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Form
from sqlmodel import Session, select
from typing import List
from decimal import Decimal
from datetime import datetime

from ..database import get_session
from ..models import PurchaseRecord, Inventory, Vendor
from ..middleware.auth import verify_jwt, require_admin
from .inventory import update_inventory_with_weighted_average

router = APIRouter()


@router.get("/")
def get_purchase_records(
    session: Session = Depends(get_session),
    vendor_id: int = None,
    skip: int = 0,
    limit: int = 100
):
    """
    Fetch all purchase records with optional vendor filter.

    Returns list of purchase records with vendor and inventory details.
    """
    try:
        query = select(PurchaseRecord)

        if vendor_id:
            query = query.where(PurchaseRecord.vendor_id == vendor_id)

        records = session.exec(
            query.offset(skip).limit(limit).order_by(PurchaseRecord.date.desc())
        ).all()

        return [
            {
                "id": record.id,
                "vendor_id": record.vendor_id,
                "vendor_name": record.vendor.name if record.vendor else None,
                "inventory_item_id": record.inventory_item_id,
                "item_name": record.inventory_item.item_name if record.inventory_item else None,
                "quantity": record.quantity,
                "rate": float(record.rate),
                "total_amount": float(record.total_amount),
                "date": record.date.isoformat(),
            }
            for record in records
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching purchase records: {str(e)}"
        )


@router.get("/{record_id}")
def get_purchase_record(
    record_id: int,
    session: Session = Depends(get_session)
):
    """
    Fetch a single purchase record by ID.
    """
    try:
        record = session.get(PurchaseRecord, record_id)
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Purchase record {record_id} not found"
            )

        return {
            "id": record.id,
            "vendor_id": record.vendor_id,
            "vendor_name": record.vendor.name if record.vendor else None,
            "inventory_item_id": record.inventory_item_id,
            "item_name": record.inventory_item.item_name if record.inventory_item else None,
            "quantity": record.quantity,
            "rate": float(record.rate),
            "total_amount": float(record.total_amount),
            "date": record.date.isoformat(),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching purchase record: {str(e)}"
        )


@router.post("/", dependencies=[Depends(verify_jwt), Depends(require_admin)])
def create_purchase_record(
    vendor_id: int = Form(...),
    inventory_item_id: int = Form(...),
    quantity: float = Form(...),
    rate: str = Form(...),
    session: Session = Depends(get_session)
):
    """
    Create a new purchase record and update inventory with weighted average costing.

    CRITICAL LOGIC:
    1. Validate vendor and inventory item exist
    2. Calculate total_amount = quantity * rate
    3. Update inventory stock and average price using weighted average formula
    4. Create purchase record

    Requires admin authentication.

    Args:
        vendor_id: ID of the vendor
        inventory_item_id: ID of the inventory item
        quantity: Quantity purchased
        rate: Rate per unit
    """
    try:
        # DEBUG: Log incoming request
        print(f"DEBUG: Purchase Record Request")
        print(f"  vendor_id: {vendor_id} (type: {type(vendor_id).__name__})")
        print(f"  inventory_item_id: {inventory_item_id} (type: {type(inventory_item_id).__name__})")
        print(f"  quantity: {quantity} (type: {type(quantity).__name__})")
        print(f"  rate: {rate} (type: {type(rate).__name__})")

        # Convert rate to Decimal
        try:
            rate_decimal = Decimal(str(rate))
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid rate format: {str(e)}"
            )

        # Validate vendor exists
        vendor = session.get(Vendor, vendor_id)
        if not vendor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Vendor {vendor_id} not found"
            )

        # Validate inventory item exists
        inventory_item = session.get(Inventory, inventory_item_id)
        if not inventory_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Inventory item {inventory_item_id} not found"
            )

        # Validate quantity and rate
        if quantity <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Quantity must be greater than 0"
            )

        if rate_decimal <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Rate must be greater than 0"
            )

        # Calculate total amount
        total_amount = Decimal(str(quantity)) * rate_decimal

        print(f"DEBUG: Validation passed. Updating inventory...")
        print(f"  Old stock: {inventory_item.current_stock}")
        print(f"  Old avg price: {inventory_item.average_price}")

        # CRITICAL: Update inventory with weighted average costing
        update_inventory_with_weighted_average(
            inventory_item=inventory_item,
            new_quantity=quantity,
            new_price=rate_decimal,
            session=session
        )

        print(f"  New stock: {inventory_item.current_stock}")
        print(f"  New avg price: {inventory_item.average_price}")

        # Create purchase record
        new_record = PurchaseRecord(
            vendor_id=vendor_id,
            inventory_item_id=inventory_item_id,
            quantity=quantity,
            rate=rate_decimal,
            total_amount=total_amount,
            date=datetime.utcnow()
        )

        session.add(new_record)
        session.commit()
        session.refresh(new_record)

        print(f"DEBUG: Purchase record created successfully. ID: {new_record.id}")

        return {
            "id": new_record.id,
            "vendor_id": new_record.vendor_id,
            "vendor_name": vendor.name,
            "inventory_item_id": new_record.inventory_item_id,
            "item_name": inventory_item.item_name,
            "quantity": new_record.quantity,
            "rate": float(new_record.rate),
            "total_amount": float(new_record.total_amount),
            "date": new_record.date.isoformat(),
            "inventory_updated": {
                "new_stock": inventory_item.current_stock,
                "new_average_price": float(inventory_item.average_price),
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        print(f"DEBUG: Error creating purchase record: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating purchase record: {str(e)}"
        )


@router.delete("/{record_id}", dependencies=[Depends(verify_jwt), Depends(require_admin)])
def delete_purchase_record(
    record_id: int,
    session: Session = Depends(get_session)
):
    """
    Delete a purchase record (reverses inventory update).
    WARNING: This reverses the weighted average calculation.
    Requires admin authentication.
    """
    try:
        record = session.get(PurchaseRecord, record_id)
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Purchase record {record_id} not found"
            )

        # Get inventory item
        inventory_item = session.get(Inventory, record.inventory_item_id)
        if not inventory_item:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Associated inventory item not found"
            )

        # Reverse the inventory update (subtract quantity)
        old_stock = inventory_item.current_stock
        old_price = inventory_item.average_price
        removed_quantity = record.quantity

        # Calculate new stock
        new_stock = old_stock - removed_quantity

        # Recalculate average price (reverse the weighted average)
        if new_stock > 0:
            # Reverse formula: Old_Price = (Total_Value - Removed_Value) / Remaining_Stock
            total_value = (old_stock * old_price) - (removed_quantity * record.rate)
            inventory_item.average_price = total_value / Decimal(str(new_stock))
        else:
            # If stock becomes 0, reset price to 0
            inventory_item.average_price = Decimal("0.00")

        inventory_item.current_stock = new_stock
        inventory_item.updated_at = datetime.utcnow()

        session.add(inventory_item)
        session.delete(record)
        session.commit()

        return {
            "success": True,
            "message": f"Purchase record {record_id} deleted and inventory reversed",
            "inventory_reversed": {
                "new_stock": inventory_item.current_stock,
                "new_average_price": float(inventory_item.average_price),
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting purchase record: {str(e)}"
        )
