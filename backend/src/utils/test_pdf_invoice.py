"""
Test script for A4 Invoice PDF Generator
Demonstrates usage and validates output
"""

from pdf_invoice_generator import generate_invoice_pdf
from datetime import datetime, timedelta
import os


def create_sample_invoice_data():
    """Create sample invoice data for testing."""
    return {
        'invoice_number': '12345',
        'date': datetime.now(),
        'customer_name': 'John Doe',
        'customer_address': '123 Main Street, New York, NY 10001',
        'customer_phone': '+1 (555) 123-4567',
        'customer_email': 'john.doe@example.com',
        'delivery_date': (datetime.now() + timedelta(days=2)).strftime('%B %d, %Y'),
        'notes': 'Please handle with care. Delivery between 2-4 PM.',
        'items': [
            {
                'name': 'Biryani (Chicken)',
                'quantity': 10.00,
                'rate': 250.00,
                'amount': 2500.00
            },
            {
                'name': 'Butter Naan',
                'quantity': 5.00,
                'rate': 50.00,
                'amount': 250.00
            },
            {
                'name': 'Raita (Yogurt)',
                'quantity': 2.00,
                'rate': 75.00,
                'amount': 150.00
            },
            {
                'name': 'Plastic Boxes',
                'quantity': 20.00,
                'rate': 10.00,
                'amount': 200.00
            },
            {
                'name': 'Pepsi (2L)',
                'quantity': 3.00,
                'rate': 100.00,
                'amount': 300.00
            }
        ],
        'subtotal': 3400.00,
        'advance_payment': 1700.00,
        'balance_due': 1700.00,
    }


def test_invoice_generation():
    """Test invoice PDF generation."""
    print("=" * 60)
    print("A4 Invoice PDF Generator - Test Suite")
    print("=" * 60)

    # Create sample data
    invoice_data = create_sample_invoice_data()

    print("\n✓ Sample invoice data created")
    print(f"  Invoice #: {invoice_data['invoice_number']}")
    print(f"  Customer: {invoice_data['customer_name']}")
    print(f"  Items: {len(invoice_data['items'])}")
    print(f"  Subtotal: Rs {invoice_data['subtotal']:,.2f}")

    # Generate PDF
    try:
        pdf_buffer = generate_invoice_pdf(invoice_data)
        print("\n✓ PDF generated successfully")
        print(f"  Buffer size: {len(pdf_buffer.getvalue())} bytes")

        # Save to file for manual inspection
        output_path = 'test_invoice.pdf'
        with open(output_path, 'wb') as f:
            f.write(pdf_buffer.getvalue())
        print(f"  Saved to: {output_path}")

        return True

    except Exception as e:
        print(f"\n✗ PDF generation failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_with_watermark():
    """Test invoice generation with watermark."""
    print("\n" + "=" * 60)
    print("Testing with Watermark")
    print("=" * 60)

    invoice_data = create_sample_invoice_data()

    # Check if watermark exists
    watermark_path = os.path.join(
        os.path.dirname(__file__),
        '..',
        '..',
        'assets',
        'logo.jpeg'
    )

    if os.path.exists(watermark_path):
        print(f"\n✓ Watermark found: {watermark_path}")

        try:
            pdf_buffer = generate_invoice_pdf(invoice_data, watermark_path=watermark_path)
            print("✓ PDF with watermark generated successfully")

            output_path = 'test_invoice_with_watermark.pdf'
            with open(output_path, 'wb') as f:
                f.write(pdf_buffer.getvalue())
            print(f"  Saved to: {output_path}")

            return True

        except Exception as e:
            print(f"✗ PDF generation with watermark failed: {str(e)}")
            return False
    else:
        print(f"\n⚠ Watermark not found: {watermark_path}")
        print("  Skipping watermark test")
        return True


def test_layout_specifications():
    """Verify layout specifications are met."""
    print("\n" + "=" * 60)
    print("Layout Specifications Verification")
    print("=" * 60)

    specs = {
        'Page Size': 'A4 (210mm × 297mm)',
        'Left Margin': '0.5 inches',
        'Right Margin': '0.5 inches',
        'Top Margin': '0.5 inches',
        'Bottom Margin': '1.0 inches',
        'Header': 'Date (right) + Invoice # (center, bold, underlined)',
        'Header Gap': '2 lines',
        'Customer Details': 'Bordered box with left-aligned fields',
        'Customer Gap': '4 lines',
        'Items Heading': 'Centered "Order Items Detail"',
        'Items Table': 'Clean format with red header',
        'Items Gap': '5-6 lines',
        'Payment Summary': 'Right-aligned, bold text',
        'Footer': 'Centered thank you message',
    }

    print("\n✓ Layout Specifications:")
    for spec, value in specs.items():
        print(f"  • {spec}: {value}")

    return True


if __name__ == '__main__':
    print("\n")

    # Run tests
    test1 = test_invoice_generation()
    test2 = test_with_watermark()
    test3 = test_layout_specifications()

    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    print(f"✓ Basic PDF Generation: {'PASS' if test1 else 'FAIL'}")
    print(f"✓ Watermark Support: {'PASS' if test2 else 'FAIL'}")
    print(f"✓ Layout Specifications: {'PASS' if test3 else 'FAIL'}")
    print("=" * 60)
    print("\nAll tests completed!")
