"""Fix customer_address column - remove server default

Revision ID: 7cfa8f197509
Revises: 6cb08e3e02bd
Create Date: 2026-04-07 11:03:03.529350

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7cfa8f197509'
down_revision: Union[str, None] = '6cb08e3e02bd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # First, update any NULL values to empty string
    op.execute("UPDATE orders SET customer_address = '' WHERE customer_address IS NULL")

    # Then remove server default from customer_address column
    op.alter_column('orders', 'customer_address',
               existing_type=sa.VARCHAR(length=500),
               server_default=None,
               nullable=False)


def downgrade() -> None:
    # Restore server default
    op.alter_column('orders', 'customer_address',
               existing_type=sa.VARCHAR(length=500),
               server_default=sa.text("''"),
               nullable=False)
