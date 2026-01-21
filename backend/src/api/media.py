"""
Media API endpoints.
Handles banner and gallery image management.
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlmodel import Session, select
from typing import Optional

from ..database import get_session
from ..models import MediaAsset
from ..models.media_asset import MediaType
from ..middleware.auth import verify_jwt
from ..utils.cloudinary_config import upload_to_cloudinary, delete_from_cloudinary


router = APIRouter()


@router.get("/")
def get_media(
    type: Optional[str] = None,
    session: Session = Depends(get_session)
):
    """
    Fetch media assets, optionally filtered by type.

    - **type**: Optional filter by media type ('banner', 'gallery', or 'item')

    Returns only active media assets by default.
    """
    statement = select(MediaAsset).where(MediaAsset.is_active == True)

    if type:
        try:
            media_type = MediaType(type)
            statement = statement.where(MediaAsset.type == media_type)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid media type. Must be one of: banner, gallery, item"
            )

    media_assets = session.exec(statement).all()

    return [
        {
            "id": asset.id,
            "type": asset.type,
            "title": asset.title,
            "image_url": asset.image_url,
            "cloudinary_public_id": asset.cloudinary_public_id,
            "is_active": asset.is_active,
            "created_at": asset.created_at.isoformat()
        }
        for asset in media_assets
    ]


@router.post("/upload", dependencies=[Depends(verify_jwt)])
async def upload_media(
    type: str = Form(...),
    title: Optional[str] = Form(None),
    image: UploadFile = File(...),
    session: Session = Depends(get_session)
):
    """
    Upload a new media asset (banner or gallery image) to Cloudinary.

    **Admin only** - requires JWT authentication.

    - **type**: Media type ('banner', 'gallery', or 'item')
    - **title**: Optional title/description
    - **image**: Image file (JPEG, PNG, GIF, or WebP)

    Returns the created media asset.
    """
    try:
        # Validate media type
        try:
            media_type = MediaType(type)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid media type. Must be one of: banner, gallery, item"
            )

        # Determine Cloudinary folder based on type
        folder_mapping = {
            "banner": "kn_kitchen/banners",
            "gallery": "kn_kitchen/gallery",
            "item": "kn_kitchen/items"
        }
        cloudinary_folder = folder_mapping.get(type, "kn_kitchen/media")

        # Upload to Cloudinary
        upload_result = await upload_to_cloudinary(
            file=image,
            folder=cloudinary_folder,
            resource_type="image"
        )

        # Create media asset record
        media_asset = MediaAsset(
            type=media_type,
            title=title,
            image_url=upload_result["secure_url"],
            cloudinary_public_id=upload_result["public_id"],
            is_active=True
        )

        session.add(media_asset)
        session.commit()
        session.refresh(media_asset)

        return {
            "id": media_asset.id,
            "type": media_asset.type,
            "title": media_asset.title,
            "image_url": media_asset.image_url,
            "cloudinary_public_id": media_asset.cloudinary_public_id,
            "is_active": media_asset.is_active,
            "created_at": media_asset.created_at.isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload media: {str(e)}"
        )


@router.patch("/{media_id}/toggle-active", dependencies=[Depends(verify_jwt)])
def toggle_active(
    media_id: int,
    session: Session = Depends(get_session)
):
    """
    Toggle the active status of a media asset.

    **Admin only** - requires JWT authentication.

    - **media_id**: ID of the media asset

    Returns the updated media asset.
    """
    media_asset = session.get(MediaAsset, media_id)

    if not media_asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media asset not found"
        )

    # Toggle is_active
    media_asset.is_active = not media_asset.is_active

    session.add(media_asset)
    session.commit()
    session.refresh(media_asset)

    return {
        "id": media_asset.id,
        "type": media_asset.type,
        "title": media_asset.title,
        "image_url": media_asset.image_url,
        "cloudinary_public_id": media_asset.cloudinary_public_id,
        "is_active": media_asset.is_active,
        "created_at": media_asset.created_at.isoformat()
    }


@router.delete("/{media_id}", dependencies=[Depends(verify_jwt)])
def delete_media(
    media_id: int,
    session: Session = Depends(get_session)
):
    """
    Delete a media asset and its Cloudinary image.

    **Admin only** - requires JWT authentication.

    - **media_id**: ID of the media asset

    Returns success message.
    """
    try:
        media_asset = session.get(MediaAsset, media_id)

        if not media_asset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Media asset not found"
            )

        # Delete from Cloudinary if public_id exists
        if media_asset.cloudinary_public_id:
            delete_from_cloudinary(media_asset.cloudinary_public_id)

        # Delete from database
        session.delete(media_asset)
        session.commit()

        return {
            "success": True,
            "message": f"Media asset deleted successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete media: {str(e)}"
        )
