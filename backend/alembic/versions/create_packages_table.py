"""Create packages table

Revision ID: create_packages_table
Revises:
Create Date: 2026-04-10 07:19:20.338000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'create_packages_table'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create packages table
    op.create_table(
        'packages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('image_url', sa.String(length=500), nullable=True),
        sa.Column('cloudinary_public_id', sa.String(length=255), nullable=True),
        sa.Column('validity', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    # Create indexes
    op.create_index(op.f('ix_packages_name'), 'packages', ['name'], unique=False)
    op.create_index(op.f('ix_packages_created_at'), 'packages', ['created_at'], unique=False)


def downgrade() -> None:
    # Drop indexes
    op.drop_index(op.f('ix_packages_created_at'), table_name='packages')
    op.drop_index(op.f('ix_packages_name'), table_name='packages')
    # Drop table
    op.drop_table('packages')
