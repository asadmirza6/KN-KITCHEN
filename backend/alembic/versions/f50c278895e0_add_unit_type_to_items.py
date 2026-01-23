"""add_unit_type_to_items

Revision ID: f50c278895e0
Revises: 120c616022e8
Create Date: 2026-01-23 09:56:03.190660

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f50c278895e0'
down_revision: Union[str, None] = '120c616022e8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add unit_type column to items table with default value 'per_kg'
    op.add_column('items', sa.Column('unit_type', sa.String(length=20), nullable=False, server_default='per_kg'))
    op.create_index(op.f('ix_items_unit_type'), 'items', ['unit_type'], unique=False)


def downgrade() -> None:
    # Remove unit_type column from items table
    op.drop_index(op.f('ix_items_unit_type'), table_name='items')
    op.drop_column('items', 'unit_type')
