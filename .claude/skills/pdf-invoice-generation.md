---
name: PDF Invoice Generation
description: Patterns for generating immutable PDF invoices with proper layout, branding, data locking, and storage
scope: mandatory
applies_to: backend
---

# PDF Invoice Generation

**Status**: MANDATORY - All invoice generation MUST follow these patterns

## Overview

PDF invoices are legal documents representing financial commitments between KN KITCHEN and customers. This skill defines how invoices are generated, formatted, stored, and versioned in accordance with Constitution Principle V (Billing Immutability).

**Key Technologies:**
- ReportLab (Python PDF generation) or WeasyPrint (HTML-to-PDF)
- FastAPI (invoice generation endpoint)
- Cloud Storage (S3, Cloudflare R2, or filesystem)
- SQLModel (invoice metadata tracking)

## Core Principles

1. **Immutability**: Once generated, invoices NEVER change
2. **Versioning**: Order modifications create NEW invoice versions
3. **Complete Snapshots**: Invoices capture ALL data at generation time
4. **Audit Trail**: Track generation time, user, and version number
5. **Accessible**: Old invoice versions remain retrievable forever

## 1. Invoice Layout

A professional invoice layout with required sections and formatting.

### Required Invoice Sections

```python
# ✅ CORRECT: Complete invoice structure
INVOICE_REQUIRED_SECTIONS = [
    "Header (Company branding, invoice number, date)",
    "Customer Information (bill to)",
    "Order Details (order number, delivery date)",
    "Line Items Table (item, quantity, price, subtotal)",
    "Totals (subtotal, tax, total)",
    "Payment Information (amount paid, remaining balance)",
    "Footer (payment terms, thank you message)",
]
```

### Invoice Layout with ReportLab

