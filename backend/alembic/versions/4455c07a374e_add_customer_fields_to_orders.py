"""add customer fields to orders

Revision ID: 4455c07a374e
Revises: 86c0a51ec57c
Create Date: 2026-01-19 22:49:56.714222

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4455c07a374e'
down_revision: Union[str, None] = '86c0a51ec57c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add customer fields to orders table
    op.add_column('orders', sa.Column('customer_name', sa.String(length=255), nullable=False, server_default=''))
    op.add_column('orders', sa.Column('customer_email', sa.String(length=255), nullable=False, server_default=''))
    op.add_column('orders', sa.Column('customer_phone', sa.String(length=20), nullable=False, server_default=''))
    op.add_column('orders', sa.Column('delivery_date', sa.String(length=50), nullable=True))
    op.add_column('orders', sa.Column('notes', sa.String(length=500), nullable=True))


def downgrade() -> None:
    # Remove customer fields from orders table
    op.drop_column('orders', 'notes')
    op.drop_column('orders', 'delivery_date')
    op.drop_column('orders', 'customer_phone')
    op.drop_column('orders', 'customer_email')
    op.drop_column('orders', 'customer_name')
