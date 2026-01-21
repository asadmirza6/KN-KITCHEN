---
name: Next.js App Router
description: Best practices for Next.js App Router including server/client components, layouts, routing, API client abstraction, and performance patterns
scope: mandatory
applies_to: frontend
---

# Next.js App Router

**Status**: MANDATORY - All frontend code MUST follow these Next.js App Router patterns

## Overview

Next.js App Router (introduced in Next.js 13+) is the modern routing system for KN KITCHEN frontend. It uses the `app/` directory and introduces React Server Components by default.

**Key Features:**
- Server Components by default (better performance)
- File-system based routing
- Nested layouts
- Streaming and Suspense
- Server Actions (optional)

**Technology Stack:**
- Next.js 14+ (App Router)
- React 18+ (Server Components)
- TypeScript
- Tailwind CSS

## Core Principles

1. **Server First**: Use Server Components by default, Client Components only when needed
2. **Progressive Enhancement**: Build with JavaScript-optional patterns
3. **Layout Composition**: Use nested layouts for shared UI
4. **Type Safety**: TypeScript for all components and data fetching
5. **Performance**: Leverage streaming, caching, and code splitting

## 1. Server vs Client Components

React Server Components run on the server, Client Components run in the browser. Choose wisely.

### Server Components (Default)

**When to Use:**
- Fetching data from APIs
- Accessing backend resources directly
- Keeping sensitive information on server (API keys, tokens)
- Reducing client-side JavaScript bundle
- Static rendering for better SEO

```typescript
// ✅ CORRECT: Server Component (default in app/ directory)
// app/orders/page.tsx
import { OrdersList } from "@/components/OrdersList";

// No "use client" directive = Server Component
export default async function OrdersPage() {
  // Fetch data on server
  const response = await fetch(`${process.env.API_URL}/api/orders`, {
    cache: "no-store", // Dynamic data
  });
  const orders = await response.json();

  return (
    <div>
      <h1>Orders</h1>
      <OrdersList orders={orders} />
    </div>
  );
}

// Server Components can be async
// Can directly access environment variables (server-side)
// No client-side JavaScript for this component
```

**Server Component Capabilities:**
- Async functions (use `async/await`)
- Direct database access (if using Prisma, Drizzle, etc.)
- Access `process.env` variables (server-side)
- Import server-only code
- Reduce client bundle size

**Server Component Limitations:**
- ❌ Cannot use React hooks (`useState`, `useEffect`, etc.)
- ❌ Cannot use browser APIs (`window`, `localStorage`, etc.)
- ❌ Cannot use event handlers (`onClick`, `onChange`, etc.)
- ❌ Cannot use Context providers/consumers

### Client Components

**When to Use:**
- Interactive UI (buttons, forms, inputs)
- React hooks (`useState`, `useEffect`, `useContext`)
- Browser APIs (`localStorage`, `navigator`, etc.)
- Event handlers (`onClick`, `onSubmit`, etc.)
- Third-party libraries that require client-side execution

```typescript
// ✅ CORRECT: Client Component
// app/orders/new/OrderForm.tsx
"use client"; // Required directive at top of file

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OrderForm() {
  const [customerName, setCustomerName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_name: customerName }),
      });

      if (response.ok) {
        router.push("/orders");
      }
    } catch (error) {
      console.error("Failed to create order:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={customerName}
        onChange={(e) => setCustomerName(e.target.value)}
        required
      />
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create Order"}
      </button>
    </form>
  );
}
```

**Client Component Capabilities:**
- Use React hooks
- Event handlers
- Browser APIs
- Context providers/consumers
- Interactive UI

**Client Component Limitations:**
- ❌ Cannot be async
- ❌ Increases client JavaScript bundle
- ❌ Cannot directly access server-only resources

### Component Composition Pattern

```typescript
// ✅ CORRECT: Server Component wrapping Client Component
// app/orders/[id]/page.tsx
import { OrderDetails } from "@/components/OrderDetails"; // Client
import { getOrder } from "@/lib/api"; // Server-side function

// Server Component (async)
export default async function OrderPage({ params }: { params: { id: string } }) {
  // Fetch data on server
  const order = await getOrder(params.id);

  return (
    <div>
      <h1>Order #{order.id}</h1>
      {/* Pass data as props to Client Component */}
      <OrderDetails order={order} />
    </div>
  );
}

// components/OrderDetails.tsx
"use client";

import { useState } from "react";

export function OrderDetails({ order }: { order: Order }) {
  const [isEditing, setIsEditing] = useState(false);

  // Client-side interactivity
  return (
    <div>
      <button onClick={() => setIsEditing(!isEditing)}>
        {isEditing ? "Cancel" : "Edit"}
      </button>
      {/* ... */}
    </div>
  );
}
```

