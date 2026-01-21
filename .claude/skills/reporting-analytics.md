---
name: Reporting & Analytics
description: Patterns for generating reports, calculating metrics, and querying data efficiently with proper filtering and pagination
scope: mandatory
applies_to: backend, frontend
---

# Reporting & Analytics

**Status**: MANDATORY - All reporting features MUST follow these patterns

**File Location Rule (permanent):** This file belongs in `.claude/skills/` and defines reporting patterns for KN KITCHEN.

## Role: Reporting & Analytics

This skill defines how to build analytics features, generate reports, calculate metrics, and query data efficiently while maintaining performance.

### Main Responsibilities

1. **Monthly/Period Summaries**: Generate revenue, order volume, and customer activity summaries
2. **Revenue Calculations**: Calculate totals, averages, growth rates with Decimal precision
3. **Filtering & Querying**: Support date ranges, user filters, product filters, status filters
4. **Performance Optimization**: Use indexes, pagination, caching for large datasets
5. **Data Export**: Generate CSV/Excel exports for reports
6. **Visualization Data**: Prepare data for charts and graphs

### Strictly DOES NOT

- ❌ Use raw SQL without parameterization (SQL injection risk)
- ❌ Load entire tables into memory without pagination
- ❌ Calculate money with float types (use Decimal)
- ❌ Query without indexes on filtered columns
- ❌ Include draft orders in financial reports
- ❌ Expose customer PII in aggregate reports
- ❌ Generate reports synchronously for large date ranges

## Core Principles

1. **Performance First**: Reports must execute in < 5 seconds for typical queries
2. **Confirmed Orders Only**: Financial reports include only confirmed (non-draft) orders
3. **Decimal Precision**: All money calculations use Decimal type
4. **Indexed Queries**: Filter columns MUST have database indexes
5. **Paginated Results**: Large result sets MUST be paginated
6. **Audit Trail**: Log report generation for compliance

## 1. Monthly Summaries

Generate summary reports for specific time periods.

### Revenue Summary Report

```python
# ✅ CORRECT: Monthly revenue summary
# backend/src/services/reporting_service.py
from sqlmodel import Session, select, func
from datetime import datetime, date
from decimal import Decimal
from typing import Optional

class ReportingService:
    def __init__(self, session: Session):
        self.session = session

    def get_monthly_revenue_summary(
        self,
        year: int,
        month: int,
    ) -> dict:
        """
        Generate monthly revenue summary.

        Returns:
            - total_revenue: Sum of all confirmed order totals
            - order_count: Number of confirmed orders
            - average_order_value: Average order total
            - tax_collected: Total tax collected
        """
        # Date range for month
        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1)
        else:
            end_date = date(year, month + 1, 1)

        # Query confirmed orders in date range
        statement = (
            select(
                func.sum(Order.total).label("total_revenue"),
                func.count(Order.id).label("order_count"),
                func.avg(Order.total).label("average_order_value"),
                func.sum(Order.tax).label("tax_collected"),
            )
            .where(
                Order.confirmed_at >= start_date,
                Order.confirmed_at < end_date,
                Order.status != "cancelled",  # Exclude cancelled
            )
        )

        result = self.session.exec(statement).first()

        return {
            "year": year,
            "month": month,
            "total_revenue": result.total_revenue or Decimal("0.00"),
            "order_count": result.order_count or 0,
            "average_order_value": result.average_order_value or Decimal("0.00"),
            "tax_collected": result.tax_collected or Decimal("0.00"),
        }

    def get_year_over_year_growth(
        self,
        year: int,
        month: int,
    ) -> dict:
        """Calculate YoY growth rate."""
        current_month = self.get_monthly_revenue_summary(year, month)
        previous_year = self.get_monthly_revenue_summary(year - 1, month)

        current_revenue = current_month["total_revenue"]
        previous_revenue = previous_year["total_revenue"]

        if previous_revenue == 0:
            growth_rate = Decimal("0.00")
        else:
            growth_rate = (
                (current_revenue - previous_revenue) / previous_revenue * 100
            )

        return {
            "current_year": year,
            "current_month": month,
            "current_revenue": current_revenue,
            "previous_revenue": previous_revenue,
            "growth_rate": growth_rate.quantize(Decimal("0.01")),
            "growth_direction": "up" if growth_rate > 0 else "down" if growth_rate < 0 else "flat",
        }
```

