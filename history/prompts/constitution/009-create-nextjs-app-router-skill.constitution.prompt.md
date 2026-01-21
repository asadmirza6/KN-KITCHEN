---
id: 009
title: Create Next.js App Router Skill
stage: constitution
date: 2026-01-16
surface: agent
model: claude-sonnet-4-5
feature: none
branch: master
user: system
command: manual
labels: ["skill", "nextjs", "frontend", "react", "app-router"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - .claude/skills/nextjs-app-router.md
tests:
  - None
---

## Prompt

Create a skill named "Next.js App Router".

Includes:
- Server vs Client components
- Layouts and routing
- API client abstraction
- Performance patterns

Create at:
.claude/skills/nextjs-app-router.md

## Response snapshot

Created mandatory Next.js App Router skill at `.claude/skills/nextjs-app-router.md`.

The skill defines frontend development patterns for KN KITCHEN using Next.js App Router:

**Core Principles:**
1. Server First - Use Server Components by default, Client Components only when needed
2. Progressive Enhancement - Build with JavaScript-optional patterns
3. Layout Composition - Use nested layouts for shared UI
4. Type Safety - TypeScript for all components and data fetching
5. Performance - Leverage streaming, caching, and code splitting

**1. Server vs Client Components:**

**Server Components (Default):**
- No "use client" directive needed
- Can be async functions
- Fetch data on server (better performance, SEO)
- Access environment variables (server-side only)
- Reduce client JavaScript bundle
- Cannot use React hooks, browser APIs, event handlers

**Client Components:**
- Require "use client" directive at top
- Use React hooks (useState, useEffect, useContext)
- Event handlers (onClick, onSubmit)
- Browser APIs (localStorage, window, navigator)
- Third-party libraries requiring client execution
- Cannot be async

**Component Composition:**
- Server Components wrap Client Components
- Fetch data in Server Component, pass as props to Client Component
- Minimizes client-side JavaScript while maintaining interactivity

**2. Layouts and Routing:**

**File System Routing:**
```
app/
├── layout.tsx          # Root layout (required)
├── page.tsx            # / route
├── loading.tsx         # Loading UI
├── error.tsx           # Error boundary
├── not-found.tsx       # 404 page
├── orders/
│   ├── layout.tsx      # Nested layout
│   ├── page.tsx        # /orders
│   ├── [id]/
│   │   └── page.tsx    # /orders/[id] (dynamic)
│   └── new/
│       └── page.tsx    # /orders/new
└── (auth)/             # Route group (doesn't affect URL)
    ├── login/page.tsx  # /login
    └── signup/page.tsx # /signup
```

**Root Layout:**
- Required, must have <html> and <body>
- Wraps entire app
- Cannot be Client Component
- Place global providers (AuthProvider)

**Nested Layouts:**
- Share UI across routes (sidebar, header)
- Compose layouts for different sections
- Automatic route grouping

**Dynamic Routes:**
- `[id]` for dynamic segments
- Access via `params` prop
- `generateStaticParams()` for SSG
- `generateMetadata()` for dynamic SEO

**Route Groups:**
- `(auth)` creates folder without affecting URL
- Organize code without changing routes

**Loading States:**
- `loading.tsx` automatically wraps page in Suspense
- Skeleton UI while data loads

**Error Handling:**
- `error.tsx` creates error boundary
- Must be Client Component
- Provides reset() function to retry

**3. API Client Abstraction:**

**API Client:**
- Centralized `apiRequest()` function
- Type-safe with TypeScript generics
- Custom `APIError` class with status codes
- Automatic cookie handling (`credentials: "include"`)
- Convenience methods: `api.get()`, `api.post()`, `api.put()`, `api.delete()`

**Type Definitions:**
- Shared interfaces for API responses (Order, Customer, etc.)
- DTOs for request payloads (CreateOrderDTO)
- Type safety across frontend and backend

**Server-Side Fetching:**
- Use async Server Components
- Direct API calls with `await`
- Optional revalidation: `export const revalidate = 60`
- Or force dynamic: `export const dynamic = "force-dynamic"`

**Client-Side Fetching:**
- `useState` + `useEffect` pattern
- Optional: React Query for caching, mutations, invalidation
- `useQuery` and `useMutation` hooks

**4. Performance Patterns:**

**Streaming with Suspense:**
- Wrap slow components in Suspense boundaries
- Stream widgets independently
- Page renders immediately, content streams in

**Image Optimization:**
- Use `next/image` component
- Automatic WebP/AVIF conversion
- Lazy loading by default
- Placeholder blur while loading
- Prevents layout shift

**Code Splitting:**
- `dynamic()` imports for heavy components
- Lazy load when needed
- Optional SSR disable for client-only components

**Caching Strategies:**
1. Static generation (default): Cached indefinitely
2. ISR (Incremental Static Regeneration): `{ next: { revalidate: 60 } }`
3. Dynamic rendering: `{ cache: "no-store" }`
4. Route-level: `export const dynamic = "force-dynamic"`

**Metadata for SEO:**
- Static metadata: `export const metadata`
- Dynamic metadata: `export async function generateMetadata()`
- OpenGraph tags for social sharing

**Parallel Data Fetching:**
- Use `Promise.all()` for independent requests
- Avoid sequential waterfall fetching

**Best Practices Checklist:**
- [ ] Server Components by default
- [ ] "use client" only when needed
- [ ] Async Server Components for data
- [ ] Nested layouts for shared UI
- [ ] loading.tsx for UX
- [ ] error.tsx for error handling
- [ ] TypeScript everywhere
- [ ] Centralized API client
- [ ] Suspense for streaming
- [ ] Next.js Image component
- [ ] Dynamic imports for heavy code
- [ ] Appropriate caching strategy
- [ ] Metadata for SEO
- [ ] Parallel fetching with Promise.all

## Outcome

- ✅ Impact: Established comprehensive Next.js App Router patterns ensuring optimal performance with Server Components, proper routing structure, type-safe API integration, and modern React patterns
- 🧪 Tests: None (frontend framework guidelines)
- 📁 Files: Created .claude/skills/nextjs-app-router.md (731 lines)
- 🔁 Next prompts: Reference during frontend implementation, validate component patterns in code reviews
- 🧠 Reflection: Skill emphasizes Server Component benefits (performance, SEO, reduced bundle size) while providing clear guidance on when Client Components are necessary, with comprehensive routing and performance patterns

## Evaluation notes (flywheel)

- Failure modes observed: None (initial creation)
- Graders run and results (PASS/FAIL): Will be validated during first frontend implementation and performance review
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Test Server/Client component composition and streaming patterns during first feature frontend implementation
