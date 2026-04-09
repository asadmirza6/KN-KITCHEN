"""
A4 Invoice PDF Generator
Generates professional A4-sized invoices with strict layout specifications.
"""

from io import BytesIO
from datetime import datetime
from decimal import Decimal
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer,
    PageTemplate, Frame, PageBreak
)
from reportlab.pdfgen import canvas
import os


class A4InvoiceGenerator:
    """
    Generates professional A4 invoices with strict layout specifications.

    Layout Structure:
    1. Header: Date (top right) + Invoice # (center, bold, underlined)
    2. Customer Details: Bordered box with left-aligned fields
    3. Order Items: Centered heading + clean table format
    4. Payment Summary: Right-aligned bold text
    5. Footer: Centered thank you message
    """

    # A4 Page dimensions
    PAGE_WIDTH = A4[0]  # 210mm = 8.27 inches
    PAGE_HEIGHT = A4[1]  # 297mm = 11.69 inches

    # Margins (in inches)
    LEFT_MARGIN = 0.5 * inch
    RIGHT_MARGIN = 0.5 * inch
    TOP_MARGIN = 0.5 * inch
    BOTTOM_MARGIN = 1.0 * inch

    # Spacing (in inches)
    HEADER_GAP = 0.2 * inch
    CUSTOMER_GAP = 0.3 * inch
    ITEMS_HEADING_GAP = 0.2 * inch
    ITEMS_GAP = 0.4 * inch
    SUMMARY_GAP = 0.5 * inch

    def __init__(self, watermark_path=None):
        """
        Initialize the invoice generator.

        Args:
            watermark_path: Optional path to watermark image
        """
        self.watermark_path = watermark_path
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Setup custom paragraph styles."""
        # Invoice number style (large, bold, underlined)
        self.styles.add(ParagraphStyle(
            name='InvoiceNumber',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.black,
            alignment=1,  # Center
            fontName='Helvetica-Bold',
            underline=True,
            spaceAfter=6,
        ))

        # Section heading style
        self.styles.add(ParagraphStyle(
            name='SectionHeading',
            parent=self.styles['Heading2'],
            fontSize=12,
            textColor=colors.black,
            alignment=1,  # Center
            fontName='Helvetica-Bold',
            spaceAfter=6,
        ))

        # Customer details label style
        self.styles.add(ParagraphStyle(
            name='CustomerLabel',
            parent=self.styles['Normal'],
            fontSize=9,
            textColor=colors.black,
            fontName='Helvetica-Bold',
            spaceAfter=2,
        ))

        # Summary label style (bold)
        self.styles.add(ParagraphStyle(
            name='SummaryLabel',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.black,
            fontName='Helvetica-Bold',
            alignment=2,  # Right
            spaceAfter=3,
        ))

        # Thank you style
        self.styles.add(ParagraphStyle(
            name='ThankYou',
            parent=self.styles['Normal'],
            fontSize=11,
            textColor=colors.grey,
            alignment=1,  # Center
            fontName='Helvetica-Oblique',
            spaceAfter=6,
        ))

    def generate(self, invoice_data):
        """
        Generate A4 invoice PDF.

        Args:
            invoice_data: Dictionary containing invoice information
                - invoice_number: str
                - date: datetime or str
                - customer_name: str
                - customer_address: str
                - customer_phone: str
                - customer_email: str
                - delivery_date: str (optional)
                - items: list of dicts with keys:
                    - name: str
                    - quantity: float
                    - rate: float
                    - amount: float
                - subtotal: float
                - advance_payment: float
                - balance_due: float
                - notes: str (optional)

        Returns:
            BytesIO: PDF buffer
        """
        buffer = BytesIO()

        # Create PDF document
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=self.RIGHT_MARGIN,
            leftMargin=self.LEFT_MARGIN,
            topMargin=self.TOP_MARGIN,
            bottomMargin=self.BOTTOM_MARGIN,
        )

        # Build elements
        elements = []

        # 1. HEADER SECTION
        elements.extend(self._build_header(invoice_data))

        # 2. CUSTOMER DETAILS SECTION
        elements.extend(self._build_customer_details(invoice_data))

        # 3. ORDER ITEMS SECTION
        elements.extend(self._build_items_section(invoice_data))

        # 4. PAYMENT SUMMARY SECTION
        elements.extend(self._build_payment_summary(invoice_data))

        # 5. FOOTER SECTION
        elements.extend(self._build_footer())

        # Build PDF with watermark if provided
        if self.watermark_path and os.path.exists(self.watermark_path):
            doc.build(elements, onFirstPage=self._add_watermark, onLaterPages=self._add_watermark)
        else:
            doc.build(elements)

        buffer.seek(0)
        return buffer

    def _build_header(self, invoice_data):
        """Build header section: Date (right) + Invoice # (center)."""
        elements = []

        # Format date
        if isinstance(invoice_data['date'], str):
            date_str = invoice_data['date']
        else:
            date_str = invoice_data['date'].strftime('%B %d, %Y')

        # Create header table with date and invoice number
        header_data = [
            [
                f"Date: {date_str}",
                f"INVOICE #{invoice_data['invoice_number']}"
            ]
        ]

        header_table = Table(header_data, colWidths=[3.5*inch, 2.5*inch])
        header_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (1, 0), (1, 0), 'CENTER'),
            ('FONTSIZE', (0, 0), (0, 0), 9),
            ('FONTSIZE', (1, 0), (1, 0), 20),
            ('FONTNAME', (0, 0), (0, 0), 'Helvetica'),
            ('FONTNAME', (1, 0), (1, 0), 'Helvetica-Bold'),
            ('TEXTCOLOR', (1, 0), (1, 0), colors.black),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('LINEBELOW', (1, 0), (1, 0), 2, colors.black),  # Underline invoice #
        ]))

        elements.append(header_table)
        elements.append(Spacer(1, self.HEADER_GAP))

        return elements

    def _build_customer_details(self, invoice_data):
        """Build customer details section with bordered box."""
        elements = []

        # Add 2-line gap
        elements.append(Spacer(1, 0.15*inch))

        # Build customer details data
        customer_data = [
            ['CUSTOMER DETAILS'],
            [f"Name: {invoice_data['customer_name']}"],
            [f"Address: {invoice_data['customer_address']}"],
            [f"Phone: {invoice_data['customer_phone']}"],
            [f"Email: {invoice_data['customer_email']}"],
        ]

        # Add delivery date if provided
        if invoice_data.get('delivery_date'):
            customer_data.append([f"Delivery Date: {invoice_data['delivery_date']}"])

        # Add notes if provided
        if invoice_data.get('notes'):
            customer_data.append([f"Notes: {invoice_data['notes']}"])

        # Create customer table
        customer_table = Table(customer_data, colWidths=[6.0*inch])
        customer_table.setStyle(TableStyle([
            # Header styling
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E8E8E8')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),

            # Content styling
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),

            # Borders and padding
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))

        elements.append(customer_table)
        elements.append(Spacer(1, self.CUSTOMER_GAP))

        return elements

    def _build_items_section(self, invoice_data):
        """Build order items section with centered heading and table."""
        elements = []

        # Add 4-line gap
        elements.append(Spacer(1, 0.3*inch))

        # Add centered heading
        heading = Paragraph("Order Items Detail", self.styles['SectionHeading'])
        elements.append(heading)
        elements.append(Spacer(1, self.ITEMS_HEADING_GAP))

        # Build items table
        items_data = [
            ['Item Name', 'Quantity (kg)', 'Rate (Rs/kg)', 'Amount (Rs)']
        ]

        for item in invoice_data['items']:
            items_data.append([
                item['name'],
                f"{float(item['quantity']):.2f}",
                f"Rs {float(item['rate']):,.2f}",
                f"Rs {float(item['amount']):,.2f}"
            ])

        # Create items table
        items_table = Table(items_data, colWidths=[2.5*inch, 1.3*inch, 1.3*inch, 1.4*inch])
        items_table.setStyle(TableStyle([
            # Header styling
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#DC143C')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),

            # Content styling
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),

            # Alignment
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),

            # Borders and padding
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),

            # Alternating row colors
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F5F5F5')]),

            # Valign
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))

        elements.append(items_table)
        elements.append(Spacer(1, self.ITEMS_GAP))

        return elements

    def _build_payment_summary(self, invoice_data):
        """Build payment summary section (right-aligned, bold)."""
        elements = []

        # Add 5-6 line gap
        elements.append(Spacer(1, 0.4*inch))

        # Build summary data with discount if present
        summary_data = [
            ['Subtotal:', f"Rs {float(invoice_data['subtotal']):,.2f}"],
        ]

        # Add discount if present
        if invoice_data.get('discount') and float(invoice_data['discount']) > 0:
            summary_data.append(['Discount:', f"Rs {float(invoice_data['discount']):,.2f}"])

        # Add advance payment and balance
        summary_data.append(['Advance Payment:', f"Rs {float(invoice_data['advance_payment']):,.2f}"])
        summary_data.append(['Balance Due:', f"Rs {float(invoice_data['balance_due']):,.2f}"])

        # Create summary table (right-aligned)
        summary_table = Table(summary_data, colWidths=[2.5*inch, 2.0*inch])
        summary_table.setStyle(TableStyle([
            # All text bold
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),

            # Right alignment
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),

            # Padding
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),

            # Line above Balance Due (last row)
            ('LINEABOVE', (0, len(summary_data)-1), (-1, len(summary_data)-1), 1.5, colors.black),

            # No borders
            ('GRID', (0, 0), (-1, -1), 0, colors.white),
        ]))

        elements.append(summary_table)

        return elements

    def _build_footer(self):
        """Build footer section with centered thank you message."""
        elements = []

        # Add spacer to push footer to bottom
        elements.append(Spacer(1, 0.5*inch))

        # Thank you message
        thank_you = Paragraph(
            "Thank you for choosing KN KITCHEN<br/>Quality Catering Services",
            self.styles['ThankYou']
        )
        elements.append(thank_you)

        return elements

    def _add_watermark(self, canvas_obj, doc):
        """Add watermark to PDF page."""
        if not self.watermark_path or not os.path.exists(self.watermark_path):
            return

        canvas_obj.saveState()
        canvas_obj.setFillAlpha(0.08)

        # Calculate watermark size
        page_width = A4[0]
        page_height = A4[1]
        watermark_width = page_width * 0.6
        watermark_height = watermark_width * 0.5

        # Center watermark
        x = (page_width - watermark_width) / 2
        y = (page_height - watermark_height) / 2

        # Draw watermark
        canvas_obj.drawImage(
            self.watermark_path,
            x, y,
            width=watermark_width,
            height=watermark_height,
            preserveAspectRatio=True
        )

        canvas_obj.restoreState()


def generate_invoice_pdf(invoice_data, watermark_path=None):
    """
    Convenience function to generate invoice PDF.

    Args:
        invoice_data: Dictionary with invoice information
        watermark_path: Optional path to watermark image

    Returns:
        BytesIO: PDF buffer
    """
    generator = A4InvoiceGenerator(watermark_path=watermark_path)
    return generator.generate(invoice_data)
