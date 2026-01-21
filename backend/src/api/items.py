"""
Items API endpoints.
Handles menu item management.
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlmodel import Session, select
from typing import Optional
from decimal import Decimal

from ..database import get_session
from ..models import Item
from ..middleware.auth import verify_jwt
from ..utils.cloudinary_config import upload_to_cloudinary, delete_from_cloudinary


router = APIRouter()


@router.get("/")
def get_items(session: Session = Depends(get_session)):
    """
    Fetch all menu items.

    Returns list of all items with id, name, price_per_kg, image_url, created_at.
    """
    items = session.exec(select(Item)).all()

    return [
        {
            "id": item.id,
            "name": item.name,
            "price_per_kg": str(item.price_per_kg),
            "image_url": item.image_url,
            "created_at": item.created_at.isoformat()
        }
        for item in items
    ]


@router.post("/", dependencies=[Depends(verify_jwt)])
async def create_item(
    name: str = Form(...),
    price_per_kg: str = Form(...),
    image: UploadFile = File(...),
    session: Session = Depends(get_session)
):
    """
    Create a new menu item with Cloudinary image upload.
    Requires admin JWT authentication.

    Args:
        name: Item name
        price_per_kg: Price per kilogram (will be converted to Decimal)
        image: Image file to upload to Cloudinary

    Returns:
        Created item details
    """
    try:
        # Convert price to Decimal
        price_decimal = Decimal(price_per_kg)

        # Upload image to Cloudinary
        upload_result = await upload_to_cloudinary(
            file=image,
            folder="kn_kitchen/items",
            resource_type="image"
        )

        # Create new item
        new_item = Item(
            name=name,
            price_per_kg=price_decimal,
            image_url=upload_result["secure_url"],
            cloudinary_public_id=upload_result["public_id"]
        )

        session.add(new_item)
        session.commit()
        session.refresh(new_item)

        return {
            "id": new_item.id,
            "name": new_item.name,
            "price_per_kg": str(new_item.price_per_kg),
            "image_url": new_item.image_url,
            "cloudinary_public_id": new_item.cloudinary_public_id,
            "created_at": new_item.created_at.isoformat()
        }

    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid price format"
        )
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create item: {str(e)}"
        )


@router.put("/{item_id}", dependencies=[Depends(verify_jwt)])
async def update_item(
    item_id: int,
    name: str = Form(...),
    price_per_kg: str = Form(...),
    image: Optional[UploadFile] = File(None),
    session: Session = Depends(get_session)
):
    """
    Update an existing menu item. Optionally replace image.
    Requires admin JWT authentication.

    Args:
        item_id: ID of item to update
        name: Updated item name
        price_per_kg: Updated price per kilogram
        image: Optional new image file (if provided, replaces existing)

    Returns:
        Updated item details
    """
    try:
        # Fetch existing item
        item = session.get(Item, item_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Item with id {item_id} not found"
            )

        # Convert price to Decimal
        price_decimal = Decimal(price_per_kg)

        # Update basic fields
        item.name = name
        item.price_per_kg = price_decimal

        # If new image provided, delete old one and upload new
        if image:
            # Delete old image from Cloudinary if exists
            if item.cloudinary_public_id:
                delete_from_cloudinary(item.cloudinary_public_id)

            # Upload new image
            upload_result = await upload_to_cloudinary(
                file=image,
                folder="kn_kitchen/items",
                resource_type="image"
            )

            item.image_url = upload_result["secure_url"]
            item.cloudinary_public_id = upload_result["public_id"]

        session.add(item)
        session.commit()
        session.refresh(item)

        return {
            "id": item.id,
            "name": item.name,
            "price_per_kg": str(item.price_per_kg),
            "image_url": item.image_url,
            "cloudinary_public_id": item.cloudinary_public_id,
            "created_at": item.created_at.isoformat()
        }

    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid price format"
        )
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update item: {str(e)}"
        )


@router.delete("/{item_id}", dependencies=[Depends(verify_jwt)])
def delete_item(
    item_id: int,
    session: Session = Depends(get_session)
):
    """
    Delete a menu item and its Cloudinary image.
    Requires admin JWT authentication.

    Args:
        item_id: ID of item to delete

    Returns:
        Success message
    """
    try:
        # Fetch item
        item = session.get(Item, item_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Item with id {item_id} not found"
            )

        # Delete from Cloudinary if public_id exists
        if item.cloudinary_public_id:
            delete_from_cloudinary(item.cloudinary_public_id)

        # Delete from database
        session.delete(item)
        session.commit()

        return {
            "success": True,
            "message": f"Item '{item.name}' deleted successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete item: {str(e)}"
        )
