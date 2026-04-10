"""
Staff Transaction API endpoints for payroll management.
Handles salary advances and salary payments with validation.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Form
from sqlmodel import Session, select, func
from typing import List
from decimal import Decimal
from datetime import datetime

from ..database import get_session
from ..models import StaffTransaction, Staff, TransactionType
from ..middleware.auth import verify_jwt, require_admin

router = APIRouter()


@router.get("/")
def get_staff_transactions(
    session: Session = Depends(get_session),
    staff_id: int = None,
    transaction_type: str = None,
    skip: int = 0,
    limit: int = 100
):
    """
    Fetch all staff transactions with optional filters.

    Returns list of transactions with staff and amount details.
    """
    try:
        query = select(StaffTransaction)

        if staff_id:
            query = query.where(StaffTransaction.staff_id == staff_id)

        if transaction_type:
            query = query.where(StaffTransaction.transaction_type == transaction_type)

        transactions = session.exec(
            query.offset(skip).limit(limit).order_by(StaffTransaction.date.desc())
        ).all()

        return [
            {
                "id": t.id,
                "staff_id": t.staff_id,
                "staff_name": t.staff.name if t.staff else None,
                "amount": float(t.amount),
                "transaction_type": t.transaction_type,
                "date": t.date.isoformat(),
            }
            for t in transactions
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching staff transactions: {str(e)}"
        )


@router.get("/{transaction_id}")
def get_staff_transaction(
    transaction_id: int,
    session: Session = Depends(get_session)
):
    """
    Fetch a single staff transaction by ID.
    """
    try:
        transaction = session.get(StaffTransaction, transaction_id)
        if not transaction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Staff transaction {transaction_id} not found"
            )

        return {
            "id": transaction.id,
            "staff_id": transaction.staff_id,
            "staff_name": transaction.staff.name if transaction.staff else None,
            "amount": float(transaction.amount),
            "transaction_type": transaction.transaction_type,
            "date": transaction.date.isoformat(),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching staff transaction: {str(e)}"
        )


@router.post("/", dependencies=[Depends(verify_jwt), Depends(require_admin)])
def create_staff_transaction(
    staff_id: str = Form(...),
    amount: str = Form(...),
    transaction_type: str = Form(...),
    session: Session = Depends(get_session)
):
    """
    Create a new staff transaction (Advance or Salary payment).

    CRITICAL LOGIC:
    - For ADVANCE: Validate that total advances don't exceed monthly salary
    - For SALARY: Record salary payment
    - Calculate remaining salary after advances

    Requires admin authentication.

    Args:
        staff_id: ID of the staff member
        amount: Transaction amount
        transaction_type: Type of transaction (Advance or Salary)
    """
    try:
        # Convert staff_id from string to int
        try:
            staff_id_int = int(staff_id)
        except:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Staff ID must be a valid number"
            )

        # Convert amount from string to Decimal
        try:
            amount_decimal = Decimal(amount)
        except:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Amount must be a valid number"
            )

        # Validate staff exists
        staff = session.get(Staff, staff_id_int)
        if not staff:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Staff member {staff_id_int} not found"
            )

        # Validate amount
        if amount_decimal <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Transaction amount must be greater than 0"
            )

        # Validate transaction type
        if transaction_type not in [TransactionType.ADVANCE.value, TransactionType.SALARY.value]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid transaction type. Must be '{TransactionType.ADVANCE.value}' or '{TransactionType.SALARY.value}'"
            )

        # CRITICAL: For ADVANCE transactions, validate against monthly salary
        if transaction_type == TransactionType.ADVANCE.value:
            # Calculate current total advances
            current_advances = session.exec(
                select(func.sum(StaffTransaction.amount))
                .where(
                    (StaffTransaction.staff_id == staff_id_int) &
                    (StaffTransaction.transaction_type == TransactionType.ADVANCE.value)
                )
            ).first() or Decimal("0.00")

            # Check if new advance would exceed monthly salary
            total_advances_after = current_advances + amount_decimal

            if total_advances_after > staff.monthly_salary:
                remaining_available = staff.monthly_salary - current_advances
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Advance amount exceeds available salary. Current advances: {float(current_advances)}, Monthly salary: {float(staff.monthly_salary)}, Available for advance: {float(remaining_available)}"
                )

        # Create transaction
        new_transaction = StaffTransaction(
            staff_id=staff_id_int,
            amount=amount_decimal,
            transaction_type=transaction_type,
            date=datetime.utcnow()
        )

        session.add(new_transaction)
        session.commit()
        session.refresh(new_transaction)

        # Calculate updated payroll info
        total_advances = session.exec(
            select(func.sum(StaffTransaction.amount))
            .where(
                (StaffTransaction.staff_id == staff_id_int) &
                (StaffTransaction.transaction_type == TransactionType.ADVANCE.value)
            )
        ).first() or Decimal("0.00")

        remaining_salary = staff.monthly_salary - total_advances

        return {
            "id": new_transaction.id,
            "staff_id": new_transaction.staff_id,
            "staff_name": staff.name,
            "amount": float(new_transaction.amount),
            "transaction_type": new_transaction.transaction_type,
            "date": new_transaction.date.isoformat(),
            "payroll_summary": {
                "monthly_salary": float(staff.monthly_salary),
                "total_advances": float(total_advances),
                "remaining_salary": float(remaining_salary),
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating staff transaction: {str(e)}"
        )


@router.delete("/{transaction_id}", dependencies=[Depends(verify_jwt), Depends(require_admin)])
def delete_staff_transaction(
    transaction_id: int,
    session: Session = Depends(get_session)
):
    """
    Delete a staff transaction (reverses the advance or salary payment).
    Requires admin authentication.
    """
    try:
        transaction = session.get(StaffTransaction, transaction_id)
        if not transaction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Staff transaction {transaction_id} not found"
            )

        staff_id = transaction.staff_id
        staff = session.get(Staff, staff_id)

        session.delete(transaction)
        session.commit()

        # Calculate updated payroll info
        total_advances = session.exec(
            select(func.sum(StaffTransaction.amount))
            .where(
                (StaffTransaction.staff_id == staff_id) &
                (StaffTransaction.transaction_type == TransactionType.ADVANCE.value)
            )
        ).first() or Decimal("0.00")

        remaining_salary = staff.monthly_salary - total_advances

        return {
            "success": True,
            "message": f"Staff transaction {transaction_id} deleted successfully",
            "payroll_summary": {
                "monthly_salary": float(staff.monthly_salary),
                "total_advances": float(total_advances),
                "remaining_salary": float(remaining_salary),
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting staff transaction: {str(e)}"
        )
