"""Add profit tracking fields to orders table

Revision ID: add_profit_tracking
Revises:
Create Date: 2026-04-11 06:53:05.319000

"""
from alembic import op
import sqlalchemy as sa
from decimal import Decimal


# revision identifiers, used by Alembic.
revision = 'add_profit_tracking'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new columns to orders table
    op.add_column('orders', sa.Column('calculated_profit', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0.00'))
    op.add_column('orders', sa.Column('profit_margin', sa.Numeric(precision=5, scale=2), nullable=False, server_default='0.00'))
    op.add_column('orders', sa.Column('total_cost', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0.00'))


def downgrade() -> None:
    # Remove columns from orders table
    op.drop_column('orders', 'total_cost')
    op.drop_column('orders', 'profit_margin')
    op.drop_column('orders', 'calculated_profit')
