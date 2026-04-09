"""
Quotations API endpoints.
Handles quotation creation, management, and approval workflow.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select
from typing import List
from pydantic import BaseModel
from decimal import Decimal
from io import BytesIO

from ..database import get_session
from ..models import Quotation, Order, User
from ..middleware.auth import verify_jwt, require_admin, require_staff_or_admin
from ..utils.pdf_quotation_generator import QuotationGenerator


router = APIRouter()


class QuotationItemRequest(BaseModel):
    """Single item in a quotation"""
    item_id: int
    item_name: str
    quantity_kg: float
    price_per_kg: float


class ManualItemRequest(BaseModel):
    """Manual/custom item not in the menu"""
    name: str
    quantity_kg: float
    price_per_kg: float


class CreateQuotationRequest(BaseModel):
    """Request model for creating a new quotation"""
    customer_name: str
    customer_email: str
    customer_phone: str
    customer_address: str
    items: List[QuotationItemRequest] = []
    manual_items: List[ManualItemRequest] = []
    total_amount: float
    advance_payment: float = 0.0
    delivery_date: str | None = None
    valid_until: str | None = None
    notes: str | None = None
    discount: float = 0.0


class UpdateQuotationRequest(BaseModel):
    """Request model for updating a quotation"""
    customer_name: str
    customer_email: str
    customer_phone: str
    customer_address: str
    items: List[QuotationItemRequest] = []
    manual_items: List[ManualItemRequest] = []
    total_amount: float
    advance_payment: float = 0.0
    delivery_date: str | None = None
    valid_until: str | None = None
    notes: str | None = None
    discount: float = 0.0


@router.post("/", status_code=201, dependencies=[Depends(require_staff_or_admin)])
def create_quotation(
    request: CreateQuotationRequest,
    current_user: User = Depends(require_staff_or_admin),
    session: Session = Depends(get_session)
):
    """Create a new quotation (admin/staff only)."""

    # Convert items to dict format for JSON storage
    items_data = [
        {
            "item_id": item.item_id,
            "item_name": item.item_name,
            "quantity_kg": item.quantity_kg,
            "price_per_kg": item.price_per_kg,
            "subtotal": item.quantity_kg * item.price_per_kg
        }
        for item in request.items
    ]

    # Calculate balance
    balance = Decimal(str(request.total_amount)) - Decimal(str(request.advance_payment))

    # Convert manual items to dict format for JSON storage
    manual_items_data = [
        {
            "name": item.name,
            "quantity_kg": item.quantity_kg,
            "price_per_kg": item.price_per_kg,
            "subtotal": item.quantity_kg * item.price_per_kg
        }
        for item in request.manual_items
    ]

    # Create quotation using ORM
    quotation = Quotation(
        user_id=current_user.id,
        created_by_name=current_user.name,
        customer_name=request.customer_name,
        customer_email=request.customer_email,
        customer_phone=request.customer_phone,
        customer_address=request.customer_address,
        items=items_data,
        manual_items=manual_items_data,
        total_amount=Decimal(str(request.total_amount)),
        advance_payment=Decimal(str(request.advance_payment)),
        balance=balance,
        discount=Decimal(str(request.discount)),
        delivery_date=request.delivery_date,
        valid_until=request.valid_until,
        notes=request.notes,
        status="pending"
    )

    session.add(quotation)
    session.commit()
    session.refresh(quotation)

    return {
        "id": quotation.id,
        "customer_name": quotation.customer_name,
        "customer_email": quotation.customer_email,
        "customer_phone": quotation.customer_phone,
        "customer_address": quotation.customer_address,
        "items": quotation.items,
        "manual_items": quotation.manual_items,
        "total_amount": str(quotation.total_amount),
        "advance_payment": str(quotation.advance_payment),
        "balance": str(quotation.balance),
        "discount": str(quotation.discount),
        "delivery_date": quotation.delivery_date,
        "valid_until": quotation.valid_until,
        "notes": quotation.notes,
        "status": quotation.status,
        "created_by_name": quotation.created_by_name,
        "created_at": quotation.created_at.isoformat()
    }


@router.get("/", dependencies=[Depends(require_admin)])
def get_quotations(
    current_user: User = Depends(verify_jwt),
    session: Session = Depends(get_session)
):
    """Get all quotations (admin only)."""
    quotations = session.exec(select(Quotation).order_by(Quotation.created_at.desc())).all()

    return [
        {
            "id": quotation.id,
            "created_by_name": quotation.created_by_name,
            "customer_name": quotation.customer_name,
            "customer_email": quotation.customer_email,
            "customer_phone": quotation.customer_phone,
            "customer_address": quotation.customer_address,
            "items": quotation.items,
            "manual_items": quotation.manual_items,
            "total_amount": str(quotation.total_amount),
            "advance_payment": str(quotation.advance_payment),
            "balance": str(quotation.balance),
            "discount": str(quotation.discount),
            "delivery_date": quotation.delivery_date,
            "valid_until": quotation.valid_until,
            "notes": quotation.notes,
            "status": quotation.status,
            "created_at": quotation.created_at.isoformat()
        }
        for quotation in quotations
    ]


@router.get("/{quotation_id}", dependencies=[Depends(require_admin)])
def get_quotation(
    quotation_id: int,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """Get a single quotation by ID (admin only)."""
    quotation = session.get(Quotation, quotation_id)

    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quotation not found"
        )

    return {
        "id": quotation.id,
        "created_by_name": quotation.created_by_name,
        "customer_name": quotation.customer_name,
        "customer_email": quotation.customer_email,
        "customer_phone": quotation.customer_phone,
        "customer_address": quotation.customer_address,
        "items": quotation.items,
        "manual_items": quotation.manual_items,
        "total_amount": str(quotation.total_amount),
        "advance_payment": str(quotation.advance_payment),
        "balance": str(quotation.balance),
        "discount": str(quotation.discount),
        "delivery_date": quotation.delivery_date,
        "valid_until": quotation.valid_until,
        "notes": quotation.notes,
        "status": quotation.status,
        "created_at": quotation.created_at.isoformat()
    }


@router.delete("/{quotation_id}", dependencies=[Depends(require_admin)])
def delete_quotation(
    quotation_id: int,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """Delete a quotation (admin only). Only pending quotations can be deleted."""
    quotation = session.get(Quotation, quotation_id)

    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quotation not found"
        )

    if quotation.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending quotations can be deleted"
        )

    session.delete(quotation)
    session.commit()

    return {"message": "Quotation deleted successfully"}


@router.put("/{quotation_id}", dependencies=[Depends(require_admin)])
def update_quotation(
    quotation_id: int,
    request: UpdateQuotationRequest,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """Update a quotation (admin only). Only pending quotations can be updated."""
    quotation = session.get(Quotation, quotation_id)

    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quotation not found"
        )

    if quotation.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending quotations can be updated"
        )

    # Convert items to dict format for JSON storage
    items_data = [
        {
            "item_id": item.item_id,
            "item_name": item.item_name,
            "quantity_kg": item.quantity_kg,
            "price_per_kg": item.price_per_kg,
            "subtotal": item.quantity_kg * item.price_per_kg
        }
        for item in request.items
    ]

    # Calculate balance
    balance = Decimal(str(request.total_amount)) - Decimal(str(request.advance_payment))

    # Convert manual items to dict format for JSON storage
    manual_items_data = [
        {
            "name": item.name,
            "quantity_kg": item.quantity_kg,
            "price_per_kg": item.price_per_kg,
            "subtotal": item.quantity_kg * item.price_per_kg
        }
        for item in request.manual_items
    ]

    # Update quotation
    quotation.customer_name = request.customer_name
    quotation.customer_email = request.customer_email
    quotation.customer_phone = request.customer_phone
    quotation.customer_address = request.customer_address
    quotation.items = items_data
    quotation.manual_items = manual_items_data
    quotation.total_amount = Decimal(str(request.total_amount))
    quotation.advance_payment = Decimal(str(request.advance_payment))
    quotation.balance = balance
    quotation.discount = Decimal(str(request.discount))
    quotation.delivery_date = request.delivery_date
    quotation.valid_until = request.valid_until
    quotation.notes = request.notes

    session.add(quotation)
    session.commit()
    session.refresh(quotation)

    return {
        "id": quotation.id,
        "customer_name": quotation.customer_name,
        "customer_email": quotation.customer_email,
        "customer_phone": quotation.customer_phone,
        "customer_address": quotation.customer_address,
        "items": quotation.items,
        "manual_items": quotation.manual_items,
        "total_amount": str(quotation.total_amount),
        "advance_payment": str(quotation.advance_payment),
        "balance": str(quotation.balance),
        "discount": str(quotation.discount),
        "delivery_date": quotation.delivery_date,
        "valid_until": quotation.valid_until,
        "notes": quotation.notes,
        "status": quotation.status,
        "created_by_name": quotation.created_by_name,
        "created_at": quotation.created_at.isoformat()
    }


@router.post("/{quotation_id}/approve", dependencies=[Depends(require_admin)])
def approve_quotation(
    quotation_id: int,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """Approve a quotation and convert it to an order (admin only)."""
    quotation = session.get(Quotation, quotation_id)

    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quotation not found"
        )

    if quotation.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending quotations can be approved"
        )

    # Create order from quotation
    order = Order(
        user_id=quotation.user_id,
        created_by_name=quotation.created_by_name,
        customer_name=quotation.customer_name,
        customer_email=quotation.customer_email,
        customer_phone=quotation.customer_phone,
        customer_address=quotation.customer_address,
        items=quotation.items,
        manual_items=quotation.manual_items,
        total_amount=quotation.total_amount,
        advance_payment=quotation.advance_payment,
        balance=quotation.balance,
        discount=quotation.discount,
        delivery_date=quotation.delivery_date,
        notes=quotation.notes,
        status="pending"
    )

    session.add(order)

    # Update quotation status
    quotation.status = "approved"
    session.add(quotation)

    session.commit()
    session.refresh(order)

    return {
        "message": "Quotation approved and converted to order",
        "order_id": order.id,
        "quotation_id": quotation.id
    }


@router.get("/{quotation_id}/estimate", dependencies=[Depends(require_admin)])
def download_quotation_estimate(
    quotation_id: int,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """Download quotation as PDF estimate (admin only)."""
    quotation = session.get(Quotation, quotation_id)

    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quotation not found"
        )

    # Prepare quotation data for PDF
    quotation_data = {
        "quotation_number": f"QT-{quotation.id:05d}",
        "date": quotation.created_at.strftime("%d-%m-%Y"),
        "valid_until": quotation.valid_until or "Upon Request",
        "customer_name": quotation.customer_name,
        "customer_address": quotation.customer_address,
        "customer_phone": quotation.customer_phone,
        "customer_email": quotation.customer_email,
        "delivery_date": quotation.delivery_date or "To be confirmed",
        "items": quotation.items,
        "manual_items": quotation.manual_items,
        "total_amount": float(quotation.total_amount),
        "discount": float(quotation.discount),
        "notes": quotation.notes or ""
    }

    # Generate PDF
    generator = QuotationGenerator()
    pdf_buffer = generator.generate(quotation_data)

    return StreamingResponse(
        iter([pdf_buffer.getvalue()]),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=quotation_{quotation.id}_{quotation.customer_name.replace(' ', '_')}.pdf"}
    )
