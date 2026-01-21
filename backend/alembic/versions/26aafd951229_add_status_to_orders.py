"""add status to orders

Revision ID: 26aafd951229
Revises: 4455c07a374e
Create Date: 2026-01-19 23:05:34.907341

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '26aafd951229'
down_revision: Union[str, None] = '4455c07a374e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add status column to orders table
    op.add_column('orders', sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'))
    op.create_index(op.f('ix_orders_status'), 'orders', ['status'], unique=False)


def downgrade() -> None:
    # Remove status column from orders table
    op.drop_index(op.f('ix_orders_status'), table_name='orders')
    op.drop_column('orders', 'status')
