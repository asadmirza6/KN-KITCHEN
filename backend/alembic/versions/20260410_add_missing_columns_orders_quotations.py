"""Add missing columns to orders and quotations tables.

Revision ID: 20260410_001
Revises: a1b2c3d4e5f6
Create Date: 2026-04-10 04:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20260410_001'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add missing columns to orders and quotations tables."""

    # Add discount column to orders if it doesn't exist
    try:
        op.add_column('orders', sa.Column('discount', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0.00'))
    except Exception:
        pass  # Column already exists

    # Add balance column to orders if it doesn't exist
    try:
        op.add_column('orders', sa.Column('balance', sa.Numeric(precision=10, scale=2), nullable=False))
    except Exception:
        pass  # Column already exists

    # Add discount column to quotation if it doesn't exist
    try:
        op.add_column('quotation', sa.Column('discount', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0.00'))
    except Exception:
        pass  # Column already exists

    # Add balance column to quotation if it doesn't exist
    try:
        op.add_column('quotation', sa.Column('balance', sa.Numeric(precision=10, scale=2), nullable=False))
    except Exception:
        pass  # Column already exists


def downgrade() -> None:
    """Remove added columns."""

    try:
        op.drop_column('orders', 'discount')
    except Exception:
        pass

    try:
        op.drop_column('orders', 'balance')
    except Exception:
        pass

    try:
        op.drop_column('quotation', 'discount')
    except Exception:
        pass

    try:
        op.drop_column('quotation', 'balance')
    except Exception:
        pass
