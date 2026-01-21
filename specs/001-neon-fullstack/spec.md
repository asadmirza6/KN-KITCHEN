# Feature Specification: Neon PostgreSQL Full-Stack Application

**Feature Branch**: `001-neon-fullstack`
**Created**: 2026-01-16
**Status**: Draft
**Input**: User description: "Transform the KN KITCHEN project into a full-stack web application using Neon PostgreSQL as the only persistent data source. Sanity.io is removed completely. Backend and frontend must work with Neon DB for all content, images, orders, and gallery items. The system must support admin-managed content (banners, items, gallery images) via frontend without direct DB access."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Customer Views Public Website (Priority: P1)

A customer visits the KN KITCHEN website to browse catering offerings, view gallery images, and explore available menu items.

**Why this priority**: Core public-facing functionality that delivers immediate value and allows customers to discover the business. This is the foundation for all other features.

**Independent Test**: Can be fully tested by navigating to the website homepage and viewing banners, gallery images, and menu items fetched from Neon DB. Delivers value by presenting business information to potential customers.

**Acceptance Scenarios**:

1. **Given** I am a visitor to the website, **When** I land on the homepage, **Then** I see an auto-rotating banner slider with images fetched from Neon DB
2. **Given** I am viewing the homepage, **When** I click on the GALLERY navigation link, **Then** I see a grid of gallery images fetched from Neon DB
3. **Given** I am viewing the homepage, **When** I scroll to the menu items section, **Then** I see a list of available menu items with names, prices per kg, and images
4. **Given** I am a mobile user, **When** I visit the website, **Then** the layout is responsive and adapts to my screen size
5. **Given** I am viewing any page, **When** I click navigation links (HOME, ABOUT, GALLERY, CONTACT, FEEDBACK), **Then** I navigate to the corresponding section

---

### User Story 2 - Admin Authentication and Access (Priority: P2)

An administrator needs to log into the system to manage content (banners, menu items, gallery images) and view orders.

**Why this priority**: Required before any admin functionality can be used. Without authentication, the admin panel cannot be secured.

**Independent Test**: Can be fully tested by creating an admin user account, logging in via the login button, and verifying JWT token is issued and stored. Delivers value by protecting admin features.

**Acceptance Scenarios**:

1. **Given** I am an administrator with valid credentials, **When** I click the Login button and enter my email and password, **Then** I am authenticated via JWT and redirected to the admin panel
2. **Given** I am logged in as an administrator, **When** I view the navbar, **Then** I see my name and a Logout button instead of the Login button
3. **Given** I am an unauthenticated user, **When** I attempt to access the admin panel URL directly, **Then** I am redirected to the login page
4. **Given** I am logged in as an administrator, **When** I click the Logout button, **Then** my session is terminated and I am redirected to the homepage
5. **Given** I am a new administrator, **When** I sign up with email and password, **Then** my account is created in Neon DB and I can log in

---

### User Story 3 - Admin Manages Menu Items (Priority: P3)

An administrator needs to add, edit, and delete menu items with images to keep the menu up-to-date.

**Why this priority**: Enables content management for the core product offering. Depends on authentication (P2) but is independent of other admin features.

**Independent Test**: Can be fully tested by logging in as admin, adding a new menu item with name, price per kg, and image upload, then verifying it appears on the public website. Delivers value by allowing menu updates without developer intervention.

**Acceptance Scenarios**:

1. **Given** I am logged in as an administrator, **When** I navigate to the admin panel and click "Add New Item", **Then** I see a form to enter item name, price per kg, and upload an image
2. **Given** I am adding a new menu item, **When** I fill in all required fields and upload an image, **Then** the image is saved to `/uploads` folder, the URL is stored in Neon DB, and the item appears on the public menu
3. **Given** I am viewing the list of menu items in the admin panel, **When** I click "Edit" on an existing item, **Then** I can update its name, price, or image
4. **Given** I am editing a menu item, **When** I upload a new image, **Then** the old image is replaced and the new image URL is saved in Neon DB
5. **Given** I am viewing the list of menu items in the admin panel, **When** I click "Delete" on an item, **Then** the item is removed from Neon DB and no longer appears on the public website

---

### User Story 4 - Admin Manages Gallery Images (Priority: P3)

An administrator needs to upload new gallery images and remove old ones to showcase the business.

**Why this priority**: Enables visual content management independent of menu items. Parallel to menu management in priority.

**Independent Test**: Can be fully tested by logging in as admin, uploading a new gallery image, and verifying it appears in the public gallery section. Delivers value by allowing gallery updates.

**Acceptance Scenarios**:

