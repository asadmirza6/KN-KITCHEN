"""
Albums API endpoints.
Handles photo album management with multiple image upload capability.
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlmodel import Session, select
from typing import Optional, List
from pydantic import BaseModel

from ..database import get_session
from ..models import Album, MediaAsset
from ..models.media_asset import MediaType
from ..middleware.auth import verify_jwt
from ..utils.cloudinary_config import upload_to_cloudinary, delete_from_cloudinary


router = APIRouter()


class CreateAlbumRequest(BaseModel):
    """Request model for creating a new album"""
    title: str
    description: Optional[str] = None


@router.get("/")
def get_albums(session: Session = Depends(get_session)):
    """
    Get all albums with their associated images.

    Returns list of albums with image counts.
    """
    albums = session.exec(select(Album).order_by(Album.created_at.desc())).all()

    result = []
    for album in albums:
        # Count images in this album
        images = session.exec(
            select(MediaAsset)
            .where(MediaAsset.album_id == album.id)
            .where(MediaAsset.is_active == True)
        ).all()

        result.append({
            "id": album.id,
            "title": album.title,
            "description": album.description,
            "image_count": len(images),
            "images": [
                {
                    "id": img.id,
                    "image_url": img.image_url,
                    "cloudinary_public_id": img.cloudinary_public_id,
                    "created_at": img.created_at.isoformat()
                }
                for img in images
            ],
            "created_at": album.created_at.isoformat()
        })

    return result


@router.get("/{album_id}")
def get_album(
    album_id: int,
    session: Session = Depends(get_session)
):
    """
    Get a single album with all its images.
    """
    album = session.get(Album, album_id)

    if not album:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Album not found"
        )

    # Get all images for this album
    images = session.exec(
        select(MediaAsset)
        .where(MediaAsset.album_id == album_id)
        .where(MediaAsset.is_active == True)
        .order_by(MediaAsset.created_at)
    ).all()

    return {
        "id": album.id,
        "title": album.title,
        "description": album.description,
        "image_count": len(images),
        "images": [
            {
                "id": img.id,
                "image_url": img.image_url,
                "cloudinary_public_id": img.cloudinary_public_id,
                "created_at": img.created_at.isoformat()
            }
            for img in images
        ],
        "created_at": album.created_at.isoformat()
    }


@router.post("/", dependencies=[Depends(verify_jwt)])
def create_album(
    request: CreateAlbumRequest,
    session: Session = Depends(get_session)
):
    """
    Create a new album (ADMIN/STAFF only).

    Requires JWT authentication.
    """
    album = Album(
        title=request.title,
        description=request.description
    )

    session.add(album)
    session.commit()
    session.refresh(album)

    return {
        "id": album.id,
        "title": album.title,
        "description": album.description,
        "image_count": 0,
        "images": [],
        "created_at": album.created_at.isoformat()
    }


@router.post("/{album_id}/images", dependencies=[Depends(verify_jwt)])
async def upload_album_images(
    album_id: int,
    images: List[UploadFile] = File(...),
    session: Session = Depends(get_session)
):
    """
    Upload multiple images to an album (ADMIN/STAFF only).

    Requires JWT authentication.
    - **album_id**: Album to add images to
    - **images**: List of image files to upload

    Returns list of uploaded image details.
    """
    # Verify album exists
    album = session.get(Album, album_id)
    if not album:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Album not found"
        )

    uploaded_images = []

    try:
        for image in images:
            # Upload to Cloudinary
            upload_result = await upload_to_cloudinary(
                file=image,
                folder="kn_kitchen/gallery",
                resource_type="image"
            )

            # Create media asset record
            media_asset = MediaAsset(
                type=MediaType.gallery,
                album_id=album_id,
                image_url=upload_result["secure_url"],
                cloudinary_public_id=upload_result["public_id"],
                is_active=True
            )

            session.add(media_asset)
            session.commit()
            session.refresh(media_asset)

            uploaded_images.append({
                "id": media_asset.id,
                "image_url": media_asset.image_url,
                "cloudinary_public_id": media_asset.cloudinary_public_id,
                "created_at": media_asset.created_at.isoformat()
            })

        return {
            "album_id": album_id,
            "uploaded_count": len(uploaded_images),
            "images": uploaded_images
        }

    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload images: {str(e)}"
        )


@router.delete("/{album_id}", dependencies=[Depends(verify_jwt)])
def delete_album(
    album_id: int,
    session: Session = Depends(get_session)
):
    """
    Delete an album and all its images (ADMIN only).

    Requires JWT authentication.
    This will delete all images from Cloudinary and database.
    """
    album = session.get(Album, album_id)

    if not album:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Album not found"
        )

    try:
        # Get all images for this album
        images = session.exec(
            select(MediaAsset).where(MediaAsset.album_id == album_id)
        ).all()

        # Delete images from Cloudinary and database
        for image in images:
            if image.cloudinary_public_id:
                delete_from_cloudinary(image.cloudinary_public_id)
            session.delete(image)

        # Delete the album
        session.delete(album)
        session.commit()

        return {
            "success": True,
            "message": f"Album '{album.title}' and {len(images)} images deleted successfully"
        }

    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete album: {str(e)}"
        )


@router.delete("/{album_id}/images/{image_id}", dependencies=[Depends(verify_jwt)])
def delete_album_image(
    album_id: int,
    image_id: int,
    session: Session = Depends(get_session)
):
    """
    Delete a single image from an album (ADMIN only).

    Requires JWT authentication.
    """
    image = session.get(MediaAsset, image_id)

    if not image or image.album_id != album_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found in this album"
        )

    try:
        # Delete from Cloudinary
        if image.cloudinary_public_id:
            delete_from_cloudinary(image.cloudinary_public_id)

        # Delete from database
        session.delete(image)
        session.commit()

        return {
            "success": True,
            "message": "Image deleted successfully"
        }

    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete image: {str(e)}"
        )
