---
id: 011
title: Create Sanity.io CMS Integration Skill
stage: constitution
date: 2026-01-16
surface: agent
model: claude-sonnet-4-5
feature: none
branch: master
user: system
command: manual
labels: ["skill", "sanity", "cms", "content-management", "groq"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - .claude/skills/sanity-io-cms.md
tests:
  - None
---

## Prompt

Create a skill named "Sanity.io CMS Integration".

Includes:
- Schema design
- GROQ queries
- Syncing CMS data to frontend
- Handling rate changes safely

Create at:
.claude/skills/sanity-io-cms.md

## Response snapshot

Created mandatory Sanity.io CMS Integration skill at `.claude/skills/sanity-io-cms.md`.

The skill defines comprehensive CMS integration patterns for KN KITCHEN:

**Core Principles:**
1. Sanity is Authoritative - Menu items, prices, availability managed exclusively in Sanity
2. Price Snapshots - Orders capture price at order time, don't reference current Sanity prices
3. No Duplication - Backend fetches from Sanity, may cache, but doesn't store authoritative copies
4. Type Safety - Use TypeScript types for Sanity documents
5. Query Efficiency - Use GROQ projections to fetch only needed fields

**1. Schema Design:**

**Menu Item Schema:**
- Fields: name, slug, description, price, category (reference), section (reference), image, available, minimumQuantity, tags, allergens, priceHistory
- Validation: Required fields, min/max constraints, custom validation (e.g., price > 10000 warning)
- Image with hotspot and alt text
- Price history array (automatically updated when price changes)
- Preview with title, price, availability status

**Category Schema:**
- Fields: name, slug, description, order
- Display order for sorting

**Menu Section Schema:**
- Fields: name, order
- Sections like "Appetizers", "Entrees", "Desserts"

**Schema Registration:**
- Export all schemas from index.ts
- Register in Sanity config

**2. GROQ Queries:**

**Basic Queries:**
- `availableMenuItemsQuery`: All available items with category/section resolution
- `menuItemsByCategoryQuery`: Filter by category with parameters
- `menuItemByIdQuery`: Single item with full details
- `menuGroupedBySectionQuery`: Menu organized by sections
- `categoriesWithCountsQuery`: Categories with item counts

**Advanced Features:**
- Projections: Select specific fields `{ name, price, "imageUrl": image.asset->url }`
- References: Dereference with `->` operator `"categoryName": category->name`
- Filtering: Multiple conditions with `&&`
- Ordering: `| order(price desc, name asc)`
- Pagination: `[0..10]` for first 10 items
- Aggregations: `count()`, `avg()`, `min()`, `max()`

**3. Syncing CMS Data to Frontend:**

**Sanity Client Setup:**
```typescript
createClient({
  projectId, dataset, apiVersion,
  useCdn: true,          // Use CDN for faster reads
  perspective: "published" // Only published documents
});
```

**Server-Side Fetching (Next.js):**
```typescript
// Server Component (async)
const items = await sanityClient.fetch(query, {}, {
  next: { revalidate: 300 } // ISR: revalidate every 5 minutes
});
```

**Client-Side Fetching:**
```typescript
// Client Component with useEffect
useEffect(() => {
  sanityClient.fetch(query).then(setItems);
}, []);
```

**Backend Integration (FastAPI):**
```python
# Python Sanity client
client = Client(project_id, dataset, api_version, use_cdn=True)
items = client.fetch(query)

# Caching with TTL
self._cache[key] = (data, timestamp)
if datetime.now() - cached_at < ttl:
    return cached_data
```

**Webhooks for Real-Time Updates:**
```python
@router.post("/webhooks/sanity")
async def sanity_webhook(payload, signature):
    # Verify HMAC signature
    # Clear cache when menuItem changes
    if payload["_type"] == "menuItem":
        menu_service.clear_cache()
```

**4. Handling Rate Changes Safely:**

**Price Snapshot on Order Creation:**
```python
# Fetch CURRENT price from Sanity
sanity_item = await menu_service.get_item_by_id(item_id)

# SNAPSHOT: Store current price in order line item
line_item = OrderLineItem(
    item_id=item_id,
    item_name=sanity_item["name"],
    price_at_order=Decimal(sanity_item["price"]),  # SNAPSHOT
    quantity=quantity,
)
```

**Database Schema:**
```python
class OrderLineItem(SQLModel):
    item_id: str              # Sanity document ID (reference only)
    item_name: str            # Snapshot name
    price_at_order: Decimal   # Snapshot price (CRITICAL)
    quantity: int
    subtotal: Decimal
```

**Display Snapshot Prices:**
```typescript
// Show snapshot price from database, NOT current Sanity price
<td>${lineItem.price_at_order.toFixed(2)}</td>

// Optional: Show current price for comparison
{currentPrice !== price_at_order && (
  <span>(Current: ${currentPrice})</span>
)}
```

**Key Rule:**
- NEW orders: Fetch current Sanity prices
- EXISTING orders: Display `price_at_order` from database
- NEVER update past order prices when Sanity prices change

**Caching Strategy:**
- Backend: 5-minute TTL cache for menu items
- Frontend SSR: ISR with 5-minute revalidation
- Webhook: Invalidate cache on Sanity changes

**Image Optimization:**
```typescript
import imageUrlBuilder from "@sanity/image-url";
const builder = imageUrlBuilder(client);
const url = builder.image(source)
  .width(800)
  .height(600)
  .fit("crop")
  .url();
```

**Best Practices Checklist:**
- [ ] Sanity is authoritative source
- [ ] Schema validation (required, min/max)
- [ ] TypeScript interfaces for documents
- [ ] GROQ projections (only needed fields)
- [ ] Reference resolution with `->`
- [ ] Image URL builder for optimization
- [ ] Server-side fetching when possible
- [ ] Caching with ISR or backend TTL
- [ ] Webhooks to invalidate cache
- [ ] Price snapshots at order time
- [ ] Never reference live prices in orders
- [ ] CDN usage in production
- [ ] API version pinning

## Outcome

- ✅ Impact: Established comprehensive Sanity CMS integration ensuring proper content management, efficient queries, safe price handling, and no data duplication in accordance with constitution principles
- 🧪 Tests: None (CMS integration patterns)
- 📁 Files: Created .claude/skills/sanity-io-cms.md (612 lines)
- 🔁 Next prompts: Reference during menu implementation, validate price snapshot logic in order creation
- 🧠 Reflection: Skill emphasizes critical price snapshot pattern preventing past orders from being affected by price changes, with comprehensive GROQ query examples and proper caching strategies

## Evaluation notes (flywheel)

- Failure modes observed: None (initial creation)
- Graders run and results (PASS/FAIL): Will be validated during menu item integration and order creation implementation
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Test price snapshot capture and webhook cache invalidation during first order creation with Sanity menu items
