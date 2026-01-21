---
name: Sanity.io CMS Integration
description: Best practices for Sanity CMS including schema design, GROQ queries, syncing data to frontend, and handling rate changes safely
scope: mandatory
applies_to: backend, frontend, cms
---

# Sanity.io CMS Integration

**Status**: MANDATORY - All CMS operations MUST follow these patterns

## Overview

Sanity.io is KN KITCHEN's content management system for menu items, pricing, and content. Per the constitution, Sanity is the **single source of truth** for menu data. The application backend fetches from Sanity but never duplicates authoritative data in the database.

**Key Principle**: Sanity stores current prices; Orders store price snapshots at order time.

**Technology Stack:**
- Sanity.io (Headless CMS)
- Sanity Studio (Content editing interface)
- GROQ (Graph-Relational Object Queries)
- Sanity Client (JavaScript/TypeScript SDK)

## Core Principles

1. **Sanity is Authoritative**: Menu items, prices, availability managed exclusively in Sanity
2. **Price Snapshots**: Orders capture price at order time, don't reference current Sanity prices
3. **No Duplication**: Backend fetches from Sanity, may cache, but doesn't store authoritative copies
4. **Type Safety**: Use TypeScript types for Sanity documents
5. **Query Efficiency**: Use GROQ projections to fetch only needed fields

## 1. Schema Design

Define structured content types in Sanity Studio.

### Project Structure

```
sanity-studio/
├── schemas/
│   ├── index.ts              # Schema registry
│   ├── menuItem.ts           # Menu item schema
│   ├── category.ts           # Category schema
│   ├── menuSection.ts        # Section schema (appetizers, entrees, etc.)
│   └── settings.ts           # Site settings
├── sanity.config.ts          # Sanity configuration
└── package.json
```

### Menu Item Schema

```typescript
// ✅ CORRECT: Menu item schema with validation
// sanity-studio/schemas/menuItem.ts
import { defineType, defineField } from "sanity";

export default defineType({
  name: "menuItem",
  title: "Menu Item",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Item Name",
      type: "string",
      validation: (Rule) => Rule.required().max(255),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "name",
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
      validation: (Rule) => Rule.max(500),
    }),
    defineField({
      name: "price",
      title: "Price (USD)",
      type: "number",
      validation: (Rule) =>
        Rule.required()
          .min(0)
          .precision(2)
          .custom((price) => {
            if (price && price > 10000) {
              return "Price seems unusually high. Please verify.";
            }
            return true;
          }),
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "reference",
      to: [{ type: "category" }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "section",
      title: "Menu Section",
      type: "reference",
      to: [{ type: "menuSection" }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "image",
      title: "Image",
      type: "image",
      options: {
        hotspot: true, // Enable image cropping
      },
      fields: [
        {
          name: "alt",
          title: "Alt Text",
          type: "string",
          validation: (Rule) => Rule.required(),
        },
      ],
    }),
    defineField({
      name: "available",
      title: "Available",
      type: "boolean",
      initialValue: true,
      description: "Uncheck to hide from ordering (out of stock, seasonal, etc.)",
    }),
    defineField({
      name: "minimumQuantity",
      title: "Minimum Order Quantity",
      type: "number",
      initialValue: 1,
      validation: (Rule) => Rule.min(1),
    }),
    defineField({
      name: "tags",
      title: "Tags",
      type: "array",
      of: [{ type: "string" }],
      options: {
        layout: "tags",
      },
    }),
    defineField({
      name: "allergens",
      title: "Allergens",
      type: "array",
      of: [{ type: "string" }],
      options: {
        list: [
          { title: "Dairy", value: "dairy" },
          { title: "Eggs", value: "eggs" },
          { title: "Fish", value: "fish" },
          { title: "Shellfish", value: "shellfish" },
          { title: "Tree Nuts", value: "tree-nuts" },
          { title: "Peanuts", value: "peanuts" },
          { title: "Wheat", value: "wheat" },
          { title: "Soy", value: "soy" },
        ],
      },
    }),
    defineField({
      name: "priceHistory",
      title: "Price History",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            {
              name: "price",
              title: "Price",
              type: "number",
              validation: (Rule) => Rule.required(),
            },
            {
              name: "effectiveDate",
              title: "Effective Date",
              type: "datetime",
              validation: (Rule) => Rule.required(),
            },
            {
              name: "reason",
              title: "Reason for Change",
              type: "string",
            },
          ],
          preview: {
            select: {
              price: "price",
              date: "effectiveDate",
            },
            prepare({ price, date }) {
              return {
                title: `$${price}`,
                subtitle: new Date(date).toLocaleDateString(),
              };
            },
          },
        },
      ],
      readOnly: false,
      description: "Automatically updated when price changes (via custom action)",
    }),
  ],
  preview: {
    select: {
      title: "name",
      price: "price",
      media: "image",
      available: "available",
    },
    prepare({ title, price, media, available }) {
      return {
        title: `${title} - $${price}`,
        subtitle: available ? "Available" : "Unavailable",
        media,
      };
    },
  },
  orderings: [
    {
      title: "Name A-Z",
      name: "nameAsc",
      by: [{ field: "name", direction: "asc" }],
    },
    {
      title: "Price Low-High",
      name: "priceAsc",
      by: [{ field: "price", direction: "asc" }],
    },
  ],
});
```

