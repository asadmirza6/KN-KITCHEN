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
from reportlab.platypus import Table as RLTable
from reportlab.pdfgen import canvas
import os

from ..database import get_session
from ..models import Order, User, Recipe, Inventory
from ..middleware.auth import verify_jwt, require_admin, require_staff_or_admin


class WatermarkedDocTemplate(SimpleDocTemplate):
    """Custom PDF template with watermark support"""
    def __init__(self, *args, watermark_path=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.watermark_path = watermark_path

    def build(self, flowables, onFirstPage=None, onLaterPages=None, canvasmaker=canvas.Canvas):
        """Build PDF with watermark on each page"""
        def add_watermark(canvas_obj, doc):
            if self.watermark_path and os.path.exists(self.watermark_path):
                canvas_obj.saveState()
                canvas_obj.setFillAlpha(0.08)

                # Calculate watermark size (80% of page width, maintaining aspect ratio)
                page_width = letter[0]
                page_height = letter[1]
                watermark_width = page_width * 0.8
                watermark_height = watermark_width * 0.5  # Maintain 2:1 aspect ratio

                # Center watermark on page
                x = (page_width - watermark_width) / 2
                y = (page_height - watermark_height) / 2

                # Draw watermark behind all content
                img = Image(self.watermark_path, width=watermark_width, height=watermark_height)
                img.drawOn(canvas_obj, x, y)
                canvas_obj.restoreState()

        # Apply watermark to all pages
        super().build(flowables, onFirstPage=add_watermark, onLaterPages=add_watermark, canvasmaker=canvasmaker)


router = APIRouter()


def deduct_inventory_for_order(order: Order, session: Session) -> dict:
    """
    Deduct inventory when order status changes to "Processing".

    For each item in the order:
    1. Look up Recipe for that item (product_id)
    2. For each ingredient in the recipe, subtract (quantity * recipe.quantity_required) from inventory
    3. Prevent negative stock with validation

    Returns: dict with deduction details or error
    """
    try:
        deduction_details = []

        # Process each item in the order
        for item in order.items:
            item_id = item.get('item_id')
            quantity_ordered = item.get('quantity_kg', 0)

            if not item_id or quantity_ordered <= 0:
                continue

            # Get recipes for this product
            recipes = session.exec(
                select(Recipe).where(Recipe.product_id == item_id)
            ).all()

            if not recipes:
                # No recipe found - skip this item
                deduction_details.append({
                    "item_id": item_id,
                    "item_name": item.get('item_name'),
                    "status": "skipped",
                    "reason": "No recipe found"
                })
                continue

            # Deduct each ingredient
            for recipe in recipes:
                ingredient = session.get(Inventory, recipe.ingredient_id)
                if not ingredient:
                    continue

                # Calculate quantity to deduct
                quantity_to_deduct = quantity_ordered * recipe.quantity_required

                # Check if sufficient stock exists
                if ingredient.current_stock < quantity_to_deduct:
                    return {
                        "success": False,
                        "error": f"Insufficient stock for {ingredient.item_name}. Required: {quantity_to_deduct}, Available: {ingredient.current_stock}"
                    }

                # Deduct from inventory
                ingredient.current_stock -= quantity_to_deduct
                ingredient.updated_at = datetime.utcnow()
                session.add(ingredient)

                deduction_details.append({
                    "ingredient_id": recipe.ingredient_id,
                    "ingredient_name": ingredient.item_name,
                    "quantity_deducted": quantity_to_deduct,
                    "remaining_stock": ingredient.current_stock
                })

        session.commit()

        return {
            "success": True,
            "deductions": deduction_details
        }
    except Exception as e:
        session.rollback()
        return {
            "success": False,
            "error": f"Error deducting inventory: {str(e)}"
        }


def calculate_profit_for_order(order: Order, session: Session) -> dict:
    """
    Calculate profit when order is completed.

    For each item in the order:
    - Revenue = Sale Price * Quantity
    - Cost = Sum of (Quantity * Recipe Qty * Ingredient Avg Price)
    - Profit = Revenue - Cost

    Returns: dict with profit details
    """
    try:
        total_revenue = Decimal("0.00")
        total_cost = Decimal("0.00")
        profit_details = []
        warnings = []

        for item in order.items:
            item_id = item.get('item_id')
            quantity = Decimal(str(item.get('quantity_kg', 0)))
            sale_price = Decimal(str(item.get('price_per_kg', 0)))

            if not item_id or quantity <= 0:
                continue

            # Get recipes for this product to calculate cost
            recipes = session.exec(
                select(Recipe).where(Recipe.product_id == item_id)
            ).all()

            item_cost = Decimal("0.00")

            # If no recipe found, warn user
            if not recipes:
                warnings.append(f"Recipe missing for item {item.get('item_name')} - Profit cannot be calculated accurately")
                # Use sale price as cost estimate if no recipe
                item_cost = quantity * sale_price * Decimal("0.5")  # Assume 50% cost
            else:
                # Calculate total cost based on ingredients
                for recipe in recipes:
                    ingredient = session.get(Inventory, recipe.ingredient_id)
                    if ingredient:
                        ingredient_cost = quantity * Decimal(str(recipe.quantity_required)) * ingredient.average_price
                        item_cost += ingredient_cost

            # Calculate revenue and profit for this item
            item_revenue = quantity * sale_price
            item_profit = item_revenue - item_cost

            total_revenue += item_revenue
            total_cost += item_cost

            profit_details.append({
                "item_id": item_id,
                "item_name": item.get('item_name'),
                "quantity": float(quantity),
                "sale_price": float(sale_price),
                "revenue": float(item_revenue),
                "cost": float(item_cost),
                "profit": float(item_profit)
            })

        # Calculate net profit (revenue - cost)
        net_profit = total_revenue - total_cost

        print(f"DEBUG: Profit Calculation for Order {order.id}")
        print(f"  Total Revenue: {total_revenue}")
        print(f"  Total Cost: {total_cost}")
        print(f"  Net Profit: {net_profit}")
        if warnings:
            print(f"  Warnings: {warnings}")

        return {
            "success": True,
            "total_revenue": float(total_revenue),
            "total_cost": float(total_cost),
            "net_profit": float(net_profit),
            "profit_margin": float((net_profit / total_revenue * 100) if total_revenue > 0 else 0),
            "profit_details": profit_details,
            "warnings": warnings
        }
    except Exception as e:
        print(f"DEBUG: Error calculating profit: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": f"Error calculating profit: {str(e)}"
        }


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
    customer_email: str | None = None
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

    # NOTE: Manual items are stored ONLY in manual_items field, NOT in items array
    # This prevents duplicate entries in PDF and order display

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
            "created_by_name": order.created_by_name,
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


@router.get("/profit/summary", dependencies=[Depends(require_admin)])
def get_profit_summary(
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    Get profit summary for dashboard (admin only).
    Returns today's profit, weekly profit, and profit breakdown by dish.
    """
    from sqlalchemy import func
    from datetime import date, timedelta

    # Get all completed orders
    completed_orders = session.exec(
        select(Order).where(Order.status == "Completed")
    ).all()

    # Today's completed orders
    today = date.today()
    today_orders = [
        order for order in completed_orders
        if order.created_at.date() == today
    ]

    # This week's completed orders
    week_start = today - timedelta(days=today.weekday())
    week_orders = [
        order for order in completed_orders
        if order.created_at.date() >= week_start
    ]

    # Calculate profit for orders
    def calculate_order_profit(order: Order) -> dict:
        profit_result = calculate_profit_for_order(order, session)
        if profit_result.get("success"):
            return {
                "order_id": order.id,
                "revenue": profit_result.get("total_revenue", 0),
                "cost": profit_result.get("total_cost", 0),
                "profit": profit_result.get("net_profit", 0),
                "margin": profit_result.get("profit_margin", 0)
            }
        return {
            "order_id": order.id,
            "revenue": float(order.total_amount),
            "cost": 0,
            "profit": 0,
            "margin": 0
        }

    # Calculate totals
    today_profit_data = [calculate_order_profit(o) for o in today_orders]
    week_profit_data = [calculate_order_profit(o) for o in week_orders]

    today_revenue = sum(p["revenue"] for p in today_profit_data)
    today_cost = sum(p["cost"] for p in today_profit_data)
    today_profit = sum(p["profit"] for p in today_profit_data)

    week_revenue = sum(p["revenue"] for p in week_profit_data)
    week_cost = sum(p["cost"] for p in week_profit_data)
    week_profit = sum(p["profit"] for p in week_profit_data)

    total_revenue = sum(float(o.total_amount) for o in completed_orders)
    total_profit_all = sum(calculate_order_profit(o)["profit"] for o in completed_orders)

    return {
        "today": {
            "orders_count": len(today_orders),
            "revenue": round(today_revenue, 2),
            "cost": round(today_cost, 2),
            "profit": round(today_profit, 2),
            "margin": round((today_profit / today_revenue * 100) if today_revenue > 0 else 0, 2)
        },
        "this_week": {
            "orders_count": len(week_orders),
            "revenue": round(week_revenue, 2),
            "cost": round(week_cost, 2),
            "profit": round(week_profit, 2),
            "margin": round((week_profit / week_revenue * 100) if week_revenue > 0 else 0, 2)
        },
        "all_time": {
            "orders_count": len(completed_orders),
            "revenue": round(total_revenue, 2),
            "profit": round(total_profit_all, 2),
            "avg_profit_per_order": round(total_profit_all / len(completed_orders), 2) if completed_orders else 0
        }
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

    CRITICAL: When status changes to "Processing", automatically deduct inventory based on recipes.
    When status changes to "Completed", calculate profit.
    """
    order = session.get(Order, order_id)

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    old_status = order.status
    new_status = request.status if request.status is not None else old_status

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

    # CRITICAL: Handle status transitions
    status_change_info = {}

    # When status changes to "Processing", deduct inventory
    if old_status != "Processing" and order.status == "Processing":
        deduction_result = deduct_inventory_for_order(order, session)
        if not deduction_result.get("success"):
            session.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=deduction_result.get("error", "Failed to deduct inventory")
            )
        status_change_info["inventory_deduction"] = deduction_result

    # When status changes to "Completed", calculate profit
    if old_status != "Completed" and order.status == "Completed":
        profit_result = calculate_profit_for_order(order, session)
        if profit_result.get("success"):
            # Save profit data to order
            order.calculated_profit = Decimal(str(profit_result.get("net_profit", 0)))
            order.total_cost = Decimal(str(profit_result.get("total_cost", 0)))
            order.profit_margin = Decimal(str(profit_result.get("profit_margin", 0)))
            status_change_info["profit_calculation"] = profit_result
        else:
            # If profit calculation fails, show warning
            status_change_info["profit_warning"] = profit_result.get("error", "Could not calculate profit")

    session.add(order)
    session.commit()
    session.refresh(order)

    response = {
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
        "calculated_profit": str(order.calculated_profit),
        "total_cost": str(order.total_cost),
        "profit_margin": str(order.profit_margin),
        "created_at": order.created_at.isoformat()
    }

    if status_change_info:
        response["status_change_info"] = status_change_info

    return response


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

    # Extract all order data before session closes
    order_id_val = order.id
    order_created_at = order.created_at
    order_created_by_name = order.created_by_name
    order_customer_name = order.customer_name
    order_customer_phone = order.customer_phone
    order_customer_address = order.customer_address
    order_customer_email = order.customer_email
    order_delivery_date = order.delivery_date
    order_notes = order.notes
    order_items = order.items
    order_manual_items = order.manual_items
    order_total_amount = order.total_amount
    order_advance_payment = order.advance_payment
    order_balance = order.balance
    order_discount = order.discount or 0
    order_status = order.status

    # Create PDF in memory with watermark
    buffer = BytesIO()
    logo_path = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'logo.jpeg')
    doc = WatermarkedDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.5*inch,
        leftMargin=0.5*inch,
        topMargin=0.5*inch,
        bottomMargin=1.2*inch,
        watermark_path=logo_path
    )

    # Container for PDF elements
    elements = []
    styles = getSampleStyleSheet()

    # ===== HEADER SECTION =====
    # Invoice # in center at top
    invoice_data = [["INVOICE #" + str(order_id_val)]]
    invoice_table = RLTable(invoice_data, colWidths=[6.9*inch])
    invoice_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, 0), 'CENTER'),
        ('FONTSIZE', (0, 0), (0, 0), 20),
        ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(invoice_table)

    # Date on right side
    date_data = [[f"Date: {order_created_at.strftime('%B %d, %Y')}"]]
    date_table = RLTable(date_data, colWidths=[6.9*inch])
    date_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, 0), 'RIGHT'),
        ('FONTSIZE', (0, 0), (0, 0), 9),
        ('FONTNAME', (0, 0), (0, 0), 'Helvetica'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
    ]))
    elements.append(date_table)
    elements.append(Spacer(1, 0.3*inch))

    # ===== CUSTOMER DETAILS BOX (Bordered) =====
    # Add Customer Details heading
    customer_heading_style = styles['Normal']
    customer_heading_style.alignment = 1  # Center
    customer_heading_style.fontSize = 12
    customer_heading_style.fontName = 'Helvetica-Bold'
    customer_heading = Paragraph("Customer Details", customer_heading_style)
    elements.append(customer_heading)
    elements.append(Spacer(1, 0.15*inch))

    # Build customer details as one continuous text block
    customer_text = f"Created By: {order_created_by_name}\n\n"
    customer_text += f"Name: {order_customer_name}\n"
    customer_text += f"Phone: {order_customer_phone}\n"
    customer_text += f"Address: {order_customer_address}\n"
    customer_text += f"Email: {order_customer_email}\n"

    if order_delivery_date:
        customer_text += f"Delivery Date: {order_delivery_date}\n"

    if order_notes:
        customer_text += f"Special Note: {order_notes}\n"

    # Create single cell with border
    customer_data = [[customer_text]]
    customer_table = Table(customer_data, colWidths=[6.9*inch])
    customer_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 1.5, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(customer_table)
    elements.append(Spacer(1, 0.3*inch))

    # ===== ITEMS TABLE (Centered) =====
    items_data = [['Item Name', 'Quantity (kg)', 'Rate (Rs/kg)', 'Amount (Rs)']]

    for item in order_items:
        items_data.append([
            item['item_name'],
            f"{item['quantity_kg']:.2f}",
            f"Rs {float(item['price_per_kg']):,.2f}",
            f"Rs {float(item['subtotal']):,.2f}"
        ])

    # Add manual items to the table
    if order_manual_items:
        for item in order_manual_items:
            items_data.append([
                item['name'],
                f"{item['quantity_kg']:.2f}",
                f"Rs {float(item['price_per_kg']):,.2f}",
                f"Rs {float(item['subtotal']):,.2f}"
            ])

    items_table = Table(items_data, colWidths=[2.8*inch, 1.3*inch, 1.4*inch, 1.4*inch])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#DC143C')),  # Red header
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),  # Black text on red
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('BACKGROUND', (0, 1), (-1, -1), colors.transparent),  # Transparent rows
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.transparent, colors.transparent]),
    ]))

    # Center the items table with spacers
    elements.append(Spacer(1, 0.2*inch))

    # Add Order Items heading
    items_heading_style = styles['Normal']
    items_heading_style.alignment = 1  # Center
    items_heading_style.fontSize = 12
    items_heading_style.fontName = 'Helvetica-Bold'
    items_heading = Paragraph("Order Items", items_heading_style)
    elements.append(items_heading)
    elements.append(Spacer(1, 0.15*inch))

    elements.append(items_table)

    # Add big spacer to push summary to bottom
    elements.append(Spacer(1, 1.5*inch))

    # ===== AMOUNT BOX (Right Aligned, at bottom) =====
    summary_data = [
        ['Subtotal:', f"Rs {float(order_total_amount) + float(order_discount):,.2f}"],
    ]

    # Add discount if present and greater than 0
    if order_discount > 0:
        summary_data.append(['Discount:', f"Rs {order_discount:,.2f}"])

    summary_data.extend([
        ['Advance Payment:', f"Rs {float(order_advance_payment):,.2f}"],
        ['Balance Due:', f"Rs {float(order_balance):,.2f}"],
        ['Status:', order_status.upper()],
    ])

    summary_table = Table(summary_data, colWidths=[3.5*inch, 2.4*inch])
    summary_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -2), 9),
        ('FONTSIZE', (0, -2), (-1, -1), 11),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('LINEABOVE', (0, -2), (-1, -2), 2, colors.black),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 0.2*inch))

    # ===== THANK YOU MESSAGE (Below Summary) =====
    footer_style = styles['Normal']
    footer_style.alignment = 1  # Center
    footer_style.fontSize = 10
    footer_style.textColor = colors.grey
    footer = Paragraph("Thank you for choosing KN KITCHEN", footer_style)
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
            "Content-Disposition": f"attachment; filename=invoice_{order_id}_{order_customer_name.replace(' ', '_')}.pdf"
        }
    )


