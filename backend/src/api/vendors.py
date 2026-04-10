"""
Vendor API endpoints for supplier management.
Handles vendor CRUD operations and vendor ledger calculations.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Form
from sqlmodel import Session, select, func
from typing import List, Optional
from decimal import Decimal
from datetime import datetime

from ..database import get_session
from ..models import Vendor, PurchaseRecord, VendorPayment
from ..middleware.auth import verify_jwt, require_admin

router = APIRouter()


@router.get("/")
def get_vendors(
    session: Session = Depends(get_session),
    skip: int = 0,
    limit: int = 100
):
    """
    Fetch all vendors with their ledger balance.

    Returns list of vendors with:
    - Basic info (id, name, contact_info, category)
    - Total purchases amount
    - Total payments made
    - Balance (Total Purchases - Total Payments)
    """
    try:
        vendors = session.exec(
            select(Vendor)
            .offset(skip)
            .limit(limit)
            .order_by(Vendor.created_at.desc())
        ).all()

        result = []
        for vendor in vendors:
            # Calculate total purchases
            total_purchases = session.exec(
                select(func.sum(PurchaseRecord.total_amount))
                .where(PurchaseRecord.vendor_id == vendor.id)
            ).first() or Decimal("0.00")

            # Calculate total payments
            total_payments = session.exec(
                select(func.sum(VendorPayment.amount_paid))
                .where(VendorPayment.vendor_id == vendor.id)
            ).first() or Decimal("0.00")

            # Calculate balance (positive = vendor owes us, negative = we owe vendor)
            balance = total_purchases - total_payments

            result.append({
                "id": vendor.id,
                "name": vendor.name,
                "contact_info": vendor.contact_info,
                "category": vendor.category,
                "total_purchases": float(total_purchases),
                "total_payments": float(total_payments),
                "balance": float(balance),
                "created_at": vendor.created_at.isoformat(),
            })

        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching vendors: {str(e)}"
        )


@router.get("/{vendor_id}")
def get_vendor(
    vendor_id: int,
    session: Session = Depends(get_session)
):
    """
    Fetch a single vendor with detailed ledger information.
    """
    try:
        vendor = session.get(Vendor, vendor_id)
        if not vendor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Vendor {vendor_id} not found"
            )

        # Calculate total purchases
        total_purchases = session.exec(
            select(func.sum(PurchaseRecord.total_amount))
            .where(PurchaseRecord.vendor_id == vendor_id)
        ).first() or Decimal("0.00")

        # Calculate total payments
        total_payments = session.exec(
            select(func.sum(VendorPayment.amount_paid))
            .where(VendorPayment.vendor_id == vendor_id)
        ).first() or Decimal("0.00")

        # Get all purchase records
        purchases = session.exec(
            select(PurchaseRecord)
            .where(PurchaseRecord.vendor_id == vendor_id)
            .order_by(PurchaseRecord.date.desc())
        ).all()

        # Get all payments
        payments = session.exec(
            select(VendorPayment)
            .where(VendorPayment.vendor_id == vendor_id)
            .order_by(VendorPayment.date.desc())
        ).all()

        balance = total_purchases - total_payments

        return {
            "id": vendor.id,
            "name": vendor.name,
            "contact_info": vendor.contact_info,
            "category": vendor.category,
            "total_purchases": float(total_purchases),
            "total_payments": float(total_payments),
            "balance": float(balance),
            "purchases": [
                {
                    "id": p.id,
                    "quantity": p.quantity,
                    "rate": float(p.rate),
                    "total_amount": float(p.total_amount),
                    "date": p.date.isoformat(),
                }
                for p in purchases
            ],
            "payments": [
                {
                    "id": p.id,
                    "amount_paid": float(p.amount_paid),
                    "payment_type": p.payment_type,
                    "date": p.date.isoformat(),
                }
                for p in payments
            ],
            "created_at": vendor.created_at.isoformat(),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching vendor: {str(e)}"
        )


@router.post("/", dependencies=[Depends(verify_jwt), Depends(require_admin)])
def create_vendor(
    name: str = Form(...),
    contact_info: str = Form(...),
    category: str = Form(...),
    session: Session = Depends(get_session)
):
    """
    Create a new vendor.
    Requires admin authentication.

    Args:
        name: Vendor name
        contact_info: Contact information (phone, email, address)
        category: Category (Meat, Grocery, Dairy, etc.)
    """
    try:
        if not name.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vendor name is required"
            )

        # Check if vendor already exists
        existing = session.exec(
            select(Vendor).where(Vendor.name == name.strip())
        ).first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Vendor '{name}' already exists"
            )

        new_vendor = Vendor(
            name=name.strip(),
            contact_info=contact_info.strip(),
            category=category.strip()
        )

        session.add(new_vendor)
        session.commit()
        session.refresh(new_vendor)

        return {
            "id": new_vendor.id,
            "name": new_vendor.name,
            "contact_info": new_vendor.contact_info,
            "category": new_vendor.category,
            "total_purchases": 0.0,
            "total_payments": 0.0,
            "balance": 0.0,
            "created_at": new_vendor.created_at.isoformat(),
        }
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating vendor: {str(e)}"
        )


@router.put("/{vendor_id}", dependencies=[Depends(verify_jwt), Depends(require_admin)])
def update_vendor(
    vendor_id: int,
    name: Optional[str] = None,
    contact_info: Optional[str] = None,
    category: Optional[str] = None,
    session: Session = Depends(get_session)
):
    """
    Update vendor information.
    Requires admin authentication.
    """
    try:
        vendor = session.get(Vendor, vendor_id)
        if not vendor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Vendor {vendor_id} not found"
            )

        if name:
            vendor.name = name.strip()
        if contact_info:
            vendor.contact_info = contact_info.strip()
        if category:
            vendor.category = category.strip()

        session.add(vendor)
        session.commit()
        session.refresh(vendor)

        # Calculate ledger
        total_purchases = session.exec(
            select(func.sum(PurchaseRecord.total_amount))
            .where(PurchaseRecord.vendor_id == vendor_id)
        ).first() or Decimal("0.00")

        total_payments = session.exec(
            select(func.sum(VendorPayment.amount_paid))
            .where(VendorPayment.vendor_id == vendor_id)
        ).first() or Decimal("0.00")

        balance = total_purchases - total_payments

        return {
            "id": vendor.id,
            "name": vendor.name,
            "contact_info": vendor.contact_info,
            "category": vendor.category,
            "total_purchases": float(total_purchases),
            "total_payments": float(total_payments),
            "balance": float(balance),
            "created_at": vendor.created_at.isoformat(),
        }
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating vendor: {str(e)}"
        )


@router.delete("/{vendor_id}", dependencies=[Depends(verify_jwt), Depends(require_admin)])
def delete_vendor(
    vendor_id: int,
    session: Session = Depends(get_session)
):
    """
    Delete a vendor (only if no purchase records exist).
    Requires admin authentication.
    """
    try:
        vendor = session.get(Vendor, vendor_id)
        if not vendor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Vendor {vendor_id} not found"
            )

        # Check if vendor has purchase records
        purchase_count = session.exec(
            select(func.count(PurchaseRecord.id))
            .where(PurchaseRecord.vendor_id == vendor_id)
        ).first()

        if purchase_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete vendor with {purchase_count} purchase records"
            )

        session.delete(vendor)
        session.commit()

        return {
            "success": True,
            "message": f"Vendor '{vendor.name}' deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting vendor: {str(e)}"
        )