### Category Schema

```typescript
// ✅ CORRECT: Category schema
// sanity-studio/schemas/category.ts
import { defineType, defineField } from "sanity";

export default defineType({
  name: "category",
  title: "Category",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Category Name",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "name",
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 2,
    }),
    defineField({
      name: "order",
      title: "Display Order",
      type: "number",
      initialValue: 0,
      description: "Lower numbers appear first",
    }),
  ],
});
```

### Menu Section Schema

```typescript
// ✅ CORRECT: Menu section schema
// sanity-studio/schemas/menuSection.ts
import { defineType, defineField } from "sanity";

export default defineType({
  name: "menuSection",
  title: "Menu Section",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Section Name",
      type: "string",
      validation: (Rule) => Rule.required(),
      description: "e.g., Appetizers, Entrees, Desserts",
    }),
    defineField({
      name: "order",
      title: "Display Order",
      type: "number",
      initialValue: 0,
    }),
  ],
});
```

### Schema Registration

```typescript
// ✅ CORRECT: Register all schemas
// sanity-studio/schemas/index.ts
import menuItem from "./menuItem";
import category from "./category";
import menuSection from "./menuSection";

export const schemaTypes = [menuItem, category, menuSection];
```

## 2. GROQ Queries

GROQ (Graph-Relational Object Queries) is Sanity's query language.

### Basic Queries

```typescript
// ✅ CORRECT: GROQ queries for common operations
// lib/sanity/queries.ts

// Fetch all available menu items
export const availableMenuItemsQuery = `
  *[_type == "menuItem" && available == true] {
    _id,
    name,
    slug,
    description,
    price,
    "category": category->name,
    "categorySlug": category->slug.current,
    "section": section->name,
    image {
      asset->{
        _id,
        url
      },
      alt
    },
    minimumQuantity,
    tags,
    allergens
  } | order(section->order asc, name asc)
`;

// Fetch menu items by category
export const menuItemsByCategoryQuery = `
  *[_type == "menuItem" && available == true && category->slug.current == $categorySlug] {
    _id,
    name,
    slug,
    description,
    price,
    image {
      asset->url,
      alt
    }
  }
`;

// Fetch single menu item by ID
export const menuItemByIdQuery = `
  *[_type == "menuItem" && _id == $id][0] {
    _id,
    name,
    slug,
    description,
    price,
    "category": category->{name, slug},
    "section": section->{name, order},
    image {
      asset->{url, metadata},
      alt,
      hotspot
    },
    available,
    minimumQuantity,
    tags,
    allergens,
    priceHistory[] | order(effectiveDate desc)
  }
`;

// Fetch menu grouped by section
export const menuGroupedBySectionQuery = `
  *[_type == "menuSection"] | order(order asc) {
    _id,
    name,
    order,
    "items": *[_type == "menuItem" && available == true && references(^._id)] {
      _id,
      name,
      description,
      price,
      image {
        asset->url,
        alt
      }
    } | order(name asc)
  }
`;

// Fetch categories with item counts
export const categoriesWithCountsQuery = `
  *[_type == "category"] | order(order asc) {
    _id,
    name,
    slug,
    description,
    "itemCount": count(*[_type == "menuItem" && available == true && references(^._id)])
  }
`;
```

### Advanced GROQ Features

```typescript
// ✅ CORRECT: Advanced GROQ patterns

// Projections (select specific fields)
const query = `
  *[_type == "menuItem"] {
    name,
    price,
    "imageUrl": image.asset->url
  }
`;

// Filtering with multiple conditions
const query = `
  *[
    _type == "menuItem" &&
    available == true &&
    price < 50 &&
    "vegetarian" in tags
  ]
`;

// References (joining documents)
const query = `
  *[_type == "menuItem"] {
    name,
    "categoryName": category->name,
    "categorySlug": category->slug.current
  }
`;

// Ordering
const query = `
  *[_type == "menuItem"] | order(price desc, name asc)
