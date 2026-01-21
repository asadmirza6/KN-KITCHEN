---
id: 014
title: Create PDF Invoice Generation Skill
stage: constitution
date: 2026-01-16
surface: agent
model: claude-sonnet-4-5
feature: none
branch: master
user: system
command: manual
labels: ["skill", "pdf", "invoices", "billing", "immutability", "storage", "backend"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - .claude/skills/pdf-invoice-generation.md
tests:
  - None
---

## Prompt

Create a skill named "PDF Invoice Generation".

Includes:
- Invoice layout
- Branding
- Data locking
- File storage strategy

Create at:
.claude/skills/pdf-invoice-generation.md

## Response snapshot

Created mandatory PDF Invoice Generation skill at `.claude/skills/pdf-invoice-generation.md`.

The skill defines comprehensive invoice generation patterns for KN KITCHEN:

**Core Principles:**
1. Immutability - Once generated, invoices NEVER change
2. Versioning - Order modifications create NEW invoice versions
3. Complete Snapshots - Invoices capture ALL data at generation time
4. Audit Trail - Track generation time, user, and version number
5. Accessible - Old invoice versions remain retrievable forever

**1. Invoice Layout:**

**Required Sections:**
- Header (company branding, logo, contact info)
- Invoice metadata (number, date, version)
- Customer information (bill to)
- Order details (order number, delivery date)
- Line items table (item name, quantity, unit price, subtotal)
- Totals section (subtotal, tax, total)
- Payment information (amount paid, remaining balance)
- Footer (payment terms, thank you message)

**Implementation Options:**
- ReportLab: Python PDF generation library with programmatic layout control
- WeasyPrint: HTML-to-PDF conversion using Jinja2 templates

**ReportLab Example:**
```python
def generate_invoice_pdf(order, invoice_number, version=1) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)

    story = []
    story.extend(build_header())           # Logo + company info
    story.extend(build_invoice_metadata()) # Number, date, version
    story.extend(build_customer_section()) # Bill to
    story.extend(build_line_items_table()) # Items table
    story.extend(build_totals_section())   # Subtotal, tax, total
    story.extend(build_payment_section())  # Paid, remaining
    story.extend(build_footer())           # Terms

    doc.build(story)
    return buffer.getvalue()
```

**Line Items Table Styling:**
- Header row: dark background (#4a4a4a), white text
- Alternating row colors: white and light gray (#f9f9f9)
- Columns: Item Name, Quantity, Unit Price, Subtotal
- Right-align numbers, left-align item names
- Grid borders with 0.5pt gray lines

**2. Branding:**

**Centralized Brand Configuration:**
```python
class BrandConfig:
    COMPANY_NAME = "KN KITCHEN"
    COMPANY_ADDRESS = "123 Catering Avenue"
    COMPANY_PHONE = "(555) 123-4567"
    COMPANY_EMAIL = "orders@knkitchen.com"

    LOGO_PATH = "static/logo.png"
    LOGO_WIDTH = 2.0  # inches
    LOGO_HEIGHT = 1.0  # inches

    PRIMARY_COLOR = colors.HexColor("#1a1a1a")
    SECONDARY_COLOR = colors.HexColor("#4a4a4a")
    ACCENT_COLOR = colors.HexColor("#d9534f")  # Red for balances
    SUCCESS_COLOR = colors.HexColor("#5cb85c")  # Green for paid

    PAYMENT_TERMS = "Payment due within 30 days of invoice date."
```

**Benefits:**
- Single source of truth for brand elements
- Easy updates (change address once, affects all invoices)
- Consistent visual identity across all documents
- Centralized color palette and typography

**3. Data Locking (Immutability):**

**Invoice Metadata Model:**
```python
class Invoice(SQLModel, table=True):
    id: Optional[int] = Field(primary_key=True)
    invoice_number: str = Field(unique=True)  # "INV-2024-00042-V1"
    version: int = Field(default=1)

    order_id: int = Field(foreign_key="order.id")

    file_path: str  # Where PDF is stored
    file_size: int  # PDF size in bytes

    # Snapshot data (immutable)
    customer_name: str
    order_total: Decimal
    order_subtotal: Decimal
    order_tax: Decimal

    # Audit trail
    generated_at: datetime
    generated_by: int = Field(foreign_key="user.id")
    is_superseded: bool = Field(default=False)  # True if newer version exists
```

**Versioning Rules:**
1. First invoice for order: `version=1`
2. Order modified after billing: Generate new invoice with `version=2`
3. Mark previous invoice: `is_superseded=True`
4. All versions remain in database and storage
5. `order.latest_invoice` property returns non-superseded invoice

**Invoice Number Format:**
- Format: `INV-{YEAR}-{ORDER_ID}-V{VERSION}`
- Example: `INV-2024-00042-V1` (Order 42, Version 1)
- Example: `INV-2024-00042-V2` (Order 42, Version 2 - revised)

**Immutability Enforcement:**
```python
def __setattr__(self, name, value):
    """Prevent modification after creation (except is_superseded)."""
    if hasattr(self, "id") and self.id is not None:
        if name not in ["is_superseded", "_sa_instance_state"]:
            raise ValueError(
                "Cannot modify invoice after generation. "
                "Create a new version instead."
            )
    super().__setattr__(name, value)
```

**4. File Storage Strategy:**

**Storage Options:**

| Backend | Pros | Cons | Use Case |
|---------|------|------|----------|
| Local Filesystem | Simple, no external deps | Not scalable | Development |
| AWS S3 | Scalable, reliable, CDN | Cost, vendor lock-in | Production (AWS) |
| Cloudflare R2 | S3-compatible, cheaper egress | Newer service | Production (Cloudflare) |

**Abstract Storage Service:**
```python
class StorageService(ABC):
    @abstractmethod
    def store_invoice(self, invoice_number: str, pdf_bytes: bytes) -> str:
        """Store PDF and return file path/key."""
        pass

    @abstractmethod
    def retrieve_invoice(self, file_path: str) -> bytes:
        """Retrieve PDF bytes."""
        pass
```

**Local Implementation:**
```python
class LocalStorageService(StorageService):
    def store_invoice(self, invoice_number, pdf_bytes):
        # Structure: data/invoices/{year}/{month}/{invoice_number}.pdf
        year = datetime.now().year
        month = datetime.now().strftime("%m")
        dir_path = Path(f"data/invoices/{year}/{month}")
        dir_path.mkdir(parents=True, exist_ok=True)

        file_path = dir_path / f"{invoice_number}.pdf"
        file_path.write_bytes(pdf_bytes)

        return str(file_path.relative_to("data/invoices"))
```

**S3/R2 Implementation:**
```python
class S3StorageService(StorageService):
    def store_invoice(self, invoice_number, pdf_bytes):
        # S3 key: invoices/{year}/{month}/{invoice_number}.pdf
        year = datetime.now().year
        month = datetime.now().strftime("%m")
        s3_key = f"invoices/{year}/{month}/{invoice_number}.pdf"

        self.s3_client.put_object(
            Bucket=self.bucket_name,
            Key=s3_key,
            Body=pdf_bytes,
            ContentType="application/pdf",
            ServerSideEncryption="AES256",
        )

        return s3_key
```

**Configuration:**
```python
class Settings(BaseSettings):
    STORAGE_BACKEND: Literal["local", "s3", "r2"] = "local"

    # Local
    LOCAL_STORAGE_PATH: str = "data/invoices"

    # S3/R2
    S3_BUCKET_NAME: str = ""
    S3_REGION: str = "us-east-1"
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_ENDPOINT_URL: Optional[str] = None  # For R2
```

**File Organization:**
```
invoices/
  ├── 2024/
  │   ├── 01/
  │   │   ├── INV-2024-00001-V1.pdf
  │   │   ├── INV-2024-00001-V2.pdf  (revised)
  │   │   └── INV-2024-00042-V1.pdf
  │   ├── 02/
  │   │   └── INV-2024-00103-V1.pdf
  │   └── ...
  └── 2025/
      └── ...
```

**Download Endpoints:**
```python
# Download as attachment
@router.get("/{invoice_id}/download")
async def download_invoice(invoice_id):
    pdf_bytes = storage_service.retrieve_invoice(invoice.file_path)
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{invoice.invoice_number}.pdf"'
        },
    )

# View inline (browser preview)
@router.get("/{invoice_id}/view")
async def view_invoice(invoice_id):
    # Same as download but with "inline" disposition
    headers={"Content-Disposition": f'inline; filename="{invoice.invoice_number}.pdf"'}
```

**Common Pitfalls:**

**Pitfall 1: Modifying Existing Invoices**
- ❌ WRONG: Update invoice.order_total when order changes
- ✅ CORRECT: Generate new invoice version, mark old as superseded

**Pitfall 2: Missing Version Control**
- ❌ WRONG: Delete old invoice when generating new one
- ✅ CORRECT: Keep all versions, mark old as superseded

**Pitfall 3: Using Current Prices**
- ❌ WRONG: Fetch current Sanity prices when generating invoice
- ✅ CORRECT: Use `price_at_order` from order line items (snapshot)

**Pitfall 4: Storing PDFs in Database**
- ❌ WRONG: Store pdf_bytes in invoice.pdf_data column
- ✅ CORRECT: Store in filesystem/S3, save file_path reference

**Pitfall 5: Hardcoded Branding**
- ❌ WRONG: Hardcode "KN KITCHEN" and "123 Main St" in PDF code
- ✅ CORRECT: Use BrandConfig.COMPANY_NAME and BrandConfig.COMPANY_ADDRESS

**Best Practices Checklist:**
- [ ] Complete invoice layout (header, customer, items, totals, footer)
- [ ] Centralized brand configuration (BrandConfig class)
- [ ] Logo inclusion with proper sizing
- [ ] Professional table styling (alternating rows, proper alignment)
- [ ] Required fields (invoice number, date, version)
- [ ] Immutable invoice records (no updates except supersede flag)
- [ ] Version control (increment on order changes)
- [ ] Supersede tracking (mark old versions)
- [ ] Audit trail (generation time, user)
- [ ] Complete snapshots (customer name, totals in metadata)
- [ ] Abstract storage service (supports local, S3, R2)
- [ ] Environment-based configuration
- [ ] Year/month folder organization
- [ ] Consistent naming (INV-{YEAR}-{ORDER_ID}-V{VERSION}.pdf)
- [ ] Download and view endpoints

## Outcome

- ✅ Impact: Established comprehensive invoice generation patterns ensuring legal document immutability through version control, professional layout with branding, complete data snapshots, and flexible storage strategy in accordance with Constitution Principle V (Billing Immutability)
- 🧪 Tests: None (invoice generation patterns)
- 📁 Files: Created .claude/skills/pdf-invoice-generation.md (1,247 lines)
- 🔁 Next prompts: Reference during invoice generation implementation, validate immutability and versioning during first invoice generation and order modification flows
- 🧠 Reflection: Skill emphasizes critical principle that invoices NEVER change after generation (immutability), with comprehensive versioning strategy (mark old as superseded, create new version), professional ReportLab layout examples, centralized branding configuration, and abstract storage service supporting local filesystem, AWS S3, and Cloudflare R2

## Evaluation notes (flywheel)

- Failure modes observed: None (initial creation)
- Graders run and results (PASS/FAIL): Will be validated during first invoice generation implementation, order modification scenario (version 2), and storage service integration
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Test invoice generation with ReportLab, verify immutability enforcement (attempt to modify invoice), test version control (modify order, generate V2), and validate storage service (local and S3)