```python
# ✅ CORRECT: PDF invoice generation with ReportLab
# backend/src/services/invoice_service.py
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
    Image,
)
from reportlab.lib.enums import TA_RIGHT, TA_CENTER
from decimal import Decimal
from datetime import datetime
from io import BytesIO

class InvoiceService:
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Define custom paragraph styles."""
        # Company name style
        self.styles.add(ParagraphStyle(
            name="CompanyName",
            parent=self.styles["Heading1"],
            fontSize=24,
            textColor=colors.HexColor("#1a1a1a"),
            spaceAfter=6,
        ))

        # Invoice title style
        self.styles.add(ParagraphStyle(
            name="InvoiceTitle",
            parent=self.styles["Heading2"],
            fontSize=18,
            textColor=colors.HexColor("#4a4a4a"),
            spaceAfter=12,
        ))

        # Right-aligned text
        self.styles.add(ParagraphStyle(
            name="RightAlign",
            parent=self.styles["Normal"],
            alignment=TA_RIGHT,
        ))

    def generate_invoice_pdf(
        self,
        order: Order,
        invoice_number: str,
        version: int = 1,
    ) -> bytes:
        """
        Generate PDF invoice for an order.

        Args:
            order: Confirmed order with line items
            invoice_number: Unique invoice identifier (e.g., "INV-2024-001")
            version: Invoice version number (default 1)

        Returns:
            PDF bytes
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=0.75 * inch,
            leftMargin=0.75 * inch,
            topMargin=0.75 * inch,
            bottomMargin=0.75 * inch,
        )

        # Build invoice content
        story = []

        # 1. Header with logo and company info
        story.extend(self._build_header())
        story.append(Spacer(1, 0.25 * inch))

        # 2. Invoice metadata (number, date)
        story.extend(self._build_invoice_metadata(invoice_number, version))
        story.append(Spacer(1, 0.25 * inch))

        # 3. Customer information
        story.extend(self._build_customer_section(order.customer))
        story.append(Spacer(1, 0.25 * inch))

        # 4. Order details
        story.extend(self._build_order_details(order))
        story.append(Spacer(1, 0.25 * inch))

        # 5. Line items table
        story.extend(self._build_line_items_table(order.line_items))
        story.append(Spacer(1, 0.25 * inch))

        # 6. Totals
        story.extend(self._build_totals_section(order))
        story.append(Spacer(1, 0.25 * inch))

        # 7. Payment information
        story.extend(self._build_payment_section(order))
        story.append(Spacer(1, 0.5 * inch))

        # 8. Footer
        story.extend(self._build_footer())

        # Generate PDF
        doc.build(story)
        pdf_bytes = buffer.getvalue()
        buffer.close()

        return pdf_bytes

    def _build_header(self) -> list:
        """Company logo and information."""
        elements = []

        # Logo (if exists)
        try:
            logo = Image("static/logo.png", width=2 * inch, height=1 * inch)
            elements.append(logo)
            elements.append(Spacer(1, 0.1 * inch))
        except:
            pass  # No logo - skip

        # Company name
        elements.append(Paragraph("KN KITCHEN", self.styles["CompanyName"]))

        # Company details
        company_info = """
        123 Catering Avenue<br/>
        Culinary City, CC 12345<br/>
        Phone: (555) 123-4567<br/>
        Email: orders@knkitchen.com
        """
        elements.append(Paragraph(company_info, self.styles["Normal"]))

        return elements

    def _build_invoice_metadata(self, invoice_number: str, version: int) -> list:
        """Invoice number, date, and version."""
        elements = []

        elements.append(Paragraph("INVOICE", self.styles["InvoiceTitle"]))

        # Create two-column table for metadata
        metadata_data = [
            ["Invoice Number:", invoice_number],
            ["Invoice Date:", datetime.now().strftime("%B %d, %Y")],
            ["Version:", f"{version}"],
        ]

        metadata_table = Table(metadata_data, colWidths=[2 * inch, 3 * inch])
        metadata_table.setStyle(TableStyle([
            ("ALIGN", (0, 0), (0, -1), "RIGHT"),
            ("ALIGN", (1, 0), (1, -1), "LEFT"),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#666666")),
        ]))

        elements.append(metadata_table)
        return elements

    def _build_customer_section(self, customer) -> list:
        """Bill To section with customer details."""
        elements = []

        elements.append(Paragraph(
            "<b>BILL TO:</b>",
            self.styles["Heading3"]
        ))

        customer_info = f"""
        {customer.name}<br/>
        {customer.email}<br/>
        {customer.phone or 'N/A'}<br/>
        {customer.billing_address or 'N/A'}
        """
        elements.append(Paragraph(customer_info, self.styles["Normal"]))

        return elements

    def _build_order_details(self, order) -> list:
        """Order-specific details."""
        elements = []

        order_data = [
            ["Order Number:", f"#{order.id}"],
            ["Order Date:", order.created_at.strftime("%B %d, %Y")],
            ["Delivery Date:", order.delivery_date.strftime("%B %d, %Y")],
        ]

        order_table = Table(order_data, colWidths=[2 * inch, 3 * inch])
        order_table.setStyle(TableStyle([
            ("ALIGN", (0, 0), (0, -1), "RIGHT"),
            ("ALIGN", (1, 0), (1, -1), "LEFT"),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
        ]))

        elements.append(order_table)
        return elements

    def _build_line_items_table(self, line_items: list) -> list:
        """Line items with quantities and prices."""
        elements = []

        # Table header
        table_data = [
            ["Item", "Quantity", "Unit Price", "Subtotal"],
        ]

        # Add line items
        for item in line_items:
            table_data.append([
                item.item_name,
                str(item.quantity),
                f"${item.price_at_order:.2f}",
                f"${item.subtotal:.2f}",
            ])

        # Create table
        line_items_table = Table(
            table_data,
            colWidths=[3.5 * inch, 1 * inch, 1.25 * inch, 1.25 * inch],
        )

        # Style table
        line_items_table.setStyle(TableStyle([
            # Header row
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4a4a4a")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 11),
            ("ALIGN", (1, 0), (-1, -1), "CENTER"),
            ("ALIGN", (0, 0), (0, -1), "LEFT"),

            # Data rows
            ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 1), (-1, -1), 10),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f9f9f9")]),

            # Borders
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("LINEBELOW", (0, 0), (-1, 0), 2, colors.HexColor("#4a4a4a")),

            # Padding
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]))

        elements.append(line_items_table)
        return elements

    def _build_totals_section(self, order) -> list:
        """Subtotal, tax, and total."""
        elements = []

        totals_data = [
            ["Subtotal:", f"${order.subtotal:.2f}"],
            ["Tax:", f"${order.tax:.2f}"],
            ["", ""],  # Spacer
            ["TOTAL:", f"${order.total:.2f}"],
        ]

        totals_table = Table(totals_data, colWidths=[5.5 * inch, 1.5 * inch])
        totals_table.setStyle(TableStyle([
            ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
            ("FONTNAME", (0, 0), (0, 2), "Helvetica"),
            ("FONTNAME", (1, 0), (1, 2), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, 2), 11),

            # Total row (bold and larger)
            ("FONTNAME", (0, 3), (-1, 3), "Helvetica-Bold"),
            ("FONTSIZE", (0, 3), (-1, 3), 14),
            ("LINEABOVE", (0, 3), (-1, 3), 2, colors.black),
            ("TEXTCOLOR", (0, 3), (-1, 3), colors.HexColor("#1a1a1a")),
        ]))

        elements.append(totals_table)
        return elements

    def _build_payment_section(self, order) -> list:
        """Payment status and remaining balance."""
        elements = []

        payment_data = [
            ["Amount Paid:", f"${order.advance_paid:.2f}"],
            ["Remaining Balance:", f"${order.remaining_balance:.2f}"],
        ]

        payment_table = Table(payment_data, colWidths=[5.5 * inch, 1.5 * inch])
        payment_table.setStyle(TableStyle([
            ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 11),
            ("TEXTCOLOR", (1, 1), (1, 1), colors.HexColor("#d9534f") if order.remaining_balance > 0 else colors.HexColor("#5cb85c")),
        ]))

        elements.append(payment_table)
        return elements

    def _build_footer(self) -> list:
        """Payment terms and thank you message."""
        elements = []

        footer_text = """
        <b>Payment Terms:</b> Payment due within 30 days of invoice date.
        Please make checks payable to KN KITCHEN.<br/>
        <br/>
        <i>Thank you for your business!</i>
        """

        elements.append(Paragraph(footer_text, self.styles["Normal"]))
        return elements
```