`;

// Pagination
const query = `
  *[_type == "menuItem"][0..10] // First 10 items
`;

// Aggregations
const query = `
  {
    "totalItems": count(*[_type == "menuItem" && available == true]),
    "averagePrice": avg(*[_type == "menuItem"].price),
    "priceRange": {
      "min": min(*[_type == "menuItem"].price),
      "max": max(*[_type == "menuItem"].price)
    }
  }
`;
```

## 3. Syncing CMS Data to Frontend

Fetch Sanity data on the server (Next.js) or client, with appropriate caching.

### Sanity Client Setup

```typescript
// ✅ CORRECT: Sanity client configuration
// lib/sanity/client.ts
import { createClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET!;
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2024-01-01";

// Client for server-side and client-side fetching
export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true, // Use CDN for faster reads (production)
  perspective: "published", // Only fetch published documents
});

// Image URL builder
const builder = imageUrlBuilder(sanityClient);

export function urlForImage(source: any) {
  return builder.image(source);
}
```

### Server-Side Data Fetching (Next.js Server Components)

```typescript
// ✅ CORRECT: Fetch in Server Component
// app/menu/page.tsx
import { sanityClient } from "@/lib/sanity/client";
import { availableMenuItemsQuery } from "@/lib/sanity/queries";
import { MenuItem } from "@/lib/types";

export default async function MenuPage() {
  // Fetch data on server
  const menuItems = await sanityClient.fetch<MenuItem[]>(
    availableMenuItemsQuery,
    {},
    {
      next: { revalidate: 300 }, // Revalidate every 5 minutes (ISR)
    }
  );

  return (
    <div>
      <h1>Menu</h1>
      <div className="grid grid-cols-3 gap-4">
        {menuItems.map((item) => (
          <MenuItemCard key={item._id} item={item} />
        ))}
      </div>
    </div>
  );
}

// Generate static params for SSG (optional)
export async function generateStaticParams() {
  const items = await sanityClient.fetch<{ slug: string }[]>(
    `*[_type == "menuItem"]{ "slug": slug.current }`
  );

  return items.map((item) => ({
    slug: item.slug,
  }));
}
```

### Client-Side Data Fetching

```typescript
// ✅ CORRECT: Fetch in Client Component
// components/MenuSelector.tsx
"use client";

import { useEffect, useState } from "react";
import { sanityClient } from "@/lib/sanity/client";
import { availableMenuItemsQuery } from "@/lib/sanity/queries";
import { MenuItem } from "@/lib/types";

export function MenuSelector() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchItems() {
      try {
        const data = await sanityClient.fetch<MenuItem[]>(availableMenuItemsQuery);
        setItems(data);
      } catch (error) {
        console.error("Failed to fetch menu items:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchItems();
  }, []);

  if (isLoading) return <div>Loading menu...</div>;

  return (
    <select>
      {items.map((item) => (
        <option key={item._id} value={item._id}>
          {item.name} - ${item.price}
        </option>
      ))}
    </select>
  );
}
```

### Backend API Integration (FastAPI)

```python
# ✅ CORRECT: Fetch Sanity data from backend
# backend/src/services/menu_service.py
from sanity import Client
import os
from typing import List, Optional
from datetime import datetime, timedelta

class MenuService:
    def __init__(self):
        self.client = Client(
            project_id=os.getenv("SANITY_PROJECT_ID"),
            dataset=os.getenv("SANITY_DATASET"),
            api_version="2024-01-01",
            use_cdn=True
        )
        self._cache = {}
        self._cache_ttl = timedelta(minutes=5)

    async def get_available_items(self) -> List[dict]:
        """
        Fetch available menu items from Sanity

        Uses caching to reduce API calls
        """
        cache_key = "available_items"

        # Check cache
        if cache_key in self._cache:
            cached_data, cached_at = self._cache[cache_key]
            if datetime.now() - cached_at < self._cache_ttl:
                return cached_data

        # Fetch from Sanity
        query = """
        *[_type == "menuItem" && available == true] {
          _id,
          name,
          price,
          minimumQuantity,
          "imageUrl": image.asset->url
        }
        """

        items = self.client.fetch(query)

        # Cache result
        self._cache[cache_key] = (items, datetime.now())

        return items

    async def get_item_by_id(self, item_id: str) -> Optional[dict]:
        """Fetch single menu item by Sanity ID"""
        query = """
        *[_type == "menuItem" && _id == $id][0] {
          _id,
          name,
          price,
          available,
          minimumQuantity
        }
        """

        return self.client.fetch(query, {"id": item_id})

    def clear_cache(self):
        """Clear menu cache (call when Sanity webhook triggered)"""
        self._cache.clear()
```

