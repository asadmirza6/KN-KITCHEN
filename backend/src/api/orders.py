"""
Orders API endpoints.
Handles order creation and management (admin only).
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select
from sqlalchemy import insert, text
from typing import List
from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime
from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.pdfgen import canvas

from ..database import get_session
from ..models import Order, User
from ..middleware.auth import verify_jwt, require_admin, require_staff_or_admin


router = APIRouter()


class OrderItemRequest(BaseModel):
    """Single item in an order"""
    item_id: int
    item_name: str
    quantity_kg: float
    price_per_kg: float


class ManualItemRequest(BaseModel):
    """Manual/custom item not in the menu"""
    name: str
    quantity_kg: float
    price_per_kg: float


class CreateOrderRequest(BaseModel):
    """Request model for creating a new order"""
    customer_name: str
    customer_email: str
    customer_phone: str
    customer_address: str
    items: List[OrderItemRequest]
    manual_items: List[ManualItemRequest] = []
    total_amount: float
    advance_payment: float = 0.0
    delivery_date: str | None = None
    notes: str | None = None

    class Config:
        json_schema_extra = {
            "example": {
                "customer_name": "John Doe",
                "customer_email": "john@example.com",
                "customer_phone": "1234567890",
                "customer_address": "123 Main St, City",
                "items": [],
                "manual_items": [
                    {"name": "Plastic Boxes", "quantity_kg": 10, "price_per_kg": 50}
                ],
                "total_amount": 1000,
                "advance_payment": 500
            }
        }


class UpdateOrderRequest(BaseModel):
    """Request model for updating an order"""
    customer_name: str | None = None
    customer_email: str | None = None
    customer_phone: str | None = None
    customer_address: str | None = None
    items: List[OrderItemRequest] | None = None
    manual_items: List[ManualItemRequest] | None = None
    total_amount: float | None = None
    advance_payment: float | None = None
    delivery_date: str | None = None
    notes: str | None = None
    status: str | None = None


@router.post("/", status_code=201, dependencies=[Depends(require_staff_or_admin)])
def create_order(
    request: CreateOrderRequest,
    current_user: User = Depends(require_staff_or_admin),
    session: Session = Depends(get_session)
):
    """
    Create a new order (admin only).

    Requires JWT authentication.
    Saves order to database with items, amounts, and customer details.
    """

    # Debug: Print received data
    import json
    print(f"DEBUG: Full request data: {json.dumps(request.model_dump(), default=str)}")
    print(f"DEBUG: customer_address value: '{request.customer_address}'")
    print(f"DEBUG: customer_address type: {type(request.customer_address)}")

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

    # Add manual items to items_data
    for manual_item in request.manual_items:
        items_data.append({
            "item_id": None,
            "item_name": manual_item.name,
            "quantity_kg": manual_item.quantity_kg,
            "price_per_kg": manual_item.price_per_kg,
            "subtotal": manual_item.quantity_kg * manual_item.price_per_kg,
            "is_manual": True
        })

    # Calculate balance
    balance = Decimal(str(request.total_amount)) - Decimal(str(request.advance_payment))

    # Determine status based on payment
    if balance == 0:
        status = "paid"
    elif request.advance_payment > 0:
        status = "partial"
    else:
        status = "pending"

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

    # Create order using ORM
    order = Order(
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
        delivery_date=request.delivery_date,
        notes=request.notes,
        status=status
    )

    session.add(order)
    session.commit()
    session.refresh(order)

    # Debug: Check what was saved
    print(f"DEBUG: After commit - order.customer_address = '{order.customer_address}'")
    print(f"DEBUG: After commit - order.customer_address type = {type(order.customer_address)}")

    return {
        "id": order.id,
        "customer_name": order.customer_name,
        "customer_email": order.customer_email,
        "customer_phone": order.customer_phone,
        "customer_address": order.customer_address,
        "items": order.items,
        "manual_items": order.manual_items,
        "total_amount": str(order.total_amount),
        "advance_payment": str(order.advance_payment),
        "balance": str(order.balance),
        "delivery_date": order.delivery_date,
        "notes": order.notes,
        "status": order.status,
        "created_at": order.created_at.isoformat()
    }


@router.get("/", dependencies=[Depends(require_admin)])
def get_orders(
    current_user: User = Depends(verify_jwt),
    session: Session = Depends(get_session)
):
    """
    Get all orders (admin only).

    Returns list of all orders with customer details and items.
    """
    orders = session.exec(select(Order).order_by(Order.created_at.desc())).all()

    return [
        {
            "id": order.id,
            "customer_name": order.customer_name,
            "customer_email": order.customer_email,
            "customer_phone": order.customer_phone,
            "customer_address": order.customer_address,
            "items": order.items,
            "total_amount": str(order.total_amount),
            "advance_payment": str(order.advance_payment),
            "balance": str(order.balance),
            "delivery_date": order.delivery_date,
            "notes": order.notes,
            "status": order.status,
            "created_at": order.created_at.isoformat()
        }
        for order in orders
    ]


@router.get("/stats/summary", dependencies=[Depends(require_admin)])
def get_order_stats(
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    Get order statistics for dashboard (admin only).
    Returns today's orders, total revenue, advances, and pending amounts.
    """
    from sqlalchemy import func
    from datetime import date

    # Get all non-cancelled orders
    active_orders = session.exec(
        select(Order).where(Order.status != "cancelled")
    ).all()

    # Today's orders (non-cancelled)
    today = date.today()
    today_orders = [
        order for order in active_orders
        if order.created_at.date() == today
    ]

    # Calculate totals
    total_orders = len(active_orders)
    today_orders_count = len(today_orders)

    total_revenue = sum(float(order.total_amount) for order in active_orders)
    today_revenue = sum(float(order.total_amount) for order in today_orders)

    total_advances = sum(float(order.advance_payment) for order in active_orders)
    today_advances = sum(float(order.advance_payment) for order in today_orders)

    total_pending = sum(float(order.balance) for order in active_orders)
    today_pending = sum(float(order.balance) for order in today_orders)

    # Count by status
    pending_count = len([o for o in active_orders if o.status == "pending"])
    partial_count = len([o for o in active_orders if o.status == "partial"])
    paid_count = len([o for o in active_orders if o.status == "paid"])

    return {
        "total_orders": total_orders,
        "today_orders": today_orders_count,
        "total_revenue": round(total_revenue, 2),
        "today_revenue": round(today_revenue, 2),
        "total_advances": round(total_advances, 2),
        "today_advances": round(today_advances, 2),
        "total_pending": round(total_pending, 2),
        "today_pending": round(today_pending, 2),
        "pending_count": pending_count,
        "partial_count": partial_count,
        "paid_count": paid_count
    }