### Alternative: HTML-to-PDF with WeasyPrint

```python
# ✅ CORRECT: HTML template approach (alternative)
# backend/src/services/invoice_service_html.py
from weasyprint import HTML
from jinja2 import Template
from decimal import Decimal

class InvoiceServiceHTML:
    def generate_invoice_pdf(self, order, invoice_number, version=1) -> bytes:
        """Generate PDF from HTML template."""
        # Load HTML template
        html_content = self._render_html_template(order, invoice_number, version)

        # Convert to PDF
        pdf_bytes = HTML(string=html_content).write_pdf()
        return pdf_bytes

    def _render_html_template(self, order, invoice_number, version) -> str:
        """Render Jinja2 HTML template."""
        template_str = """
<!DOCTYPE html>
<html>
<head>
    <style>
        @page {
            size: letter;
            margin: 0.75in;
        }
        body {
            font-family: 'Helvetica', sans-serif;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .company-name {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .invoice-title {
            font-size: 18px;
            color: #666;
            margin: 20px 0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        table.line-items th {
            background-color: #4a4a4a;
            color: white;
            padding: 10px;
            text-align: left;
        }
        table.line-items td {
            padding: 10px;
            border-bottom: 1px solid #ddd;
        }
        table.line-items tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        .totals {
            text-align: right;
            margin-top: 20px;
        }
        .totals .total-row {
            font-size: 16px;
            font-weight: bold;
            border-top: 2px solid #000;
            padding-top: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">KN KITCHEN</div>
        <div>123 Catering Avenue | Culinary City, CC 12345</div>
        <div>Phone: (555) 123-4567 | Email: orders@knkitchen.com</div>
    </div>

    <h1 class="invoice-title">INVOICE</h1>

    <table>
        <tr><td><b>Invoice Number:</b></td><td>{{ invoice_number }}</td></tr>
        <tr><td><b>Invoice Date:</b></td><td>{{ invoice_date }}</td></tr>
        <tr><td><b>Version:</b></td><td>{{ version }}</td></tr>
    </table>

    <h3>BILL TO:</h3>
    <p>
        {{ customer.name }}<br/>
        {{ customer.email }}<br/>
        {{ customer.phone or 'N/A' }}<br/>
        {{ customer.billing_address or 'N/A' }}
    </p>

    <h3>LINE ITEMS</h3>
    <table class="line-items">
        <thead>
            <tr>
                <th>Item</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Subtotal</th>
            </tr>
        </thead>
        <tbody>
            {% for item in line_items %}
            <tr>
                <td>{{ item.item_name }}</td>
                <td>{{ item.quantity }}</td>
                <td>${{ "%.2f"|format(item.price_at_order) }}</td>
                <td>${{ "%.2f"|format(item.subtotal) }}</td>
            </tr>
            {% endfor %}
        </tbody>
    </table>

    <div class="totals">
        <p>Subtotal: ${{ "%.2f"|format(order.subtotal) }}</p>
        <p>Tax: ${{ "%.2f"|format(order.tax) }}</p>
        <p class="total-row">TOTAL: ${{ "%.2f"|format(order.total) }}</p>
    </div>

    <p><b>Payment Terms:</b> Payment due within 30 days of invoice date.</p>
    <p><i>Thank you for your business!</i></p>
</body>
</html>
        """

        template = Template(template_str)
        return template.render(
            order=order,
            customer=order.customer,
            line_items=order.line_items,
            invoice_number=invoice_number,
            invoice_date=datetime.now().strftime("%B %d, %Y"),
            version=version,
        )
```

