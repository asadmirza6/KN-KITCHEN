"""
A4 Quotation PDF Generator
Generates professional A4-sized quotations/estimates using the same design as invoices.
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


class QuotationGenerator:
    """
    Generates professional A4 quotations/estimates.
    Uses the exact same design as invoices but with "QUOTATION" header.
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
        Initialize the quotation generator.

        Args:
            watermark_path: Optional path to watermark image
        """
        self.watermark_path = watermark_path
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Setup custom paragraph styles."""
        # Quotation number style (large, bold, underlined)
        self.styles.add(ParagraphStyle(
            name='QuotationNumber',
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

    def generate(self, quotation_data):
        """
        Generate A4 quotation PDF.

        Args:
            quotation_data: Dictionary containing quotation information
                - quotation_number: str
                - date: str (DD-MM-YYYY format)
                - customer_name: str
                - customer_address: str
                - customer_phone: str
                - customer_email: str
                - delivery_date: str (optional)
                - items: list of dicts
                - manual_items: list of dicts
                - total_amount: float
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
        elements.extend(self._build_header(quotation_data))

        # 2. CUSTOMER DETAILS SECTION
        elements.extend(self._build_customer_details(quotation_data))

        # 3. ORDER ITEMS SECTION
        elements.extend(self._build_items_section(quotation_data))

        # 4. QUOTATION SUMMARY SECTION
        elements.extend(self._build_quotation_summary(quotation_data))

        # 5. FOOTER SECTION
        elements.extend(self._build_footer())

        # Build PDF with watermark
        doc.build(elements, onFirstPage=self._add_watermark, onLaterPages=self._add_watermark)

        buffer.seek(0)
        return buffer

    def _build_header(self, quotation_data):
        """Build header section: Date (top-right) + QUOTATION (center, bold, black, clean)."""
        elements = []

        # Format date
        date_str = quotation_data['date']

        # Create header table with date on right and quotation centered
        header_data = [
            [
                "",  # Empty left cell
                "QUOTATION",  # Center cell
                f"Date: {date_str}"  # Right cell
            ]
        ]

        header_table = Table(header_data, colWidths=[1.5*inch, 3.0*inch, 2.0*inch])
        header_table.setStyle(TableStyle([
            # Left cell (empty)
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('FONTSIZE', (0, 0), (0, 0), 9),

            # Center cell (QUOTATION) - bold black, no lines
            ('ALIGN', (1, 0), (1, 0), 'CENTER'),
            ('FONTSIZE', (1, 0), (1, 0), 24),
            ('FONTNAME', (1, 0), (1, 0), 'Helvetica-Bold'),
            ('TEXTCOLOR', (1, 0), (1, 0), colors.black),

            # Right cell (Date)
            ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
            ('FONTSIZE', (2, 0), (2, 0), 9),
            ('FONTNAME', (2, 0), (2, 0), 'Helvetica'),
            ('TEXTCOLOR', (2, 0), (2, 0), colors.black),

            # Padding
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('TOPPADDING', (0, 0), (-1, -1), 2),

            # No borders - completely clean
            ('GRID', (0, 0), (-1, -1), 0, colors.white),
            ('LINEABOVE', (0, 0), (-1, 0), 0, colors.white),
            ('LINEBELOW', (0, 0), (-1, 0), 0, colors.white),
            ('LINELEFT', (0, 0), (0, 0), 0, colors.white),
            ('LINERIGHT', (-1, 0), (-1, 0), 0, colors.white),
        ]))

        elements.append(header_table)
        elements.append(Spacer(1, self.HEADER_GAP))

        return elements

    def _build_customer_details(self, quotation_data):
        """Build customer details section with clean list format (no internal grid lines)."""
        elements = []

        # Add 2-line gap
        elements.append(Spacer(1, 0.15*inch))

        # Build customer details data
        customer_data = [
            ['CUSTOMER DETAILS'],
            [f"Name: {quotation_data['customer_name']}"],
            [f"Address: {quotation_data['customer_address']}"],
            [f"Phone: {quotation_data['customer_phone']}"],
            [f"Email: {quotation_data['customer_email']}"],
        ]

        # Add delivery date if provided
        if quotation_data.get('delivery_date'):
            customer_data.append([f"Event Date: {quotation_data['delivery_date']}"])

        # Add valid until if provided
        if quotation_data.get('valid_until'):
            customer_data.append([f"Valid Until: {quotation_data['valid_until']}"])

        # Add notes if provided
        if quotation_data.get('notes'):
            customer_data.append([f"Notes: {quotation_data['notes']}"])

        # Create customer table
        customer_table = Table(customer_data, colWidths=[6.0*inch])
        customer_table.setStyle(TableStyle([
            # Header styling - semi-transparent light gray background
            ('BACKGROUND', (0, 0), (-1, 0), colors.Color(240, 240, 240, alpha=0.5)),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),

            # Content styling
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),

            # Remove internal grid lines - only outer border
            ('LINEABOVE', (0, 0), (-1, 0), 1, colors.HexColor('#CCCCCC')),
            ('LINEBELOW', (0, -1), (-1, -1), 1, colors.HexColor('#CCCCCC')),
            ('LINELEFT', (0, 0), (0, -1), 1, colors.HexColor('#CCCCCC')),
            ('LINERIGHT', (-1, 0), (-1, -1), 1, colors.HexColor('#CCCCCC')),

            # Padding - reduced vertical padding to minimize gap
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))

        elements.append(customer_table)
        elements.append(Spacer(1, self.CUSTOMER_GAP))

        return elements

    def _build_items_section(self, quotation_data):
        """Build quotation items section with centered heading and table."""
        elements = []

        # Add 4-line gap
        elements.append(Spacer(1, 0.3*inch))

        # Add centered heading
        heading = Paragraph("Quotation Items Detail", self.styles['SectionHeading'])
        elements.append(heading)
        elements.append(Spacer(1, self.ITEMS_HEADING_GAP))

        # Build items table
        items_data = [
            ['Item Name', 'Quantity (kg)', 'Rate (Rs/kg)', 'Amount (Rs)']
        ]

        # Add menu items
        for item in quotation_data.get('items', []):
            items_data.append([
                item['item_name'],
                f"{float(item['quantity_kg']):.2f}",
                f"Rs {float(item['price_per_kg']):,.2f}",
                f"Rs {float(item['subtotal']):,.2f}"
            ])

        # Add manual items
        for item in quotation_data.get('manual_items', []):
            items_data.append([
                item['name'],
                f"{float(item['quantity_kg']):.2f}",
                f"Rs {float(item['price_per_kg']):,.2f}",
                f"Rs {float(item['subtotal']):,.2f}"
            ])

        # Create items table
        items_table = Table(items_data, colWidths=[2.5*inch, 1.3*inch, 1.3*inch, 1.4*inch])
        items_table.setStyle(TableStyle([
            # Header styling - semi-transparent red
            ('BACKGROUND', (0, 0), (-1, 0), colors.Color(220, 20, 60, alpha=0.3)),
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

            # Borders - very minimal and light
            ('GRID', (0, 0), (-1, -1), 0.2, colors.HexColor('#F0F0F0')),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),

            # Row backgrounds - highly transparent so watermark shows through
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [
                colors.Color(255, 255, 255, alpha=0.3),
                colors.Color(255, 255, 255, alpha=0.3)
            ]),

            # Valign
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))

        elements.append(items_table)
        elements.append(Spacer(1, self.ITEMS_GAP))

        return elements

    def _build_quotation_summary(self, quotation_data):
        """Build quotation summary section (right-aligned, bold)."""
        elements = []

        # Add 5-6 line gap
        elements.append(Spacer(1, 0.4*inch))

        # Build summary data with discount if present
        summary_data = []

        # Add subtotal if discount exists
        if quotation_data.get('discount') and float(quotation_data['discount']) > 0:
            subtotal = float(quotation_data['total_amount']) + float(quotation_data['discount'])
            summary_data.append(['Subtotal:', f"Rs {subtotal:,.2f}"])
            summary_data.append(['Discount:', f"Rs {float(quotation_data['discount']):,.2f}"])

        # Add total amount
        summary_data.append(['Total Quotation Amount:', f"Rs {float(quotation_data['total_amount']):,.2f}"])

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

            # Line above total - light gray (only above last row)
            ('LINEABOVE', (0, len(summary_data)-1), (-1, len(summary_data)-1), 1, colors.HexColor('#CCCCCC')),

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
            "Thank you for your interest in KN KITCHEN<br/>Please confirm to proceed with this quotation",
            self.styles['ThankYou']
        )
        elements.append(thank_you)

        return elements

    def _add_watermark(self, canvas_obj, doc):
        """Add watermark to PDF page."""
        watermark_path = os.path.join(os.path.dirname(__file__), '../../assets/logo.jpeg')

        if not os.path.exists(watermark_path):
            return

        canvas_obj.saveState()
        canvas_obj.setFillAlpha(0.15)

        # Calculate watermark size - double size and centered
        page_width = A4[0]
        page_height = A4[1]
        watermark_width = page_width * 1.0
        watermark_height = watermark_width * 0.6

        # Center watermark on page
        x = (page_width - watermark_width) / 2
        y = (page_height - watermark_height) / 2

        # Draw watermark
        canvas_obj.drawImage(
            watermark_path,
            x, y,
            width=watermark_width,
            height=watermark_height,
            preserveAspectRatio=True
        )

        canvas_obj.restoreState()


def generate_quotation_pdf(quotation_data, watermark_path=None):
    """
    Convenience function to generate quotation PDF.

    Args:
        quotation_data: Dictionary with quotation information
        watermark_path: Optional path to watermark image

    Returns:
        BytesIO: PDF buffer
    """
    generator = QuotationGenerator(watermark_path=watermark_path)
    return generator.generate(quotation_data)
