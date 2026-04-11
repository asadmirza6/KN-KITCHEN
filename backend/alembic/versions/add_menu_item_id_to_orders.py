"""Add menu_item_id column to orders table

Revision ID: add_menu_item_id_to_orders
Revises: add_profit_tracking
Create Date: 2026-04-11 08:26:53.829000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_menu_item_id_to_orders'
down_revision = 'add_profit_tracking'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add menu_item_id column to orders table
    op.add_column('orders', sa.Column('menu_item_id', sa.Integer(), nullable=True))

    # Add foreign key constraint
    op.create_foreign_key(
        'fk_orders_menu_item_id',
        'orders',
        'items',
        ['menu_item_id'],
        ['id']
    )


def downgrade() -> None:
    # Remove foreign key constraint
    op.drop_constraint('fk_orders_menu_item_id', 'orders', type_='foreignkey')

    # Remove menu_item_id column
    op.drop_column('orders', 'menu_item_id')