## 2. Branding

Consistent visual identity across all invoices.

### Brand Configuration

```python
# ✅ CORRECT: Centralized brand configuration
# backend/src/config/branding.py
from reportlab.lib import colors

class BrandConfig:
    """KN KITCHEN brand configuration for invoices."""

    # Company information
    COMPANY_NAME = "KN KITCHEN"
    COMPANY_ADDRESS = "123 Catering Avenue"
    COMPANY_CITY_STATE_ZIP = "Culinary City, CC 12345"
    COMPANY_PHONE = "(555) 123-4567"
    COMPANY_EMAIL = "orders@knkitchen.com"
    COMPANY_WEBSITE = "www.knkitchen.com"

    # Logo
    LOGO_PATH = "static/logo.png"
    LOGO_WIDTH = 2.0  # inches
    LOGO_HEIGHT = 1.0  # inches

    # Colors (brand palette)
    PRIMARY_COLOR = colors.HexColor("#1a1a1a")      # Dark gray/black
    SECONDARY_COLOR = colors.HexColor("#4a4a4a")    # Medium gray
    ACCENT_COLOR = colors.HexColor("#d9534f")       # Red (for balances due)
    SUCCESS_COLOR = colors.HexColor("#5cb85c")      # Green (for paid)
    BACKGROUND_COLOR = colors.HexColor("#f9f9f9")   # Light gray

    # Typography
    FONT_FAMILY = "Helvetica"
    FONT_SIZE_TITLE = 24
    FONT_SIZE_HEADING = 18
    FONT_SIZE_BODY = 10
    FONT_SIZE_TOTAL = 14

    # Layout
    PAGE_MARGIN = 0.75  # inches

    # Payment terms
    PAYMENT_TERMS = "Payment due within 30 days of invoice date."
    THANK_YOU_MESSAGE = "Thank you for your business!"
```

### Using Brand Config in Invoice

```python
# ✅ CORRECT: Apply brand configuration
from src.config.branding import BrandConfig

class InvoiceService:
    def _build_header(self) -> list:
        elements = []

        # Use brand logo
        try:
            logo = Image(
                BrandConfig.LOGO_PATH,
                width=BrandConfig.LOGO_WIDTH * inch,
                height=BrandConfig.LOGO_HEIGHT * inch,
            )
            elements.append(logo)
        except:
            pass

        # Use brand company name and colors
        company_name_style = ParagraphStyle(
            name="CompanyName",
            fontSize=BrandConfig.FONT_SIZE_TITLE,
            textColor=BrandConfig.PRIMARY_COLOR,
        )
        elements.append(Paragraph(BrandConfig.COMPANY_NAME, company_name_style))

        # Company details from config
        company_info = f"""
        {BrandConfig.COMPANY_ADDRESS}<br/>
        {BrandConfig.COMPANY_CITY_STATE_ZIP}<br/>
        Phone: {BrandConfig.COMPANY_PHONE}<br/>
        Email: {BrandConfig.COMPANY_EMAIL}
        """
        elements.append(Paragraph(company_info, self.styles["Normal"]))

        return elements
```

## 3. Data Locking

Invoices are immutable. Changes to orders create new invoice versions.

