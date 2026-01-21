"""
Seed database with sample data for testing.
"""
from decimal import Decimal

from sqlmodel import Session

from src.database import engine
from src.models import Item, MediaAsset


def seed_data():
    """Add sample menu items, banners, and gallery images."""

    with Session(engine) as session:
        # Add sample menu items
        items = [
            Item(
                name="Chicken Biryani",
                price_per_kg=Decimal("350.00"),
                image_url=None
            ),
            Item(
                name="Paneer Tikka",
                price_per_kg=Decimal("280.00"),
                image_url=None
            ),
            Item(
                name="Veg Pulao",
                price_per_kg=Decimal("180.00"),
                image_url=None
            ),
            Item(
                name="Dal Makhani",
                price_per_kg=Decimal("150.00"),
                image_url=None
            ),
            Item(
                name="Butter Naan",
                price_per_kg=Decimal("40.00"),
                image_url=None
            ),
            Item(
                name="Gulab Jamun",
                price_per_kg=Decimal("250.00"),
                image_url=None
            ),
        ]

        for item in items:
            session.add(item)

        # Add sample banner (placeholder)
        banner = MediaAsset(
            type="banner",
            title="Welcome to KN Kitchen",
            image_url="/uploads/placeholder-banner.jpg",
            is_active=True
        )
        session.add(banner)

        # Add sample gallery images (placeholders)
        gallery_items = [
            MediaAsset(
                type="gallery",
                title="Delicious Biryani",
                image_url="/uploads/placeholder-gallery-1.jpg",
                is_active=True
            ),
            MediaAsset(
                type="gallery",
                title="Fresh Vegetables",
                image_url="/uploads/placeholder-gallery-2.jpg",
                is_active=True
            ),
            MediaAsset(
                type="gallery",
                title="Tandoori Special",
                image_url="/uploads/placeholder-gallery-3.jpg",
                is_active=True
            ),
        ]

        for gallery_item in gallery_items:
            session.add(gallery_item)

        session.commit()
        print("[SUCCESS] Sample data added successfully!")
        print(f"   - {len(items)} menu items")
        print(f"   - 1 banner")
        print(f"   - {len(gallery_items)} gallery images")


if __name__ == "__main__":
    seed_data()