### Sanity Webhooks for Real-Time Updates

```python
# ✅ CORRECT: Webhook endpoint to invalidate cache
# backend/src/api/routes/webhooks.py
from fastapi import APIRouter, HTTPException, Header
import hmac
import hashlib
import os

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

SANITY_WEBHOOK_SECRET = os.getenv("SANITY_WEBHOOK_SECRET")

@router.post("/sanity")
async def sanity_webhook(
    payload: dict,
    sanity_signature: str = Header(None, alias="sanity-signature")
):
    """
    Receive Sanity webhook when content changes

    Webhook configuration in Sanity:
    - URL: https://api.kn-kitchen.com/webhooks/sanity
    - Secret: Set in environment variables
    - Trigger on: menuItem changes
    """
    # Verify signature
    if not verify_sanity_signature(payload, sanity_signature):
        raise HTTPException(status_code=401, detail="Invalid signature")

    # Get document type and action
    doc_type = payload.get("_type")
    action = payload.get("_action")  # create, update, delete

    # Clear menu cache if menu item changed
    if doc_type == "menuItem":
        menu_service = MenuService()
        menu_service.clear_cache()

    return {"status": "received"}

def verify_sanity_signature(payload: dict, signature: str) -> bool:
    """Verify Sanity webhook signature"""
    if not signature or not SANITY_WEBHOOK_SECRET:
        return False

    # Calculate expected signature
    payload_str = json.dumps(payload, separators=(",", ":"))
    expected_sig = hmac.new(
        SANITY_WEBHOOK_SECRET.encode(),
        payload_str.encode(),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature, expected_sig)
```

## 4. Handling Rate Changes Safely

**Critical**: When menu prices change in Sanity, existing orders MUST NOT be affected. Orders capture price snapshots.

### Price Snapshot on Order Creation

```python
# ✅ CORRECT: Capture price snapshot when creating order
# backend/src/services/order_service.py
from decimal import Decimal

class OrderService:
    def __init__(self, session: Session, menu_service: MenuService):
        self.session = session
        self.menu_service = menu_service

    async def create_order(self, order_data: CreateOrderDTO, user_id: int) -> Order:
        """
        Create order with price snapshots from Sanity

        CRITICAL: Prices are captured at order time and stored in database.
        Future Sanity price changes do NOT affect this order.
        """
        # Fetch current menu items from Sanity
        sanity_items = await self.menu_service.get_available_items()
        sanity_items_map = {item["_id"]: item for item in sanity_items}

        # Create order
        order = Order(
            customer_id=order_data.customer_id,
            status="draft",
            delivery_date=order_data.delivery_date,
            notes=order_data.notes,
            created_by=user_id
        )

        self.session.add(order)
        self.session.flush()  # Get order.id

        # Create line items with price snapshots
        order_items = []
        subtotal = Decimal("0.00")

        for item_data in order_data.items:
            # Get CURRENT price from Sanity
            sanity_item = sanity_items_map.get(item_data.item_id)

            if not sanity_item:
                raise ValueError(f"Menu item {item_data.item_id} not found")

            if not sanity_item.get("available"):
                raise ValueError(f"Menu item {sanity_item['name']} is not available")

            # SNAPSHOT: Store current price in order line item
            price_at_order = Decimal(str(sanity_item["price"]))
            line_subtotal = price_at_order * item_data.quantity

            line_item = OrderLineItem(
                order_id=order.id,
                item_id=item_data.item_id,  # Sanity document ID
                item_name=sanity_item["name"],  # Snapshot name too
                quantity=item_data.quantity,
                price_at_order=price_at_order,  # SNAPSHOT PRICE
                subtotal=line_subtotal
            )

            order_items.append(line_item)
            subtotal += line_subtotal

        # Calculate totals
        tax = subtotal * Decimal("0.1")  # 10% tax
        total = subtotal + tax

        order.subtotal = subtotal
        order.tax = tax
        order.total = total

        # Save line items
        self.session.add_all(order_items)
        self.session.commit()
        self.session.refresh(order)

        return order
```

### Database Schema for Price Snapshots