### Invoice Metadata Model

```python
# ✅ CORRECT: Invoice metadata tracking
# backend/src/models/invoice.py
from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime
from typing import Optional

class Invoice(SQLModel, table=True):
    """Invoice metadata - tracks generated PDF invoices."""
    id: Optional[int] = Field(default=None, primary_key=True)

    # Invoice identification
    invoice_number: str = Field(unique=True, index=True)  # "INV-2024-001"
    version: int = Field(default=1)  # Invoice version (1, 2, 3, ...)

    # Order reference (immutable snapshot)
    order_id: int = Field(foreign_key="order.id", index=True)
    order: "Order" = Relationship(back_populates="invoices")

    # PDF storage
    file_path: str  # Path to stored PDF file
    file_size: int  # Size in bytes

    # Snapshot data (for quick access without PDF parsing)
    customer_name: str
    order_total: Decimal = Field(max_digits=10, decimal_places=2)
    order_subtotal: Decimal = Field(max_digits=10, decimal_places=2)
    order_tax: Decimal = Field(max_digits=10, decimal_places=2)

    # Audit trail
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    generated_by: int = Field(foreign_key="user.id")  # User who generated
    is_superseded: bool = Field(default=False)  # True if newer version exists

    # Relationships
    user: "User" = Relationship()

class Order(SQLModel, table=True):
    # ... existing fields ...

    # Relationship to invoices
    invoices: list["Invoice"] = Relationship(back_populates="order")

    @property
    def latest_invoice(self) -> Optional["Invoice"]:
        """Get the most recent (non-superseded) invoice."""
        active_invoices = [inv for inv in self.invoices if not inv.is_superseded]
        if not active_invoices:
            return None
        return max(active_invoices, key=lambda inv: inv.version)
```

### Invoice Generation Endpoint

```python
# ✅ CORRECT: Invoice generation with immutability
# backend/src/api/routes/invoices.py
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from src.services.invoice_service import InvoiceService
from src.services.storage_service import StorageService

router = APIRouter(prefix="/invoices", tags=["invoices"])

@router.post("/orders/{order_id}/generate")
async def generate_invoice(
    order_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
    invoice_service: InvoiceService = Depends(get_invoice_service),
    storage_service: StorageService = Depends(get_storage_service),
):
    """
    Generate PDF invoice for a confirmed order.

    Rules:
    - Order must be confirmed (not draft)
    - Creates new version if invoice already exists
    - Previous versions remain accessible
    """
    # 1. Fetch order with line items
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # 2. Verify order is confirmed (not draft)
    if order.status == "draft":
        raise HTTPException(
            status_code=400,
            detail="Cannot generate invoice for draft order"
        )

    # 3. Check for existing invoices
    existing_invoices = session.exec(
        select(Invoice).where(Invoice.order_id == order_id)
    ).all()

    # Determine version number
    if existing_invoices:
        # Mark previous invoices as superseded
        for inv in existing_invoices:
            inv.is_superseded = True
            session.add(inv)

        # Increment version
        version = max(inv.version for inv in existing_invoices) + 1
    else:
        version = 1

    # 4. Generate invoice number (unique)
    invoice_number = generate_invoice_number(order.id, version)

    # 5. Generate PDF
    pdf_bytes = invoice_service.generate_invoice_pdf(
        order=order,
        invoice_number=invoice_number,
        version=version,
    )

    # 6. Store PDF file
    file_path = storage_service.store_invoice(
        invoice_number=invoice_number,
        pdf_bytes=pdf_bytes,
    )

    # 7. Create invoice metadata record
    invoice = Invoice(
        invoice_number=invoice_number,
        version=version,
        order_id=order.id,
        file_path=file_path,
        file_size=len(pdf_bytes),
        customer_name=order.customer.name,
        order_total=order.total,
        order_subtotal=order.subtotal,
        order_tax=order.tax,
        generated_by=current_user.id,
        is_superseded=False,
    )

    session.add(invoice)
    session.commit()
    session.refresh(invoice)

    return {
        "invoice_id": invoice.id,
        "invoice_number": invoice_number,
        "version": version,
        "file_path": file_path,
        "download_url": f"/api/invoices/{invoice.id}/download",
    }

def generate_invoice_number(order_id: int, version: int) -> str:
    """
    Generate unique invoice number.

    Format: INV-{YEAR}-{ORDER_ID}-V{VERSION}
    Example: INV-2024-00042-V1
    """
    year = datetime.now().year
    return f"INV-{year}-{order_id:05d}-V{version}"
```