1. **Given** I am logged in as an administrator, **When** I navigate to the admin panel and click "Upload Gallery Image", **Then** I see an upload form
2. **Given** I am uploading a gallery image, **When** I select an image file and submit, **Then** the image is saved to `/uploads` folder with type "gallery" in Neon DB and appears in the public gallery
3. **Given** I am viewing gallery images in the admin panel, **When** I click "Delete" on an image, **Then** it is marked as inactive in Neon DB and removed from the public gallery
4. **Given** I am viewing the public gallery, **When** new images are uploaded by admin, **Then** they automatically appear without page refresh (or on next load)

---

### User Story 5 - Admin Changes Banners (Priority: P3)

An administrator needs to upload and activate banners for the homepage hero slider.

**Why this priority**: Enables homepage visual content management. Independent feature parallel to gallery and menu management.

**Independent Test**: Can be fully tested by logging in as admin, uploading a new banner image, activating it, and verifying it appears in the homepage slider. Delivers value by allowing promotional content updates.

**Acceptance Scenarios**:

1. **Given** I am logged in as an administrator, **When** I navigate to the admin panel and click "Manage Banners", **Then** I see a list of existing banners and an upload option
2. **Given** I am uploading a new banner, **When** I select an image file and submit, **Then** the banner is saved with type "banner" in Neon DB
3. **Given** I am viewing banners in the admin panel, **When** I toggle the "Active" status of a banner, **Then** only active banners appear in the public homepage slider
4. **Given** I am viewing the homepage, **When** there are multiple active banners, **Then** they auto-rotate in a slider

---

### User Story 6 - Admin Generates Order (Priority: P4)

An administrator needs to create orders on behalf of customers, specifying items, quantities, total amount, advance payment, and remaining balance.

**Why this priority**: Business-critical for order management but can be added after content management is functional. Requires menu items to exist (depends on P3).

**Independent Test**: Can be fully tested by logging in as admin, creating a new order with customer details and menu items, and verifying the order is saved to Neon DB with calculated totals. Delivers value by digitizing order management.

**Acceptance Scenarios**:

1. **Given** I am logged in as an administrator, **When** I navigate to the admin panel and click "Create Order", **Then** I see an order form
2. **Given** I am creating an order, **When** I select menu items with quantities, **Then** the system calculates the total amount based on price per kg from Neon DB
3. **Given** I am creating an order, **When** I enter an advance payment amount, **Then** the system calculates the remaining balance (total - advance)
4. **Given** I am submitting an order, **When** I click "Save Order", **Then** the order is stored in Neon DB with user_id, items JSON, total_amount, advance_payment, balance, and created_at timestamp
5. **Given** I am viewing orders in the admin panel, **When** I filter by date or customer, **Then** I see relevant orders from Neon DB

---

### Edge Cases

- What happens when an admin uploads an image larger than 10MB? System should reject with clear error message or auto-resize.
- How does the system handle concurrent banner uploads by multiple admins? Last write wins with timestamp conflict resolution.
- What happens when a menu item price is updated while an order is being created? Order uses price at the moment of submission (price snapshot).
- How does the system handle deleted menu items that are referenced in existing orders? Historical orders retain item names and prices even if item is deleted.
- What happens when JWT token expires while admin is working? User is redirected to login page with session timeout message.
- How does the system handle image upload failures (network errors, disk full)? Clear error message returned to admin, database remains consistent (no partial saves).
- What happens when a customer views the website while admin is updating banners? Customer sees previous active banners until page refresh.
- How does the system handle malicious file uploads (e.g., executable files)? Backend validates file type (only images allowed: JPEG, PNG, GIF, WebP).

## Requirements *(mandatory)*

### Functional Requirements

**Authentication & Authorization:**

- **FR-001**: System MUST provide user signup functionality with email and password stored securely (hashed) in Neon DB
- **FR-002**: System MUST authenticate users via email/password using Better Auth and issue JWT tokens with 7-day expiration
- **FR-003**: System MUST verify JWT tokens on all admin API endpoints using middleware
- **FR-004**: System MUST protect admin panel routes from unauthenticated access by redirecting to login page
- **FR-005**: System MUST allow users to log out, invalidating their JWT session

**Backend API (FastAPI + SQLModel):**

- **FR-006**: System MUST connect to Neon PostgreSQL using the provided connection string with SSL mode required
- **FR-007**: System MUST define SQLModel models for: users, orders, items, media_assets tables
- **FR-008**: System MUST provide REST API endpoints for CRUD operations on items, orders, and media_assets
- **FR-009**: System MUST provide file upload endpoints accepting multipart/form-data for images
- **FR-010**: System MUST store uploaded images in `/uploads` folder and save the URL path in Neon DB
- **FR-011**: System MUST provide API to fetch active banners (where is_active=true and type='banner')
- **FR-012**: System MUST provide API to fetch active gallery images (where is_active=true and type='gallery')
- **FR-013**: System MUST auto-save new orders to Neon DB when created via admin panel

**Frontend (Next.js 16+ App Router):**

