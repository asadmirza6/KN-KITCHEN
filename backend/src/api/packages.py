"""
Packages API endpoints.
Handles package/deal creation, management, and retrieval.
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlmodel import Session, select
from typing import Optional
from decimal import Decimal

from ..database import get_session
from ..models import Package
from ..middleware.auth import verify_jwt, require_admin
from ..utils.cloudinary_config import upload_to_cloudinary, delete_from_cloudinary


router = APIRouter()


@router.get("/")
def get_packages(session: Session = Depends(get_session)):
    """
    Fetch all packages (public endpoint).

    Returns list of packages with id, name, description, image_url, validity, created_at.
    """
    try:
        packages = session.exec(select(Package).order_by(Package.created_at.desc())).all()
    except Exception as e:
        print(f"Error fetching packages: {e}")
        return []

    result = []
    for package in packages:
        try:
            result.append({
                "id": package.id,
                "name": package.name,
                "description": package.description,
                "image_url": package.image_url,
                "validity": package.validity,
                "created_at": package.created_at.isoformat()
            })
        except Exception as e:
            print(f"Error serializing package {package.id}: {e}")
            continue

    return result


@router.get("/{package_id}")
def get_package(package_id: int, session: Session = Depends(get_session)):
    """
    Fetch a single package by ID.

    Returns package details with id, name, description, image_url, validity, created_at.
    """
    try:
        package = session.get(Package, package_id)
        if not package:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Package with id {package_id} not found"
            )

        return {
            "id": package.id,
            "name": package.name,
            "description": package.description,
            "image_url": package.image_url,
            "validity": package.validity,
            "created_at": package.created_at.isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching package {package_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching package: {str(e)}"
        )


@router.post("/", dependencies=[Depends(verify_jwt), Depends(require_admin)])
async def create_package(
    name: str = Form(...),
    description: str = Form(""),
    validity: str = Form(""),
    image: Optional[UploadFile] = File(None),
    session: Session = Depends(get_session)
):
    """
    Create a new package with optional Cloudinary image upload.
    Requires admin JWT authentication.

    Args:
        name: Package name
        description: Package description
        validity: Validity period or offer details
        image: Optional image file to upload to Cloudinary

    Returns:
        Created package details
    """
    try:
        # Upload image to Cloudinary (if provided)
        image_url = None
        cloudinary_public_id = None

        if image:
            try:
                upload_result = await upload_to_cloudinary(
                    file=image,
                    folder="kn_kitchen/packages",
                    resource_type="image"
                )
                image_url = upload_result["secure_url"]
                cloudinary_public_id = upload_result["public_id"]
            except HTTPException as e:
                # If Cloudinary is not configured, allow package creation without image
                print(f"Warning: Image upload failed: {e.detail}")
                image_url = None
                cloudinary_public_id = None

        # Create new package
        new_package = Package(
            name=name,
            description=description.strip() if description and description.strip() else None,
            validity=validity.strip() if validity and validity.strip() else None,
            image_url=image_url,
            cloudinary_public_id=cloudinary_public_id
        )

        try:
            session.add(new_package)
            session.commit()
            session.refresh(new_package)
        except Exception as db_error:
            import traceback
            print(f"Database error in create_package: {str(db_error)}")
            print(f"Traceback: {traceback.format_exc()}")
            session.rollback()
            raise

        return {
            "id": new_package.id,
            "name": new_package.name,
            "description": new_package.description,
            "image_url": new_package.image_url,
            "cloudinary_public_id": new_package.cloudinary_public_id,
            "validity": new_package.validity,
            "created_at": new_package.created_at.isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error in create_package: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create package: {str(e)}"
        )


@router.put("/{package_id}", dependencies=[Depends(verify_jwt), Depends(require_admin)])
async def update_package(
    package_id: int,
    name: str = Form(...),
    description: str = Form(""),
    validity: str = Form(""),
    image: Optional[UploadFile] = File(None),
    session: Session = Depends(get_session)
):
    """
    Update an existing package. Optionally replace image.
    Requires admin JWT authentication.

    Args:
        package_id: ID of package to update
        name: Updated package name
        description: Updated package description
        validity: Updated validity period
        image: Optional new image file (if provided, replaces existing)

    Returns:
        Updated package details
    """
    try:
        # Fetch existing package
        package = session.get(Package, package_id)
        if not package:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Package with id {package_id} not found"
            )

        # Update basic fields
        package.name = name
        package.description = description.strip() if description and description.strip() else None
        package.validity = validity.strip() if validity and validity.strip() else None

        # If new image provided, delete old one and upload new
        if image:
            # Delete old image from Cloudinary if exists
            if package.cloudinary_public_id:
                delete_from_cloudinary(package.cloudinary_public_id)

            # Upload new image
            upload_result = await upload_to_cloudinary(
                file=image,
                folder="kn_kitchen/packages",
                resource_type="image"
            )

            package.image_url = upload_result["secure_url"]
            package.cloudinary_public_id = upload_result["public_id"]

        try:
            session.add(package)
            session.commit()
            session.refresh(package)
        except Exception as db_error:
            import traceback
            print(f"Database error in update_package: {str(db_error)}")
            print(f"Traceback: {traceback.format_exc()}")
            session.rollback()
            raise

        return {
            "id": package.id,
            "name": package.name,
            "description": package.description,
            "image_url": package.image_url,
            "cloudinary_public_id": package.cloudinary_public_id,
            "validity": package.validity,
            "created_at": package.created_at.isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error in update_package: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update package: {str(e)}"
        )


@router.delete("/{package_id}", dependencies=[Depends(verify_jwt), Depends(require_admin)])
def delete_package(
    package_id: int,
    session: Session = Depends(get_session)
):
    """
    Delete a package and its Cloudinary image.
    Requires admin JWT authentication.

    Args:
        package_id: ID of package to delete

    Returns:
        Success message
    """
    try:
        # Fetch package
        package = session.get(Package, package_id)
        if not package:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Package with id {package_id} not found"
            )

        # Delete from Cloudinary if public_id exists
        if package.cloudinary_public_id:
            delete_from_cloudinary(package.cloudinary_public_id)

        # Delete from database
        session.delete(package)
        session.commit()

        return {
            "success": True,
            "message": f"Package '{package.name}' deleted successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete package: {str(e)}"
        )
