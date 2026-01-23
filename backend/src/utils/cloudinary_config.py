"""
Cloudinary configuration and utility functions.
Handles image upload, deletion, and URL generation.
"""

import cloudinary
import cloudinary.uploader
import cloudinary.api
from fastapi import HTTPException, UploadFile, status
import os
from typing import Optional, Dict, Any


# Initialize Cloudinary configuration
CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")

# Validate that Cloudinary credentials are set
if not CLOUDINARY_CLOUD_NAME or CLOUDINARY_CLOUD_NAME == "your_cloud_name":
    print("WARNING: CLOUDINARY_CLOUD_NAME not configured in .env file")
    CLOUDINARY_CONFIGURED = False
elif not CLOUDINARY_API_KEY or CLOUDINARY_API_KEY == "your_api_key":
    print("WARNING: CLOUDINARY_API_KEY not configured in .env file")
    CLOUDINARY_CONFIGURED = False
elif not CLOUDINARY_API_SECRET or CLOUDINARY_API_SECRET == "your_api_secret":
    print("WARNING: CLOUDINARY_API_SECRET not configured in .env file")
    CLOUDINARY_CONFIGURED = False
else:
    CLOUDINARY_CONFIGURED = True
    cloudinary.config(
        cloud_name=CLOUDINARY_CLOUD_NAME,
        api_key=CLOUDINARY_API_KEY,
        api_secret=CLOUDINARY_API_SECRET,
        secure=True
    )
    print(f"✓ Cloudinary initialized successfully: {CLOUDINARY_CLOUD_NAME}")


def validate_image(file: UploadFile, max_size_mb: int = 10) -> None:
    """
    Validate uploaded image file.

    Args:
        file: UploadFile object from FastAPI
        max_size_mb: Maximum file size in megabytes

    Raises:
        HTTPException: If validation fails
    """
    # Check file extension
    allowed_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
    ext = os.path.splitext(file.filename or '')[1].lower()

    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
        )

    # Check content type
    allowed_content_types = {
        'image/jpeg', 'image/png', 'image/gif', 'image/webp'
    }
    if file.content_type not in allowed_content_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid content type. Must be an image file."
        )


async def upload_to_cloudinary(
    file: UploadFile,
    folder: str,
    resource_type: str = "image",
    public_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Upload file to Cloudinary.

    Args:
        file: UploadFile object from FastAPI
        folder: Cloudinary folder path (e.g., "kn_kitchen/items")
        resource_type: Type of resource ("image", "video", etc.)
        public_id: Optional public ID for the file

    Returns:
        Dict containing upload result with 'secure_url', 'public_id', etc.

    Raises:
        HTTPException: If upload fails
    """
    # Check if Cloudinary is configured
    if not CLOUDINARY_CONFIGURED:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file. Get credentials from https://cloudinary.com/console"
        )

    try:
        # Validate image first
        validate_image(file)

        # Read file contents
        contents = await file.read()

        # Upload to Cloudinary
        upload_result = cloudinary.uploader.upload(
            contents,
            folder=folder,
            resource_type=resource_type,
            public_id=public_id,
            overwrite=True,
            invalidate=True,
            transformation=[
                {"quality": "auto", "fetch_format": "auto"}
            ]
        )

        return upload_result

    except HTTPException:
        raise
    except Exception as e:
        # Handle both Cloudinary-specific and general exceptions
        error_msg = str(e)
        if "api_key" in error_msg.lower():
            detail = "Cloudinary API credentials are invalid. Please check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file."
        elif "cloudinary" in error_msg.lower():
            detail = f"Cloudinary upload failed: {error_msg}"
        else:
            detail = f"Upload failed: {error_msg}"

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail
        )


def delete_from_cloudinary(public_id: str, resource_type: str = "image") -> bool:
    """
    Delete file from Cloudinary.

    Args:
        public_id: Cloudinary public ID of the file
        resource_type: Type of resource ("image", "video", etc.)

    Returns:
        True if deletion was successful

    Raises:
        HTTPException: If deletion fails
    """
    try:
        result = cloudinary.uploader.destroy(
            public_id,
            resource_type=resource_type,
            invalidate=True
        )

        # Result is {'result': 'ok'} if successful
        return result.get('result') == 'ok'

    except Exception as e:
        # Log error but don't fail the request if Cloudinary delete fails
        print(f"Cloudinary delete error: {str(e)}")
        return False


def extract_public_id_from_url(cloudinary_url: str) -> Optional[str]:
    """
    Extract Cloudinary public ID from a Cloudinary URL.

    Args:
        cloudinary_url: Full Cloudinary URL

    Returns:
        Public ID or None if extraction fails
    """
    try:
        # Example URL: https://res.cloudinary.com/demo/image/upload/v1234567890/kn_kitchen/items/abc123.jpg
        # Public ID would be: kn_kitchen/items/abc123

        if not cloudinary_url or 'cloudinary.com' not in cloudinary_url:
            return None

        # Split by /upload/ to get the part after
        parts = cloudinary_url.split('/upload/')
        if len(parts) < 2:
            return None

        # Get the path after /upload/
        path = parts[1]

        # Remove version (v1234567890/) if present
        if path.startswith('v'):
            path = '/'.join(path.split('/')[1:])

        # Remove file extension
        public_id = os.path.splitext(path)[0]

        return public_id

    except Exception:
        return None


def get_cloudinary_url(public_id: str, transformations: Optional[list] = None) -> str:
    """
    Generate Cloudinary URL for an image.

    Args:
        public_id: Cloudinary public ID
        transformations: Optional list of transformations

    Returns:
        Full Cloudinary URL
    """
    try:
        url = cloudinary.CloudinaryImage(public_id).build_url(
            transformation=transformations or [],
            secure=True
        )
        return url
    except Exception:
        return ""