**Key Principle**: Fetch data in Server Components, pass to Client Components as props.

```typescript
// ❌ WRONG: Client Component fetching data
"use client";

import { useEffect, useState } from "react";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    // Client-side fetch - slower, no SSR
    fetch("/api/orders")
      .then(res => res.json())
      .then(setOrders);
  }, []);

  return <div>{/* ... */}</div>;
}
```

## 2. Layouts and Routing

The App Router uses file-system based routing with special files.

### File System Routing

```
app/
├── layout.tsx          # Root layout (required)
├── page.tsx            # Home page (/)
├── loading.tsx         # Loading UI
├── error.tsx           # Error UI
├── not-found.tsx       # 404 page
│
├── orders/
│   ├── layout.tsx      # Orders layout (nested)
│   ├── page.tsx        # /orders
│   ├── loading.tsx     # /orders loading
│   │
│   ├── new/
│   │   └── page.tsx    # /orders/new
│   │
│   └── [id]/
│       ├── page.tsx    # /orders/[id]
│       └── edit/
│           └── page.tsx # /orders/[id]/edit
│
└── (auth)/             # Route group (doesn't affect URL)
    ├── login/
    │   └── page.tsx    # /login
    └── signup/
        └── page.tsx    # /signup
```

### Root Layout (Required)

```typescript
// ✅ CORRECT: Root layout with HTML structure
// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "KN KITCHEN - Order Management",
  description: "Catering order management system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Auth context wraps entire app */}
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

// Root layout MUST have <html> and <body> tags
// Only one root layout per app
// Cannot be a Client Component
```

### Nested Layouts

```typescript
// ✅ CORRECT: Nested layout for dashboard
// app/dashboard/layout.tsx
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

// This layout wraps all routes under /dashboard/*
// Sidebar and Header are shared across /dashboard/orders, /dashboard/customers, etc.
```

### Dynamic Routes

```typescript
// ✅ CORRECT: Dynamic route with params
// app/orders/[id]/page.tsx
import { notFound } from "next/navigation";

interface PageProps {
  params: { id: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function OrderPage({ params }: PageProps) {
  const order = await getOrder(params.id);

  if (!order) {
    notFound(); // Triggers not-found.tsx
  }

  return (
    <div>
      <h1>Order #{params.id}</h1>
      {/* ... */}
    </div>
  );
}

// Generate static params for SSG (optional)
export async function generateStaticParams() {
  const orders = await getAllOrders();

  return orders.map((order) => ({
    id: order.id.toString(),
  }));
}

// Metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const order = await getOrder(params.id);

  return {
    title: `Order #${params.id} - KN KITCHEN`,
    description: `Order details for ${order.customer_name}`,
  };
}
```

### Route Groups (Organization)

```typescript
// ✅ CORRECT: Route groups for organization (don't affect URL)
// app/(auth)/layout.tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full">
        {children}
      </div>
    </div>
  );
}

// app/(auth)/login/page.tsx = /login (not /auth/login)
// app/(auth)/signup/page.tsx = /signup (not /auth/signup)
// Route groups organize code without changing URLs
```

### Loading States

```typescript
// ✅ CORRECT: Loading UI with Suspense boundary
// app/orders/loading.tsx
export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="animate-pulse bg-gray-200 h-8 w-1/3 rounded"></div>
      <div className="animate-pulse bg-gray-200 h-64 rounded"></div>
    </div>
  );
}

// Automatically wraps page.tsx in <Suspense fallback={<Loading />}>
```

### Error Handling

```typescript
// ✅ CORRECT: Error boundary
// app/orders/error.tsx
"use client"; // Error components must be Client Components

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to monitoring service
    console.error("Order error:", error);
  }, [error]);

  return (
    <div className="p-6 text-center">
      <h2 className="text-2xl font-bold text-red-600 mb-4">
        Something went wrong!
      </h2>
      <p className="text-gray-600 mb-4">{error.message}</p>
      <button
        onClick={reset}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Try again
      </button>
    </div>
  );
}