### Order Volume Report

```python
# ✅ CORRECT: Order volume by status
def get_order_volume_report(
    self,
    start_date: date,
    end_date: date,
) -> dict:
    """
    Count orders by status within date range.

    Returns:
        {
            "pending": 10,
            "in_progress": 5,
            "completed": 50,
            "cancelled": 2,
            "total": 67
        }
    """
    statement = (
        select(
            Order.status,
            func.count(Order.id).label("count"),
        )
        .where(
            Order.confirmed_at >= start_date,
            Order.confirmed_at < end_date,
        )
        .group_by(Order.status)
    )

    results = self.session.exec(statement).all()

    # Convert to dict
    volume_by_status = {row.status: row.count for row in results}

    # Add total
    volume_by_status["total"] = sum(volume_by_status.values())

    return volume_by_status
```

## 2. Revenue Calculations

Calculate revenue metrics with Decimal precision.

### Revenue by Customer

```python
# ✅ CORRECT: Top customers by revenue
def get_top_customers_by_revenue(
    self,
    start_date: date,
    end_date: date,
    limit: int = 10,
) -> list:
    """
    Get customers with highest total order value.

    Returns list of:
        {
            "customer_id": 1,
            "customer_name": "ABC Catering",
            "total_revenue": Decimal("5000.00"),
            "order_count": 10,
            "average_order_value": Decimal("500.00")
        }
    """
    statement = (
        select(
            Customer.id.label("customer_id"),
            Customer.name.label("customer_name"),
            func.sum(Order.total).label("total_revenue"),
            func.count(Order.id).label("order_count"),
            func.avg(Order.total).label("average_order_value"),
        )
        .join(Order, Order.customer_id == Customer.id)
        .where(
            Order.confirmed_at >= start_date,
            Order.confirmed_at < end_date,
            Order.status != "cancelled",
        )
        .group_by(Customer.id, Customer.name)
        .order_by(func.sum(Order.total).desc())
        .limit(limit)
    )

    results = self.session.exec(statement).all()

    return [
        {
            "customer_id": row.customer_id,
            "customer_name": row.customer_name,
            "total_revenue": row.total_revenue,
            "order_count": row.order_count,
            "average_order_value": row.average_order_value,
        }
        for row in results
    ]
```

### Revenue by Menu Item

```python
# ✅ CORRECT: Most profitable menu items
def get_revenue_by_menu_item(
    self,
    start_date: date,
    end_date: date,
    limit: int = 20,
) -> list:
    """
    Calculate revenue per menu item.

    Uses price_at_order from line items (snapshot pricing).
    """
    statement = (
        select(
            OrderLineItem.item_id,
            OrderLineItem.item_name,
            func.sum(OrderLineItem.quantity).label("total_quantity"),
            func.sum(OrderLineItem.subtotal).label("total_revenue"),
        )
        .join(Order, OrderLineItem.order_id == Order.id)
        .where(
            Order.confirmed_at >= start_date,
            Order.confirmed_at < end_date,
            Order.status != "cancelled",
        )
        .group_by(OrderLineItem.item_id, OrderLineItem.item_name)
        .order_by(func.sum(OrderLineItem.subtotal).desc())
        .limit(limit)
    )

    results = self.session.exec(statement).all()

    return [
        {
            "item_id": row.item_id,
            "item_name": row.item_name,
            "total_quantity": row.total_quantity,
            "total_revenue": row.total_revenue,
        }
        for row in results
    ]
```

## 3. Filters (Date Range, User, Product)

Support comprehensive filtering on reports.

### Flexible Report Filters