- **FR-014**: System MUST render a responsive navbar with KN KITCHEN logo (left), navigation links (center: HOME, ABOUT, GALLERY, CONTACT, FEEDBACK), and Login/Logout button (right)
- **FR-015**: System MUST display an auto-rotating banner slider on homepage fetching active banners from backend API
- **FR-016**: System MUST display a gallery section fetching active gallery images from backend API
- **FR-017**: System MUST provide an admin panel accessible only to authenticated users
- **FR-018**: Admin panel MUST allow admins to add new menu items with name, price per kg, and image upload
- **FR-019**: Admin panel MUST allow admins to upload new gallery images with title
- **FR-020**: Admin panel MUST allow admins to upload and activate/deactivate banners
- **FR-021**: Admin panel MUST provide an order creation form that calculates total_amount, advance_payment, and balance
- **FR-022**: System MUST use TailwindCSS for responsive UI styling
- **FR-023**: Frontend MUST consume FastAPI backend endpoints for all data operations (no direct DB access)

**Database Schema:**

- **FR-024**: users table MUST have columns: id (primary key), name, email (unique), password_hash, created_at
- **FR-025**: orders table MUST have columns: id (primary key), user_id (foreign key), items (JSON), total_amount (decimal), advance_payment (decimal), balance (decimal), created_at
- **FR-026**: items table MUST have columns: id (primary key), name, price_per_kg (decimal), image_url, created_at
- **FR-027**: media_assets table MUST have columns: id (primary key), type (enum: 'banner'/'gallery'/'item'), title, image_url, is_active (boolean), created_at
- **FR-028**: System MUST use Alembic or SQLModel migrations to create and update database schema

**Media Management:**

- **FR-029**: System MUST accept image uploads in JPEG, PNG, GIF, and WebP formats
- **FR-030**: System MUST reject non-image files with appropriate error message
- **FR-031**: System MUST save uploaded images to `/uploads` folder with unique filenames (e.g., timestamp + random string)
- **FR-032**: System MUST store relative image URLs in Neon DB (e.g., `/uploads/1234567890_abc.jpg`)
- **FR-033**: Any change to media_assets.is_active flag MUST reflect automatically on frontend on next fetch

### Key Entities

- **User**: Represents administrators who manage the system. Attributes: id, name, email, password_hash, created_at. Relationships: One user can create many orders.

- **Order**: Represents a catering order placed by or for a customer. Attributes: id, user_id (creator), items (JSON array of item_id and quantity), total_amount, advance_payment, balance, created_at. Relationships: Belongs to one user, references menu items via items JSON.

- **Item**: Represents a menu item available for catering. Attributes: id, name, price_per_kg, image_url, created_at. Relationships: Referenced by orders.

- **MediaAsset**: Represents uploaded media (banners, gallery images). Attributes: id, type ('banner'/'gallery'/'item'), title, image_url, is_active, created_at. Relationships: None (standalone assets).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Customers can view the homepage with banners, gallery, and menu items loaded from Neon DB in under 3 seconds
- **SC-002**: Administrators can complete the login process in under 30 seconds
- **SC-003**: Administrators can add a new menu item with image upload in under 2 minutes
- **SC-004**: System handles 100 concurrent public website visitors without degradation
- **SC-005**: Uploaded images appear on the public website within 5 seconds of admin submission (with page refresh)
- **SC-006**: 95% of image uploads succeed on first attempt with clear error messages for failures
- **SC-007**: Orders are saved to Neon DB with 100% data integrity (no partial saves or data loss)
- **SC-008**: Mobile users have a fully functional responsive experience on devices with screen width 320px and above
- **SC-009**: Admin panel is inaccessible to unauthenticated users with automatic redirect to login page
- **SC-010**: All API endpoints respond in under 500ms for typical operations (excluding large file uploads)

## Assumptions *(optional)*

1. **Single Admin Role**: All authenticated users have full admin permissions. No role-based access control (RBAC) is implemented in this phase.

2. **Order Items as JSON**: Orders store items as a JSON array `[{"item_id": "uuid", "quantity": 10}, ...]` rather than normalized line items table for simplicity.

3. **No Customer Portal**: Orders are created by admins on behalf of customers. Customers do not have login accounts or self-service capabilities.

4. **Local Image Storage**: Images are stored in the `/uploads` folder on the server filesystem. No cloud storage (S3, Cloudflare R2) is used in this phase.

5. **Auto-Save Only**: Orders are created and saved immediately. No draft order functionality or autosave during form filling.

6. **No Email Verification**: User signup does not require email verification. Email/password is sufficient for account creation.

7. **Basic Banner Slider**: Homepage banner slider auto-rotates through all active banners with default timing (e.g., 5 seconds per slide). No manual controls or custom timing settings.

