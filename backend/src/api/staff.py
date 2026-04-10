"""
Staff API endpoints for employee management.
Handles staff CRUD operations and payroll calculations.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, func
from typing import List, Optional
from decimal import Decimal
from datetime import datetime

from ..database import get_session
from ..models import Staff, StaffTransaction, TransactionType
from ..middleware.auth import verify_jwt, require_admin

router = APIRouter()


@router.get("/")
def get_staff(
    session: Session = Depends(get_session),
    skip: int = 0,
    limit: int = 100
):
    """
    Fetch all staff members with their payroll summary.

    Returns list of staff with:
    - Basic info (id, name, role, monthly_salary)
    - Total advances paid
    - Remaining salary (Monthly_Salary - Total_Advances)
    """
    try:
        staff_members = session.exec(
            select(Staff)
            .offset(skip)
            .limit(limit)
            .order_by(Staff.created_at.desc())
        ).all()

        result = []
        for staff in staff_members:
            # Calculate total advances
            total_advances = session.exec(
                select(func.sum(StaffTransaction.amount))
                .where(
                    (StaffTransaction.staff_id == staff.id) &
                    (StaffTransaction.transaction_type == TransactionType.ADVANCE.value)
                )
            ).first() or Decimal("0.00")

            # Calculate remaining salary
            remaining_salary = staff.monthly_salary - total_advances

            result.append({
                "id": staff.id,
                "name": staff.name,
                "role": staff.role,
                "monthly_salary": float(staff.monthly_salary),
                "total_advances": float(total_advances),
                "remaining_salary": float(remaining_salary),
                "created_at": staff.created_at.isoformat(),
            })

        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching staff: {str(e)}"
        )


@router.get("/{staff_id}")
def get_staff_member(
    staff_id: int,
    session: Session = Depends(get_session)
):
    """
    Fetch a single staff member with detailed payroll information.
    """
    try:
        staff = session.get(Staff, staff_id)
        if not staff:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Staff member {staff_id} not found"
            )

        # Calculate total advances
        total_advances = session.exec(
            select(func.sum(StaffTransaction.amount))
            .where(
                (StaffTransaction.staff_id == staff_id) &
                (StaffTransaction.transaction_type == TransactionType.ADVANCE.value)
            )
        ).first() or Decimal("0.00")

        # Calculate total salary payments
        total_salary_paid = session.exec(
            select(func.sum(StaffTransaction.amount))
            .where(
                (StaffTransaction.staff_id == staff_id) &
                (StaffTransaction.transaction_type == TransactionType.SALARY.value)
            )
        ).first() or Decimal("0.00")

        # Get all transactions
        transactions = session.exec(
            select(StaffTransaction)
            .where(StaffTransaction.staff_id == staff_id)
            .order_by(StaffTransaction.date.desc())
        ).all()

        remaining_salary = staff.monthly_salary - total_advances

        return {
            "id": staff.id,
            "name": staff.name,
            "role": staff.role,
            "monthly_salary": float(staff.monthly_salary),
            "total_advances": float(total_advances),
            "total_salary_paid": float(total_salary_paid),
            "remaining_salary": float(remaining_salary),
            "transactions": [
                {
                    "id": t.id,
                    "amount": float(t.amount),
                    "transaction_type": t.transaction_type,
                    "date": t.date.isoformat(),
                }
                for t in transactions
            ],
            "created_at": staff.created_at.isoformat(),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching staff member: {str(e)}"
        )


@router.post("/", dependencies=[Depends(verify_jwt), Depends(require_admin)])
def create_staff(
    name: str,
    role: str,
    monthly_salary: Decimal,
    session: Session = Depends(get_session)
):
    """
    Create a new staff member.
    Requires admin authentication.

    Args:
        name: Staff member name
        role: Job role/position
        monthly_salary: Monthly salary amount
    """
    try:
        if not name.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Staff name is required"
            )

        if monthly_salary <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Monthly salary must be greater than 0"
            )

        # Check if staff already exists
        existing = session.exec(
            select(Staff).where(Staff.name == name.strip())
        ).first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Staff member '{name}' already exists"
            )

        new_staff = Staff(
            name=name.strip(),
            role=role.strip(),
            monthly_salary=monthly_salary
        )

        session.add(new_staff)
        session.commit()
        session.refresh(new_staff)

        return {
            "id": new_staff.id,
            "name": new_staff.name,
            "role": new_staff.role,
            "monthly_salary": float(new_staff.monthly_salary),
            "total_advances": 0.0,
            "remaining_salary": float(new_staff.monthly_salary),
            "created_at": new_staff.created_at.isoformat(),
        }
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating staff member: {str(e)}"
        )


@router.put("/{staff_id}", dependencies=[Depends(verify_jwt), Depends(require_admin)])
def update_staff(
    staff_id: int,
    name: Optional[str] = None,
    role: Optional[str] = None,
    monthly_salary: Optional[Decimal] = None,
    session: Session = Depends(get_session)
):
    """
    Update staff information.
    Requires admin authentication.
    """
    try:
        staff = session.get(Staff, staff_id)
        if not staff:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Staff member {staff_id} not found"
            )

        if name:
            staff.name = name.strip()
        if role:
            staff.role = role.strip()
        if monthly_salary and monthly_salary > 0:
            staff.monthly_salary = monthly_salary

        session.add(staff)
        session.commit()
        session.refresh(staff)

        # Calculate totals
        total_advances = session.exec(
            select(func.sum(StaffTransaction.amount))
            .where(
                (StaffTransaction.staff_id == staff_id) &
                (StaffTransaction.transaction_type == TransactionType.ADVANCE.value)
            )
        ).first() or Decimal("0.00")

        remaining_salary = staff.monthly_salary - total_advances

        return {
            "id": staff.id,
            "name": staff.name,
            "role": staff.role,
            "monthly_salary": float(staff.monthly_salary),
            "total_advances": float(total_advances),
            "remaining_salary": float(remaining_salary),
            "created_at": staff.created_at.isoformat(),
        }
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating staff member: {str(e)}"
        )


@router.delete("/{staff_id}", dependencies=[Depends(verify_jwt), Depends(require_admin)])
def delete_staff(
    staff_id: int,
    session: Session = Depends(get_session)
):
    """
    Delete a staff member (only if no transactions exist).
    Requires admin authentication.
    """
    try:
        staff = session.get(Staff, staff_id)
        if not staff:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Staff member {staff_id} not found"
            )

        # Check if staff has transactions
        transaction_count = session.exec(
            select(func.count(StaffTransaction.id))
            .where(StaffTransaction.staff_id == staff_id)
        ).first()

        if transaction_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete staff member with {transaction_count} transactions"
            )

        session.delete(staff)
        session.commit()

        return {
            "success": True,
            "message": f"Staff member '{staff.name}' deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting staff member: {str(e)}"
        )