@router.get("/{order_id}", dependencies=[Depends(require_admin)])
def get_order(
    order_id: int,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    Get a single order by ID (admin only).
    """
    order = session.get(Order, order_id)

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    return {
        "id": order.id,
        "customer_name": order.customer_name,
        "customer_email": order.customer_email,
        "customer_phone": order.customer_phone,
        "customer_address": order.customer_address,
        "items": order.items,
        "manual_items": order.manual_items,
        "total_amount": str(order.total_amount),
        "advance_payment": str(order.advance_payment),
        "balance": str(order.balance),
        "delivery_date": order.delivery_date,
        "notes": order.notes,
        "status": order.status,
        "created_at": order.created_at.isoformat()
    }


@router.patch("/{order_id}", dependencies=[Depends(require_admin)])
def update_order(
    order_id: int,
    request: UpdateOrderRequest,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    Update an existing order (admin only).
    """
    order = session.get(Order, order_id)

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    # Update fields if provided
    if request.customer_name is not None:
        order.customer_name = request.customer_name
    if request.customer_email is not None:
        order.customer_email = request.customer_email
    if request.customer_phone is not None:
        order.customer_phone = request.customer_phone
    if request.customer_address is not None:
        order.customer_address = request.customer_address
    if request.delivery_date is not None:
        order.delivery_date = request.delivery_date
    if request.notes is not None:
        order.notes = request.notes

    # Update items if provided
    if request.items is not None:
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
        order.items = items_data

    # Update manual items if provided
    if request.manual_items is not None:
        manual_items_data = [
            {
                "name": item.name,
                "quantity_kg": item.quantity_kg,
                "price_per_kg": item.price_per_kg,
                "subtotal": item.quantity_kg * item.price_per_kg
            }
            for item in request.manual_items
        ]
        order.manual_items = manual_items_data

    # Update amounts if provided
    if request.total_amount is not None:
        order.total_amount = Decimal(str(request.total_amount))
    if request.advance_payment is not None:
        order.advance_payment = Decimal(str(request.advance_payment))

    # Recalculate balance
    order.balance = order.total_amount - order.advance_payment

    # Update or calculate status
    if request.status is not None:
        order.status = request.status
    else:
        # Auto-calculate status based on payment
        if order.balance == 0:
            order.status = "paid"
        elif order.advance_payment > 0:
            order.status = "partial"
        else:
            order.status = "pending"

    session.add(order)
    session.commit()
    session.refresh(order)

    return {
        "id": order.id,
        "customer_name": order.customer_name,
        "customer_email": order.customer_email,
        "customer_phone": order.customer_phone,
        "customer_address": order.customer_address,
        "items": order.items,
        "manual_items": order.manual_items,
        "total_amount": str(order.total_amount),
        "advance_payment": str(order.advance_payment),
        "balance": str(order.balance),
        "delivery_date": order.delivery_date,
        "notes": order.notes,
        "status": order.status,
        "created_at": order.created_at.isoformat()
    }


@router.post("/{order_id}/update-payment", dependencies=[Depends(require_admin)])
def update_payment(
    order_id: int,
    advance_payment: float,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    Update payment for an order (admin only).

    Use this to record additional payments or mark balance as received.
    Status is auto-calculated based on new payment amount.
    """
    order = session.get(Order, order_id)

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    # Update advance payment
    order.advance_payment = Decimal(str(advance_payment))

    # Recalculate balance
    order.balance = order.total_amount - order.advance_payment

    # Auto-calculate status
    if order.balance == 0:
        order.status = "paid"
    elif order.advance_payment > 0:
        order.status = "partial"
    else:
        order.status = "pending"

    session.add(order)
    session.commit()
    session.refresh(order)

    return {
        "id": order.id,
        "total_amount": str(order.total_amount),
        "advance_payment": str(order.advance_payment),
        "balance": str(order.balance),
        "status": order.status,
        "message": "Payment updated successfully"
    }


@router.post("/{order_id}/mark-paid", dependencies=[Depends(require_admin)])
def mark_paid(
    order_id: int,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    Mark order as fully paid (admin only).

    Sets advance_payment = total_amount, balance = 0, status = paid.
    """
    order = session.get(Order, order_id)

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    # Mark as fully paid
    order.advance_payment = order.total_amount
    order.balance = Decimal("0.00")
    order.status = "paid"

    session.add(order)
    session.commit()
    session.refresh(order)

    return {
        "id": order.id,
        "total_amount": str(order.total_amount),
        "advance_payment": str(order.advance_payment),
        "balance": str(order.balance),
        "status": order.status,
        "message": "Order marked as fully paid"
    }


@router.delete("/{order_id}", dependencies=[Depends(require_admin)])
def cancel_order(
    order_id: int,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    Cancel an order (soft delete - sets status to cancelled).
    """
    order = session.get(Order, order_id)

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    # Soft delete - set status to cancelled
    order.status = "cancelled"
    session.add(order)
    session.commit()

    return {"message": "Order cancelled successfully", "order_id": order_id}


@router.get("/{order_id}/invoice", dependencies=[Depends(require_admin)])
def download_invoice(
    order_id: int,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    Generate and download invoice PDF for an order (ADMIN only).

    Returns a professional PDF invoice with order details.
    """
    order = session.get(Order, order_id)

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    # Create PDF in memory
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=0.5*inch, leftMargin=0.5*inch, topMargin=0.5*inch, bottomMargin=0.5*inch)

    # Container for PDF elements
    elements = []
    styles = getSampleStyleSheet()

    # Logo
    import os
    logo_path = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'logo.jpeg')
    if os.path.exists(logo_path):
        logo = Image(logo_path, width=2*inch, height=1*inch)
        logo.hAlign = 'CENTER'
        elements.append(logo)
        elements.append(Spacer(1, 0.1*inch))

    # Title
    title_style = styles['Heading1']
    title_style.alignment = 1  # Center alignment
    title = Paragraph("<b>KN KITCHEN</b>", title_style)
    elements.append(title)
    elements.append(Spacer(1, 0.2*inch))

    # Invoice Header
    invoice_header_style = styles['Heading2']
    invoice_header_style.alignment = 1
    invoice_header = Paragraph(f"INVOICE #{order.id}", invoice_header_style)
    elements.append(invoice_header)
    elements.append(Spacer(1, 0.3*inch))

    # Order Information
    info_data = [
        ['Date:', order.created_at.strftime('%B %d, %Y')],
        ['Customer Name:', order.customer_name],
        ['Email:', order.customer_email],
        ['Phone:', order.customer_phone],
        ['Address:', order.customer_address],
    ]

    if order.delivery_date:
        info_data.append(['Delivery Date:', order.delivery_date])

    if order.notes:
        info_data.append(['Notes:', order.notes])

    info_data.append(['Order Taken By:', order.created_by_name])

    info_table = Table(info_data, colWidths=[2*inch, 5*inch])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 0.4*inch))

    # Items Table Header
    items_header_style = styles['Heading3']
    items_header = Paragraph("<b>Order Items</b>", items_header_style)
    elements.append(items_header)
    elements.append(Spacer(1, 0.1*inch))

    # Items Table
    items_data = [['Item Name', 'Quantity (kg)', 'Rate (Rs/kg)', 'Amount (Rs)']]

    for item in order.items:
        items_data.append([
            item['item_name'],
            f"{item['quantity_kg']:.2f}",
            f"Rs {float(item['price_per_kg']):,.2f}",
            f"Rs {float(item['subtotal']):,.2f}"
        ])

    # Add manual items to the table
    if order.manual_items:
        for item in order.manual_items:
            items_data.append([
                item['name'],
                f"{item['quantity_kg']:.2f}",
                f"Rs {float(item['price_per_kg']):,.2f}",
                f"Rs {float(item['subtotal']):,.2f}"
            ])

    items_table = Table(items_data, colWidths=[3*inch, 1.5*inch, 1.5*inch, 1.5*inch])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 0.3*inch))

    # Payment Summary
    summary_data = [
        ['Total Amount:', f"Rs {float(order.total_amount):,.2f}"],
        ['Advance Payment:', f"Rs {float(order.advance_payment):,.2f}"],
        ['Balance Due:', f"Rs {float(order.balance):,.2f}"],
        ['Payment Status:', order.status.upper()],
    ]

    summary_table = Table(summary_data, colWidths=[4.5*inch, 2.5*inch])
    summary_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -2), 11),
        ('FONTSIZE', (0, -2), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('LINEABOVE', (0, -2), (-1, -2), 2, colors.black),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 0.5*inch))

    # Footer
    footer_style = styles['Normal']
    footer_style.alignment = 1
    footer_style.fontSize = 9
    footer_style.textColor = colors.grey
    footer = Paragraph("Thank you for your business!<br/>KN KITCHEN - Quality Catering Services", footer_style)
    elements.append(footer)

    # Build PDF
    doc.build(elements)

    # Reset buffer position
    buffer.seek(0)

    # Return PDF as response
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=invoice_{order.id}_{order.customer_name.replace(' ', '_')}.pdf"
        }
    )