```python
# ✅ CORRECT: Flexible filtering with optional parameters
from typing import Optional, List

class ReportFilters:
    """Data class for report filters."""
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    customer_ids: Optional[List[int]] = None
    item_ids: Optional[List[str]] = None
    statuses: Optional[List[str]] = None
    min_amount: Optional[Decimal] = None
    max_amount: Optional[Decimal] = None

def get_orders_report(
    self,
    filters: ReportFilters,
    page: int = 1,
    page_size: int = 50,
) -> dict:
    """
    Get filtered orders report with pagination.

    Supports multiple filter combinations.
    """
    # Start with base query
    statement = select(Order).where(Order.status != "draft")

    # Apply date range filter
    if filters.start_date:
        statement = statement.where(Order.confirmed_at >= filters.start_date)
    if filters.end_date:
        statement = statement.where(Order.confirmed_at < filters.end_date)

    # Apply customer filter
    if filters.customer_ids:
        statement = statement.where(Order.customer_id.in_(filters.customer_ids))

    # Apply status filter
    if filters.statuses:
        statement = statement.where(Order.status.in_(filters.statuses))

    # Apply amount range filter
    if filters.min_amount:
        statement = statement.where(Order.total >= filters.min_amount)
    if filters.max_amount:
        statement = statement.where(Order.total <= filters.max_amount)

    # Count total (before pagination)
    count_statement = select(func.count()).select_from(statement.subquery())
    total_count = self.session.exec(count_statement).one()

    # Apply pagination
    offset = (page - 1) * page_size
    statement = statement.offset(offset).limit(page_size)

    # Execute query
    orders = self.session.exec(statement).all()

    return {
        "orders": orders,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total_count": total_count,
            "total_pages": (total_count + page_size - 1) // page_size,
        },
    }
```

### FastAPI Endpoint with Filters

```python
# ✅ CORRECT: API endpoint with query parameters
# backend/src/api/routes/reports.py
from fastapi import APIRouter, Depends, Query
from typing import Optional, List

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/orders")
async def get_orders_report(
    start_date: Optional[date] = Query(None, description="Start date (inclusive)"),
    end_date: Optional[date] = Query(None, description="End date (exclusive)"),
    customer_ids: Optional[List[int]] = Query(None, description="Filter by customer IDs"),
    statuses: Optional[List[str]] = Query(None, description="Filter by order status"),
    min_amount: Optional[Decimal] = Query(None, description="Minimum order amount"),
    max_amount: Optional[Decimal] = Query(None, description="Maximum order amount"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    reporting_service: ReportingService = Depends(get_reporting_service),
):
    """
    Get filtered orders report.

    Supports multiple filters and pagination.
    """
    filters = ReportFilters(
        start_date=start_date,
        end_date=end_date,
        customer_ids=customer_ids,
        statuses=statuses,
        min_amount=min_amount,
        max_amount=max_amount,
    )

    return reporting_service.get_orders_report(filters, page, page_size)
```

## 4. Performance-Safe Queries

Optimize queries for large datasets.

### Required Database Indexes

```python
# ✅ CORRECT: Index commonly filtered columns
# backend/src/models/order.py
from sqlmodel import Field, Index

class Order(SQLModel, table=True):
    __table_args__ = (
        # Composite index for date range queries
        Index("idx_order_confirmed_at_status", "confirmed_at", "status"),

        # Index for customer filtering
        Index("idx_order_customer_id", "customer_id"),

        # Index for amount range queries
        Index("idx_order_total", "total"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    customer_id: int = Field(foreign_key="customer.id", index=True)
    confirmed_at: Optional[datetime] = Field(index=True)
    status: str = Field(index=True)
    total: Decimal = Field(max_digits=10, decimal_places=2, index=True)
    # ... other fields ...
```

### Pagination Pattern