### Immutability Enforcement

```python
# ✅ CORRECT: Prevent invoice modification
# backend/src/models/invoice.py

class Invoice(SQLModel, table=True):
    # ... fields ...

    def __setattr__(self, name, value):
        """Prevent modification after creation (except is_superseded flag)."""
        if hasattr(self, "id") and self.id is not None:
            # Invoice already exists in database
            if name not in ["is_superseded", "_sa_instance_state"]:
                raise ValueError(
                    f"Cannot modify invoice after generation. "
                    f"Create a new version instead."
                )
        super().__setattr__(name, value)
```

**Key Immutability Rules:**
1. **Never Update**: Invoices NEVER have their fields updated (except `is_superseded`)
2. **Version Control**: Order changes → new invoice version, increment version number
3. **Supersede Flag**: Old invoices marked `is_superseded=True` (soft archive)
4. **Audit Trail**: Track who generated each invoice and when
5. **Complete Snapshots**: Invoice metadata includes snapshot of key order data

## 4. File Storage Strategy

Where and how to store PDF files.

### Storage Options Comparison

| Option | Pros | Cons | Best For |
|--------|------|------|----------|
| **Local Filesystem** | Simple, no external deps | Not scalable, backup complexity | Development |
| **AWS S3** | Scalable, reliable, CDN | Cost, vendor lock-in | Production (AWS) |
| **Cloudflare R2** | S3-compatible, cheaper | Newer service | Production (Cloudflare) |
| **Azure Blob** | Enterprise-grade | Azure ecosystem | Production (Azure) |

### File Storage Service

```python
# ✅ CORRECT: Abstract storage service
# backend/src/services/storage_service.py
from abc import ABC, abstractmethod
from typing import Optional
import os
from pathlib import Path

class StorageService(ABC):
    """Abstract base for file storage."""

    @abstractmethod
    def store_invoice(self, invoice_number: str, pdf_bytes: bytes) -> str:
        """
        Store invoice PDF and return file path/key.

        Returns:
            Storage path (filesystem path or S3 key)
        """
        pass

    @abstractmethod
    def retrieve_invoice(self, file_path: str) -> bytes:
        """Retrieve invoice PDF bytes."""
        pass

    @abstractmethod
    def delete_invoice(self, file_path: str) -> bool:
        """Delete invoice PDF (rarely used)."""
        pass


# Local filesystem implementation
class LocalStorageService(StorageService):
    """Store invoices on local filesystem."""

    def __init__(self, base_path: str = "data/invoices"):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)

    def store_invoice(self, invoice_number: str, pdf_bytes: bytes) -> str:
        """Store invoice in local filesystem."""
        # Organize by year/month
        year = datetime.now().year
        month = datetime.now().strftime("%m")
        dir_path = self.base_path / str(year) / month
        dir_path.mkdir(parents=True, exist_ok=True)

        # Filename: invoice_number.pdf
        file_path = dir_path / f"{invoice_number}.pdf"

        # Write PDF
        file_path.write_bytes(pdf_bytes)

        # Return relative path
        return str(file_path.relative_to(self.base_path))

    def retrieve_invoice(self, file_path: str) -> bytes:
        """Retrieve invoice from filesystem."""
        full_path = self.base_path / file_path
        if not full_path.exists():
            raise FileNotFoundError(f"Invoice not found: {file_path}")
        return full_path.read_bytes()

    def delete_invoice(self, file_path: str) -> bool:
        """Delete invoice file (use with caution)."""
        full_path = self.base_path / file_path
        if full_path.exists():
            full_path.unlink()
            return True
        return False


# S3/R2 implementation
class S3StorageService(StorageService):
    """Store invoices in S3 or S3-compatible storage (Cloudflare R2)."""

    def __init__(
        self,
        bucket_name: str,
        region: str,
        access_key: str,
        secret_key: str,
        endpoint_url: Optional[str] = None,  # For R2/MinIO
    ):
        import boto3

        self.bucket_name = bucket_name
        self.s3_client = boto3.client(
            "s3",
            region_name=region,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            endpoint_url=endpoint_url,  # Use for Cloudflare R2
        )

    def store_invoice(self, invoice_number: str, pdf_bytes: bytes) -> str:
        """Store invoice in S3."""
        # S3 key structure: invoices/{year}/{month}/{invoice_number}.pdf
        year = datetime.now().year
        month = datetime.now().strftime("%m")
        s3_key = f"invoices/{year}/{month}/{invoice_number}.pdf"

        # Upload to S3
        self.s3_client.put_object(
            Bucket=self.bucket_name,
            Key=s3_key,
            Body=pdf_bytes,
            ContentType="application/pdf",
            # Optional: Server-side encryption
            ServerSideEncryption="AES256",
        )

        return s3_key

    def retrieve_invoice(self, file_path: str) -> bytes:
        """Retrieve invoice from S3."""
        response = self.s3_client.get_object(
            Bucket=self.bucket_name,
            Key=file_path,
        )
        return response["Body"].read()

    def delete_invoice(self, file_path: str) -> bool:
        """Delete invoice from S3 (use with caution)."""
        self.s3_client.delete_object(
            Bucket=self.bucket_name,
            Key=file_path,
        )
        return True

    def get_presigned_url(self, file_path: str, expires_in: int = 3600) -> str:
        """Generate temporary download URL."""
        return self.s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket_name, "Key": file_path},
            ExpiresIn=expires_in,  # URL valid for 1 hour
        )
```