// Catches errors in page.tsx and nested components
```

## 3. API Client Abstraction

Create a reusable API client for communicating with FastAPI backend.

### API Client Setup

```typescript
// ✅ CORRECT: Type-safe API client
// lib/api-client.ts

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: any
  ) {
    super(message);
    this.name = "APIError";
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const config: RequestInit = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include", // Send cookies (JWT)
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        errorData.detail || response.statusText,
        response.status,
        errorData
      );
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError("Network error", 0, error);
  }
}

// Convenience methods
export const api = {
  get: <T>(endpoint: string) =>
    apiRequest<T>(endpoint, { method: "GET" }),

  post: <T>(endpoint: string, data: any) =>
    apiRequest<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  put: <T>(endpoint: string, data: any) =>
    apiRequest<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: <T>(endpoint: string) =>
    apiRequest<T>(endpoint, { method: "DELETE" }),
};
```

### Type Definitions

```typescript
// ✅ CORRECT: Shared types for API responses
// lib/types.ts

export interface Order {
  id: number;
  customer_id: number;
  customer_name: string;
  status: "draft" | "confirmed" | "billed" | "completed" | "cancelled";
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  delivery_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  item_id: string;
  item_name: string;
  quantity: number;
  price_at_order: number;
  subtotal: number;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone?: string;
  billing_address?: string;
}

export interface CreateOrderDTO {
  customer_id: number;
  items: Array<{
    item_id: string;
    quantity: number;
  }>;
  delivery_date: string;
  notes?: string;
}
```

### Server-Side Data Fetching

```typescript
// ✅ CORRECT: Server Component with data fetching
// app/orders/page.tsx
import { api } from "@/lib/api-client";
import { Order } from "@/lib/types";

export default async function OrdersPage() {
  // Fetch on server (SSR)
  const orders = await api.get<Order[]>("/api/orders");

  return (
    <div>
      <h1>Orders</h1>
      <OrdersTable orders={orders} />
    </div>
  );
}

// Optional: Revalidate cache
export const revalidate = 60; // Revalidate every 60 seconds

// Or: Disable caching
export const dynamic = "force-dynamic";
```

### Client-Side Data Fetching

```typescript
// ✅ CORRECT: Client Component with data fetching
// components/OrdersList.tsx
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Order } from "@/lib/types";

export function OrdersList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const data = await api.get<Order[]>("/api/orders");
        setOrders(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load orders");
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrders();
  }, []);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <ul>
      {orders.map((order) => (
        <li key={order.id}>{order.customer_name}</li>
      ))}
    </ul>
  );
}
```

### React Query Integration (Optional)

```typescript
// ✅ CORRECT: Using React Query for client-side caching
// lib/queries.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api-client";
import { Order, CreateOrderDTO } from "./types";

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: () => api.get<Order[]>("/api/orders"),
  });
}

export function useOrder(id: number) {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: () => api.get<Order>(`/api/orders/${id}`),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateOrderDTO) =>
      api.post<Order>("/api/orders", data),
    onSuccess: () => {
      // Invalidate and refetch orders list
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

// Usage in component
"use client";

export function OrdersPage() {
  const { data: orders, isLoading, error } = useOrders();
  const createOrder = useCreateOrder();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{/* ... */}</div>;
}
```

## 4. Performance Patterns

### Streaming with Suspense

```typescript
// ✅ CORRECT: Stream data with Suspense boundaries
// app/dashboard/page.tsx
import { Suspense } from "react";
import { OrdersWidget } from "@/components/OrdersWidget";
import { RevenueWidget } from "@/components/RevenueWidget";

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Stream each widget independently */}
      <Suspense fallback={<WidgetSkeleton />}>
        <OrdersWidget />
      </Suspense>

      <Suspense fallback={<WidgetSkeleton />}>
        <RevenueWidget />
      </Suspense>
    </div>
  );
}

// components/OrdersWidget.tsx (Server Component)
export async function OrdersWidget() {
  // Slow data fetch
  const orders = await getRecentOrders();

  return <div>{/* ... */}</div>;
}

// Page starts rendering immediately, widgets stream in when ready
```

### Image Optimization

```typescript
// ✅ CORRECT: Use Next.js Image component
import Image from "next/image";

export function MenuItem({ item }: { item: MenuItem }) {
  return (
    <div>
      <Image
        src={item.image_url}
        alt={item.name}
        width={300}
        height={200}
        priority={false} // Lazy load by default
        placeholder="blur" // Show blur while loading
        blurDataURL={item.blur_placeholder}
      />
      <h3>{item.name}</h3>
    </div>
  );
}