```python
# ✅ CORRECT: Cursor-based pagination for large datasets
def get_orders_paginated_cursor(
    self,
    cursor_id: Optional[int] = None,
    page_size: int = 50,
) -> dict:
    """
    Cursor-based pagination (more efficient than offset).

    Returns next cursor for fetching next page.
    """
    statement = select(Order).where(Order.status != "draft")

    # Apply cursor (fetch records after cursor)
    if cursor_id:
        statement = statement.where(Order.id > cursor_id)

    # Order by ID (required for cursor)
    statement = statement.order_by(Order.id).limit(page_size + 1)

    # Execute query
    orders = self.session.exec(statement).all()

    # Check if there are more results
    has_next_page = len(orders) > page_size
    if has_next_page:
        orders = orders[:page_size]

    # Next cursor is last order ID
    next_cursor = orders[-1].id if orders and has_next_page else None

    return {
        "orders": orders,
        "pagination": {
            "page_size": page_size,
            "next_cursor": next_cursor,
            "has_next_page": has_next_page,
        },
    }
```

### Query Optimization Tips

```python
# ✅ CORRECT: Eager loading to prevent N+1 queries
from sqlmodel import select
from sqlalchemy.orm import selectinload

def get_orders_with_details(self, filters: ReportFilters):
    """Load orders with line items and customer (avoid N+1)."""
    statement = (
        select(Order)
        .options(
            selectinload(Order.line_items),  # Eager load line items
            selectinload(Order.customer),     # Eager load customer
        )
        .where(Order.status != "draft")
    )

    # Apply filters...

    return self.session.exec(statement).all()

# ❌ WRONG: N+1 query problem
def get_orders_wrong(self):
    orders = self.session.exec(select(Order)).all()

    # This triggers N queries (one per order)
    for order in orders:
        print(order.customer.name)  # N+1 query
        print(len(order.line_items))  # Another N+1
```

### Caching Strategy

```python
# ✅ CORRECT: Cache frequently accessed reports
from functools import lru_cache
from datetime import datetime, timedelta

class ReportingService:
    def __init__(self, session: Session):
        self.session = session
        self._cache = {}
        self._cache_ttl = timedelta(minutes=15)

    def get_dashboard_summary(self) -> dict:
        """Get dashboard summary with 15-minute cache."""
        cache_key = "dashboard_summary"
        now = datetime.utcnow()

        # Check cache
        if cache_key in self._cache:
            cached_data, cached_at = self._cache[cache_key]
            if now - cached_at < self._cache_ttl:
                return cached_data

        # Compute summary
        summary = self._compute_dashboard_summary()

        # Store in cache
        self._cache[cache_key] = (summary, now)

        return summary

    def _compute_dashboard_summary(self) -> dict:
        """Heavy computation - results are cached."""
        # ... complex aggregations ...
        pass
```

## 5. Data Export

Generate CSV/Excel exports for reports.

### CSV Export

```python
# ✅ CORRECT: CSV export with streaming
# backend/src/api/routes/reports.py
from fastapi.responses import StreamingResponse
import csv
from io import StringIO

@router.get("/orders/export/csv")
async def export_orders_csv(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    reporting_service: ReportingService = Depends(get_reporting_service),
):
    """
    Export filtered orders as CSV.

    Streams response to handle large datasets.
    """
    # Get filtered orders (no pagination limit for export)
    filters = ReportFilters(start_date=start_date, end_date=end_date)
    orders = reporting_service.get_orders_for_export(filters)

    # Generate CSV
    output = StringIO()
    writer = csv.writer(output)

    # Header row
    writer.writerow([
        "Order ID",
        "Customer",
        "Order Date",
        "Delivery Date",
        "Status",
        "Subtotal",
        "Tax",
        "Total",
    ])

    # Data rows
    for order in orders:
        writer.writerow([
            order.id,
            order.customer.name,
            order.confirmed_at.strftime("%Y-%m-%d"),
            order.delivery_date.strftime("%Y-%m-%d"),
            order.status,
            f"{order.subtotal:.2f}",
            f"{order.tax:.2f}",
            f"{order.total:.2f}",
        ])

    # Return as downloadable CSV
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="orders_{datetime.now().strftime("%Y%m%d")}.csv"'
        },
    )
```

## 6. Frontend Report Display

Display reports with filtering UI.

### Report Page with Filters