### Storage Configuration

```python
# ✅ CORRECT: Environment-based storage configuration
# backend/src/config.py
from pydantic_settings import BaseSettings
from typing import Literal

class Settings(BaseSettings):
    # Storage backend selection
    STORAGE_BACKEND: Literal["local", "s3", "r2"] = "local"

    # Local storage
    LOCAL_STORAGE_PATH: str = "data/invoices"

    # S3/R2 storage
    S3_BUCKET_NAME: str = ""
    S3_REGION: str = "us-east-1"
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_ENDPOINT_URL: Optional[str] = None  # For R2: https://[account-id].r2.cloudflarestorage.com

settings = Settings()

def get_storage_service() -> StorageService:
    """Factory function for storage service."""
    if settings.STORAGE_BACKEND == "local":
        return LocalStorageService(settings.LOCAL_STORAGE_PATH)
    elif settings.STORAGE_BACKEND in ["s3", "r2"]:
        return S3StorageService(
            bucket_name=settings.S3_BUCKET_NAME,
            region=settings.S3_REGION,
            access_key=settings.S3_ACCESS_KEY,
            secret_key=settings.S3_SECRET_KEY,
            endpoint_url=settings.S3_ENDPOINT_URL,
        )
    else:
        raise ValueError(f"Unknown storage backend: {settings.STORAGE_BACKEND}")
```

### File Naming Convention

```python
# ✅ CORRECT: Consistent file naming and organization
"""
Storage Structure:

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

Naming Convention:
- Format: INV-{YEAR}-{ORDER_ID}-V{VERSION}.pdf
- Year: 4-digit year
- Order ID: 5-digit zero-padded order ID
- Version: Sequential version number (1, 2, 3, ...)

Examples:
- INV-2024-00001-V1.pdf (Order 1, Version 1)
- INV-2024-00001-V2.pdf (Order 1, Version 2 - revised)
- INV-2024-00042-V1.pdf (Order 42, Version 1)
"""
```

### Download Endpoint

```python
# ✅ CORRECT: Invoice download endpoint
# backend/src/api/routes/invoices.py
from fastapi.responses import StreamingResponse
from io import BytesIO

@router.get("/{invoice_id}/download")
async def download_invoice(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
    storage_service: StorageService = Depends(get_storage_service),
):
    """
    Download invoice PDF.

    Returns PDF file with proper Content-Disposition header.
    """
    # Fetch invoice metadata
    invoice = session.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Optional: Check user authorization
    # (e.g., user must own the order or be admin)

    # Retrieve PDF from storage
    try:
        pdf_bytes = storage_service.retrieve_invoice(invoice.file_path)
    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail="Invoice file not found in storage"
        )

    # Return PDF as streaming response
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{invoice.invoice_number}.pdf"'
        },
    )

@router.get("/{invoice_id}/view")
async def view_invoice(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
    storage_service: StorageService = Depends(get_storage_service),
):
    """
    View invoice PDF inline (browser preview).

    Same as download but with inline Content-Disposition.
    """
    invoice = session.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    pdf_bytes = storage_service.retrieve_invoice(invoice.file_path)

    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{invoice.invoice_number}.pdf"'
        },
    )
```

