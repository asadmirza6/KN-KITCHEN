"""Add description and is_active columns to items table

Revision ID: add_item_description_active
Revises:
Create Date: 2026-04-10 05:42:51.476000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_item_description_active'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add description column
    try:
        op.add_column('items', sa.Column('description', sa.String(1000), nullable=True))
    except Exception as e:
        print(f"Description column might already exist: {e}")

    # Add is_active column with default True
    try:
        op.add_column('items', sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'))
    except Exception as e:
        print(f"is_active column might already exist: {e}")


def downgrade() -> None:
    # Remove is_active column
    try:
        op.drop_column('items', 'is_active')
    except Exception as e:
        print(f"Could not drop is_active column: {e}")

    # Remove description column
    try:
        op.drop_column('items', 'description')
    except Exception as e:
        print(f"Could not drop description column: {e}")