class StatusUpdateRequest(BaseModel):
    status: str


@router.put("/{order_id}/status", dependencies=[Depends(require_admin)])
def update_order_status(order_id: int, request: StatusUpdateRequest, session: Session = Depends(get_session)):
    """Update order status and trigger inventory deduction or profit calculation"""
    import logging
    logger = logging.getLogger(__name__)

    order = session.exec(select(Order).where(Order.id == order_id)).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    old_status = order.status
    new_status = request.status

    logger.info(f"Updating Order {order_id} status from {old_status} to {new_status}")
    logger.info(f"Order items: {order.items}")

    response_data = {
        "id": order.id,
        "status": new_status,
        "message": f"Order status changed from {old_status} to {new_status}"
    }

    try:
        # If changing to Processing, deduct inventory
        if new_status == "Processing":
            logger.info(f"Processing inventory deduction for Order {order_id}")
            items_list = order.items if isinstance(order.items, list) else []
            logger.info(f"Items list: {items_list}")

            for item in items_list:
                item_id = item.get('item_id')
                quantity = float(item.get('quantity_kg', 0))
                item_name = item.get('item_name', 'Unknown')

                logger.info(f"Processing item {item_id} ({item_name}) with quantity {quantity}")

                # Get all recipes for this item
                recipes = session.exec(select(Recipe).where(Recipe.product_id == item_id)).all()
                logger.info(f"Found {len(recipes)} recipes for item {item_id}")

                if not recipes:
                    logger.warning(f"No recipes found for item {item_id}")
                    continue

                for recipe in recipes:
                    inventory = session.exec(select(Inventory).where(Inventory.id == recipe.ingredient_id)).first()
                    if not inventory:
                        logger.warning(f"Inventory not found for ingredient {recipe.ingredient_id}")
                        continue

                    deduction = quantity * float(recipe.quantity_required)
                    current_qty = float(inventory.current_stock)

                    logger.info(f"Ingredient: {inventory.item_name}, Current: {current_qty}, Need: {deduction}")

                    if current_qty < deduction:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Insufficient {inventory.item_name}. Need {deduction}, have {current_qty}"
                        )

                    inventory.current_stock = current_qty - deduction
                    session.add(inventory)
                    logger.info(f"Deducted {deduction} from {inventory.item_name}")

            session.commit()
            response_data["inventory_deducted"] = True
            logger.info(f"Inventory deduction complete for Order {order_id}")

        # If changing to Completed, calculate profit
        elif new_status == "Completed":
            logger.info(f"Calculating profit for Order {order_id}")
            total_revenue = Decimal('0')
            total_cost = Decimal('0')
            profit_details = []
            warnings = []

            items_list = order.items if isinstance(order.items, list) else []

            for item in items_list:
                item_id = item.get('item_id')
                quantity = float(item.get('quantity_kg', 0))
                price = float(item.get('price_per_kg', 0))
                item_name = item.get('item_name', 'Unknown')

                item_revenue = Decimal(str(quantity)) * Decimal(str(price))
                total_revenue += item_revenue
                logger.info(f"Item {item_name}: Qty={quantity}, Price={price}, Revenue={item_revenue}")

                # Get all recipes for this item
                recipes = session.exec(select(Recipe).where(Recipe.product_id == item_id)).all()
                logger.info(f"Found {len(recipes)} recipes for item {item_id}")

                if not recipes:
                    warnings.append(f"Recipe missing for {item_name}")
                    item_cost = item_revenue * Decimal('0.5')
                    logger.warning(f"No recipe for {item_name}, estimating cost as 50%")
                else:
                    item_cost = Decimal('0')
                    for recipe in recipes:
                        inventory = session.exec(select(Inventory).where(Inventory.id == recipe.ingredient_id)).first()
                        if inventory:
                            ingredient_cost = Decimal(str(quantity)) * Decimal(str(recipe.quantity_required)) * Decimal(str(inventory.average_price or 0))
                            item_cost += ingredient_cost
                            logger.info(f"  {inventory.item_name}: {ingredient_cost}")

                total_cost += item_cost
                profit_details.append({
                    "item_id": item_id,
                    "item_name": item_name,
                    "quantity": quantity,
                    "sale_price": price,
                    "revenue": float(item_revenue),
                    "cost": float(item_cost),
                    "profit": float(item_revenue - item_cost)
                })

            net_profit = total_revenue - total_cost
            profit_margin = (net_profit / total_revenue * 100) if total_revenue > 0 else Decimal('0')

            order.calculated_profit = net_profit
            order.total_cost = total_cost
            order.profit_margin = profit_margin

            logger.info(f"Profit: Revenue={total_revenue}, Cost={total_cost}, Profit={net_profit}, Margin={profit_margin}%")

            response_data["profit_calculation"] = {
                "success": True,
                "total_revenue": float(total_revenue),
                "total_cost": float(total_cost),
                "net_profit": float(net_profit),
                "profit_margin": float(profit_margin),
                "profit_details": profit_details,
                "warnings": warnings
            }

        # Update status
        order.status = new_status
        session.add(order)
        session.commit()
        session.refresh(order)

        logger.info(f"✅ Order {order_id} status updated to {new_status}")
        return response_data

    except HTTPException as http_e:
        session.rollback()
        logger.error(f"HTTP Exception: {str(http_e)}")
        raise
    except Exception as e:
        session.rollback()
        logger.error(f"❌ Error updating order: {str(e)}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Error: {str(e)}")