8. **No Image Resizing**: Uploaded images are stored as-is without automatic resizing or thumbnail generation. Admins are responsible for uploading appropriately sized images.

9. **PostgreSQL Only**: Neon PostgreSQL is the only data store. No caching layer (Redis) or search index (Elasticsearch) is included.

10. **Environment Variables**: Sensitive configuration (DB connection string, JWT secret) is stored in `.env` files and loaded at runtime.

## Out of Scope *(optional)*

The following features are explicitly excluded from this phase:

1. **Sanity.io Integration**: All references to Sanity.io CMS are removed. Content is managed via admin panel and stored in Neon DB.

2. **Customer Self-Service**: Customers cannot create accounts, log in, or place orders themselves. All orders are admin-created.

3. **Payment Processing**: No payment gateway integration (Stripe, PayPal). Orders track advance_payment and balance as manual fields.

4. **Inventory Management**: No stock tracking, ingredient management, or low-stock alerts.

5. **Email Notifications**: No automated emails for order confirmation, password reset, or admin notifications.

6. **Advanced Reporting**: No analytics dashboard, revenue charts, or export functionality beyond viewing order list.

7. **Multi-Tenancy**: System supports only one organization/restaurant. No multi-location or franchise support.

8. **API Rate Limiting**: No rate limiting or throttling on API endpoints.

9. **Image Optimization**: No CDN, lazy loading, or responsive image variants (srcset).

10. **Audit Logs**: No detailed audit trail for admin actions (who changed what and when).

11. **Search Functionality**: No search bar for menu items or orders.

12. **Mobile Apps**: No native iOS or Android applications. Mobile experience is responsive web only.

## Dependencies *(optional)*

1. **Neon PostgreSQL Database**: Requires active Neon account with the provided connection string. Database must be accessible with SSL mode.

2. **Better Auth Library**: Backend depends on Better Auth for JWT token generation and verification. Must be compatible with FastAPI.

3. **Next.js 16+**: Frontend requires Next.js version 16 or higher with App Router support.

4. **FastAPI Framework**: Backend built on FastAPI with Python 3.11+ runtime.

5. **SQLModel ORM**: Database interactions use SQLModel for models and migrations.

6. **TailwindCSS**: Frontend styling depends on TailwindCSS framework.

7. **File Upload Library**: Backend requires multipart/form-data parsing library for image uploads (e.g., `python-multipart`).

8. **Image Validation**: Backend requires library to validate image file types (e.g., Pillow or similar).

## Notes *(optional)*

### Architecture Decisions

- **JWT Expiration**: 7-day expiration is used to balance security and user convenience. Users remain logged in for a week without re-authentication.

- **JSON Order Items**: Storing order items as JSON rather than a normalized `order_line_items` table simplifies the initial implementation. This can be refactored later if complex querying is needed.

- **Active Flag Pattern**: `media_assets.is_active` allows soft deletion of banners and gallery images without losing historical data.

- **Backend Calculation**: Order totals are calculated on the backend based on fetched prices from Neon DB to prevent frontend manipulation.

### Security Considerations

- **Password Hashing**: User passwords must be hashed using bcrypt or Argon2 before storage in Neon DB.

- **JWT Secret**: The `BETTER_AUTH_SECRET` environment variable must be a strong random string (at least 32 characters) and kept confidential.

- **File Upload Validation**: Backend must validate file types, sizes (max 10MB), and reject malicious files to prevent security vulnerabilities.

- **SQL Injection Prevention**: Use SQLModel parameterized queries exclusively. Never concatenate user input into SQL strings.

- **CORS Configuration**: Backend must configure CORS to only allow requests from the frontend domain in production.

### Migration from Sanity.io

Since this specification removes Sanity.io completely:

1. **Content Migration**: Any existing content in Sanity.io (menu items, images) must be manually migrated to Neon DB by admins via the admin panel.

2. **No Backward Compatibility**: The system will not read from or write to Sanity.io. All Sanity client code must be removed from frontend and backend.

3. **Media Asset Transfer**: Images previously hosted in Sanity.io must be re-uploaded via the admin panel to the `/uploads` folder.

### Future Enhancements (Not in Scope)

- **Draft Orders**: Save incomplete orders as drafts with autosave every 30 seconds.
- **Customer Portal**: Allow customers to create accounts, browse menu, and place orders directly.
- **Payment Integration**: Integrate Stripe for online payment processing.
- **Order Status Workflow**: Add order states (pending, confirmed, in progress, completed, cancelled) with status transitions.
- **Cloud Image Storage**: Migrate `/uploads` folder to Cloudflare R2 or AWS S3 for scalability.
- **PDF Invoice Generation**: Generate PDF invoices for completed orders using ReportLab.
- **Email Notifications**: Send order confirmations and updates via SendGrid or similar service.
- **Advanced Admin Features**: Order filtering, sorting, bulk actions, and CSV export.