```python
# ✅ CORRECT: Order line item with price snapshot
# backend/src/models/order_line_item.py
from sqlmodel import SQLModel, Field
from decimal import Decimal

class OrderLineItem(SQLModel, table=True):
    """
    Order line item with price snapshot

    IMPORTANT: price_at_order is the price when order was created.
    This is independent of current Sanity price.
    """
    __tablename__ = "order_line_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="orders.id", nullable=False, index=True)

    # Sanity reference (for display, not for pricing)
    item_id: str = Field(max_length=100, nullable=False)  # Sanity document ID

    # SNAPSHOT: Name and price at time of order
    item_name: str = Field(max_length=255, nullable=False)
    price_at_order: Decimal = Field(
        max_digits=10,
        decimal_places=2,
        nullable=False,
        description="Price when order was created (snapshot)"
    )

    quantity: int = Field(ge=1, nullable=False)
    subtotal: Decimal = Field(max_digits=10, decimal_places=2, nullable=False)

    # Relationship
    order: "Order" = Relationship(back_populates="line_items")

# When displaying order details, show price_at_order (not current Sanity price)
```

### Frontend: Display Snapshot Prices

```typescript
// ✅ CORRECT: Display order with snapshot prices
// app/orders/[id]/page.tsx
import { getOrder } from "@/lib/api";

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const order = await getOrder(params.id);

  return (
    <div>
      <h1>Order #{order.id}</h1>

      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Quantity</th>
            <th>Price (at order time)</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {order.line_items.map((item) => (
            <tr key={item.id}>
              <td>{item.item_name}</td>
              <td>{item.quantity}</td>
              {/* Show snapshot price, not current price */}
              <td>${item.price_at_order.toFixed(2)}</td>
              <td>${item.subtotal.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div>
        <p>Subtotal: ${order.subtotal.toFixed(2)}</p>
        <p>Tax: ${order.tax.toFixed(2)}</p>
        <p>Total: ${order.total.toFixed(2)}</p>
      </div>
    </div>
  );
}

// ❌ WRONG: Fetching current price from Sanity for order display
// This would show different prices than what customer was charged!
```

### Price Change Notification

```typescript
// ✅ CORRECT: Show warning if current price differs from snapshot
// components/OrderLineItem.tsx
"use client";

import { useEffect, useState } from "react";
import { sanityClient } from "@/lib/sanity/client";

export function OrderLineItemRow({ lineItem }: { lineItem: OrderLineItem }) {
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);

  useEffect(() => {
    // Fetch current price from Sanity (for comparison only)
    async function fetchCurrentPrice() {
      const item = await sanityClient.fetch(
        `*[_type == "menuItem" && _id == $id][0].price`,
        { id: lineItem.item_id }
      );
      setCurrentPrice(item);
    }

    fetchCurrentPrice();
  }, [lineItem.item_id]);

  const priceChanged = currentPrice !== null && currentPrice !== lineItem.price_at_order;

  return (
    <tr>
      <td>{lineItem.item_name}</td>
      <td>{lineItem.quantity}</td>
      <td>
        ${lineItem.price_at_order.toFixed(2)}
        {priceChanged && (
          <span className="text-xs text-gray-500 ml-2">
            (Current: ${currentPrice?.toFixed(2)})
          </span>
        )}
      </td>
      <td>${lineItem.subtotal.toFixed(2)}</td>
    </tr>
  );
}
```

## Best Practices Checklist

- [ ] **Sanity is Authoritative**: Menu items managed exclusively in Sanity
- [ ] **Schema Validation**: Required fields, min/max validation in Sanity schemas
- [ ] **Type Safety**: TypeScript interfaces for Sanity documents
- [ ] **GROQ Projections**: Fetch only needed fields to reduce payload
- [ ] **Reference Resolution**: Use `->` to dereference linked documents
- [ ] **Image Optimization**: Use `@sanity/image-url` for image transformations
- [ ] **Server-Side Fetching**: Fetch in Server Components when possible (better SEO)
- [ ] **Caching Strategy**: Use ISR (`revalidate`) or cache in backend with TTL
- [ ] **Webhooks**: Invalidate cache when Sanity content changes
- [ ] **Price Snapshots**: Capture prices at order time, store in database
- [ ] **Never Reference Live Prices**: Orders display `price_at_order`, not current Sanity price
- [ ] **CDN Usage**: `useCdn: true` for production (faster reads)
- [ ] **API Versioning**: Pin API version for stability

## Reference Documents

- Constitution: `.specify/memory/constitution.md` (Single source of truth for content)
- System Architecture: `.claude/skills/system-architecture.md` (CMS vs transactional data)
- FastAPI Backend: `.claude/skills/fastapi-backend.md` (API integration)
- Next.js App Router: `.claude/skills/nextjs-app-router.md` (Server-side fetching)

---

**Remember**: Sanity is the authoritative source for menu data. Always fetch current data from Sanity for NEW orders, but ALWAYS use price snapshots from the database for EXISTING orders. Price changes in Sanity must never affect past orders.