## Best Practices Checklist

- [ ] **Complete Layout**: Header, customer info, line items, totals, footer
- [ ] **Brand Consistency**: Use centralized brand configuration
- [ ] **Logo Inclusion**: Display company logo (if available)
- [ ] **Professional Styling**: Clean tables, proper spacing, readable fonts
- [ ] **Required Fields**: Invoice number, date, version, customer, items, totals
- [ ] **Immutable Records**: Never update invoice records (except supersede flag)
- [ ] **Version Control**: Order changes create new invoice versions
- [ ] **Supersede Tracking**: Mark old versions as superseded
- [ ] **Audit Trail**: Track generation time, user, version number
- [ ] **Complete Snapshots**: Store key order data in invoice metadata
- [ ] **Storage Abstraction**: Use abstract storage service interface
- [ ] **Environment-Based**: Configure storage backend via environment variables
- [ ] **Organized Structure**: Year/month folder hierarchy
- [ ] **Consistent Naming**: INV-{YEAR}-{ORDER_ID}-V{VERSION}.pdf format
- [ ] **Download Endpoint**: Provide PDF download with proper headers
- [ ] **Inline View**: Support browser preview with inline disposition

## Common Pitfalls

### Pitfall 1: Modifying Existing Invoices

```python
# ❌ WRONG: Update existing invoice
invoice.order_total = new_total  # WRONG: Invoices are immutable

# ✅ CORRECT: Create new version
generate_invoice(order_id, version=invoice.version + 1)
```

**Why**: Invoices are legal documents. Modification destroys audit trail.

### Pitfall 2: Missing Version Control

```python
# ❌ WRONG: Delete old invoice when generating new
delete_invoice(old_invoice_id)  # WRONG: Destroys history

# ✅ CORRECT: Mark as superseded, keep both
old_invoice.is_superseded = True
create_new_invoice(version=old_invoice.version + 1)
```

**Why**: Need to track what customer saw at each point in time.

### Pitfall 3: Using Current Prices

```python
# ❌ WRONG: Fetch current prices from Sanity
for item in order.items:
    current_item = fetch_from_sanity(item.item_id)
    pdf.add_line(current_item.name, current_item.price)  # WRONG

# ✅ CORRECT: Use price snapshots from order
for item in order.line_items:
    pdf.add_line(item.item_name, item.price_at_order)  # Snapshot
```

**Why**: Invoice must reflect prices at order time, not current prices.

### Pitfall 4: Storing PDFs in Database

```python
# ❌ WRONG: Store PDF bytes in database
invoice.pdf_data = pdf_bytes  # WRONG: Bloats database

# ✅ CORRECT: Store in filesystem/S3, reference in database
file_path = storage_service.store_invoice(invoice_number, pdf_bytes)
invoice.file_path = file_path  # Store path only
```

**Why**: PDFs are large binary files. Databases are for structured data, not files.

### Pitfall 5: Hardcoded Branding

```python
# ❌ WRONG: Hardcoded company info in PDF generation
pdf.add_text("KN KITCHEN")  # WRONG: Not configurable
pdf.add_text("123 Main St")  # WRONG: Hard to update

# ✅ CORRECT: Use centralized brand config
pdf.add_text(BrandConfig.COMPANY_NAME)
pdf.add_text(BrandConfig.COMPANY_ADDRESS)
```

**Why**: Brand changes (address, phone, logo) should update all invoices from one place.

## Reference Documents

- Constitution: `.specify/memory/constitution.md` (Principle V: Billing Immutability)
- Order Calculation Logic: `.claude/skills/order-calculation-logic.md` (Decimal precision, backend calculations)
- FastAPI Backend: `.claude/skills/fastapi-backend.md` (API patterns, dependency injection)
- SQLModel ORM: `.claude/skills/sqlmodel-orm.md` (Database models, relationships)

---

**Remember**: Invoices are legal documents representing financial agreements. Once generated, they NEVER change. Order modifications create new invoice versions, preserving the complete audit trail.