// Automatically optimizes images:
// - Serves WebP/AVIF when supported
// - Lazy loads off-screen images
// - Prevents layout shift
```

### Code Splitting

```typescript
// ✅ CORRECT: Dynamic imports for large components
import dynamic from "next/dynamic";

// Lazy load heavy component
const OrderChart = dynamic(() => import("@/components/OrderChart"), {
  loading: () => <div>Loading chart...</div>,
  ssr: false, // Disable SSR for client-only component
});

export default function ReportsPage() {
  return (
    <div>
      <h1>Reports</h1>
      {/* Chart only loaded when page is visited */}
      <OrderChart />
    </div>
  );
}
```

### Caching Strategies

```typescript
// ✅ CORRECT: Different caching strategies

// 1. Static generation (default) - cached indefinitely
export default async function StaticPage() {
  const data = await fetch("https://api.example.com/static");
  return <div>Static content</div>;
}

// 2. Revalidate every N seconds (ISR)
export default async function ISRPage() {
  const data = await fetch("https://api.example.com/data", {
    next: { revalidate: 60 }, // Revalidate every 60 seconds
  });
  return <div>{data}</div>;
}

// 3. Dynamic rendering (no cache)
export default async function DynamicPage() {
  const data = await fetch("https://api.example.com/data", {
    cache: "no-store", // Always fresh data
  });
  return <div>{data}</div>;
}

// 4. Route-level dynamic
export const dynamic = "force-dynamic"; // Force dynamic rendering

export default async function AlwaysDynamicPage() {
  return <div>Always server-rendered</div>;
}
```

### Metadata for SEO

```typescript
// ✅ CORRECT: Static and dynamic metadata
import type { Metadata } from "next";

// Static metadata
export const metadata: Metadata = {
  title: "Orders - KN KITCHEN",
  description: "View and manage catering orders",
  openGraph: {
    title: "Orders - KN KITCHEN",
    description: "View and manage catering orders",
    images: ["/og-image.jpg"],
  },
};

// Dynamic metadata
export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const order = await getOrder(params.id);

  return {
    title: `Order #${order.id} - KN KITCHEN`,
    description: `Order for ${order.customer_name}`,
  };
}
```

### Parallel Data Fetching

```typescript
// ✅ CORRECT: Fetch data in parallel
export default async function OrderPage({ params }: { params: { id: string } }) {
  // Fetch in parallel (not sequential)
  const [order, customer, items] = await Promise.all([
    getOrder(params.id),
    getCustomer(params.id),
    getMenuItems(),
  ]);

  return (
    <div>
      {/* ... */}
    </div>
  );
}

// ❌ WRONG: Sequential fetching (slow)
export default async function OrderPageSlow({ params }: { params: { id: string } }) {
  const order = await getOrder(params.id); // Wait
  const customer = await getCustomer(params.id); // Wait
  const items = await getMenuItems(); // Wait

  return <div>{/* ... */}</div>;
}
```

## Best Practices Checklist

- [ ] **Server First**: Use Server Components by default
- [ ] **Client Directive**: Add "use client" only when needed
- [ ] **Async Components**: Use async Server Components for data fetching
- [ ] **Nested Layouts**: Share UI with nested layouts
- [ ] **Loading States**: Provide loading.tsx for better UX
- [ ] **Error Boundaries**: Handle errors with error.tsx
- [ ] **Type Safety**: TypeScript for all components and API calls
- [ ] **API Abstraction**: Centralized API client with error handling
- [ ] **Streaming**: Use Suspense for progressive rendering
- [ ] **Image Optimization**: Use Next.js Image component
- [ ] **Code Splitting**: Dynamic imports for heavy components
- [ ] **Caching**: Choose appropriate caching strategy
- [ ] **SEO**: Add metadata to pages
- [ ] **Parallel Fetching**: Use Promise.all for independent requests

## Reference Documents

- Constitution: `.specify/memory/constitution.md` (Technical stack)
- System Architecture: `.claude/skills/system-architecture.md` (Frontend/backend separation)
- Better Auth: `.claude/skills/better-auth.md` (Authentication integration)
- JWT Security: `.claude/skills/jwt-security.md` (Token handling)

---

**Remember**: Next.js App Router favors Server Components for performance. Only use Client Components when you need interactivity, hooks, or browser APIs. Fetch data on the server, pass to client as props.
