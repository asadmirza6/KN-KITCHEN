"""add_album_model_and_album_id_to_media_assets

Revision ID: 120c616022e8
Revises: 69bb4dce5c44
Create Date: 2026-01-23 09:53:38.601854

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '120c616022e8'
down_revision: Union[str, None] = '69bb4dce5c44'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create albums table
    op.create_table(
        'albums',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.String(length=1000), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_albums_created_at'), 'albums', ['created_at'], unique=False)
    op.create_index(op.f('ix_albums_title'), 'albums', ['title'], unique=False)

    # Add album_id to media_assets
    op.add_column('media_assets', sa.Column('album_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_media_assets_album_id', 'media_assets', 'albums', ['album_id'], ['id'], ondelete='CASCADE')
    op.create_index(op.f('ix_media_assets_album_id'), 'media_assets', ['album_id'], unique=False)


def downgrade() -> None:
    # Remove album_id from media_assets
    op.drop_index(op.f('ix_media_assets_album_id'), table_name='media_assets')
    op.drop_constraint('fk_media_assets_album_id', 'media_assets', type_='foreignkey')
    op.drop_column('media_assets', 'album_id')

    # Drop albums table
    op.drop_index(op.f('ix_albums_title'), table_name='albums')
    op.drop_index(op.f('ix_albums_created_at'), table_name='albums')
    op.drop_table('albums')