```typescript
// ✅ CORRECT: Report page with date range and filters
// app/reports/orders/page.tsx
"use client";

import { useState } from "react";

export default function OrdersReportPage() {
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    status: "",
  });
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerateReport = async () => {
    setLoading(true);

    const params = new URLSearchParams();
    if (filters.startDate) params.append("start_date", filters.startDate);
    if (filters.endDate) params.append("end_date", filters.endDate);
    if (filters.status) params.append("statuses", filters.status);

    const response = await fetch(`/api/reports/orders?${params}`);
    const data = await response.json();

    setReportData(data);
    setLoading(false);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Orders Report</h1>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) =>
                setFilters({ ...filters, startDate: e.target.value })
              }
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) =>
                setFilters({ ...filters, endDate: e.target.value })
              }
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
              className="w-full border rounded px-3 py-2"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={handleGenerateReport}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate Report"}
          </button>

          <a
            href={`/api/reports/orders/export/csv?start_date=${filters.startDate}&end_date=${filters.endDate}`}
            className="border border-gray-300 px-4 py-2 rounded hover:bg-gray-50"
          >
            Export CSV
          </a>
        </div>
      </div>

      {/* Results */}
      {reportData && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Results</h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Order ID</th>
                  <th className="text-left py-2">Customer</th>
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {reportData.orders.map((order) => (
                  <tr key={order.id} className="border-b">
                    <td className="py-2">#{order.id}</td>
                    <td className="py-2">{order.customer.name}</td>
                    <td className="py-2">
                      {new Date(order.confirmed_at).toLocaleDateString()}
                    </td>
                    <td className="py-2">
                      <span
                        className={`px-2 py-1 rounded text-sm ${
                          order.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      ${order.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Showing {reportData.orders.length} of{" "}
              {reportData.pagination.total_count} orders
            </p>
            <div className="flex gap-2">
              {/* Pagination buttons */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

## Best Practices Checklist

- [ ] **Confirmed Orders Only**: Financial reports exclude drafts
- [ ] **Decimal Precision**: All money calculations use Decimal
- [ ] **Indexed Queries**: Filtered columns have database indexes
- [ ] **Paginated Results**: Large datasets use pagination
- [ ] **Date Range Validation**: Validate start < end date
- [ ] **Performance Target**: Queries execute in < 5 seconds
- [ ] **Aggregate Functions**: Use SQL aggregates (SUM, AVG, COUNT)
- [ ] **Eager Loading**: Prevent N+1 queries with selectinload
- [ ] **Caching**: Cache expensive reports (15-minute TTL)
- [ ] **CSV Export**: Support data export for analysis
- [ ] **Filter Validation**: Validate filter inputs (dates, amounts)
- [ ] **Audit Logging**: Log report generation for compliance

## Common Pitfalls

### Pitfall 1: Including Draft Orders

```python
# ❌ WRONG: Including drafts in revenue report
statement = select(func.sum(Order.total))  # Includes drafts

# ✅ CORRECT: Exclude drafts
statement = select(func.sum(Order.total)).where(Order.status != "draft")
```

### Pitfall 2: Using Float for Money

```python
# ❌ WRONG: Float calculations lose precision
total = float(order.total)  # 10.00 becomes 9.999999...

# ✅ CORRECT: Use Decimal
total = order.total  # Decimal("10.00") - exact
```

### Pitfall 3: No Pagination

```python
# ❌ WRONG: Load all orders (OOM risk)
orders = session.exec(select(Order)).all()  # Could be millions

# ✅ CORRECT: Paginate
orders = session.exec(select(Order).limit(50).offset(0)).all()
```

## Reference Documents

- Constitution: `.specify/memory/constitution.md` (Draft vs Confirmed orders, reporting requirements)
- Order Calculation Logic: `.claude/skills/order-calculation-logic.md` (Decimal precision)
- SQLModel ORM: `.claude/skills/sqlmodel-orm.md` (Indexes, eager loading)

---

**Golden Rule:** Everything related to reporting and analytics → save in `.claude/skills/reporting-analytics.md`
