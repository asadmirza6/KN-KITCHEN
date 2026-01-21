---
name: Frontend Forms & UX
description: Best practices for complex form handling, validation, debounced autosave, and error/loading states
scope: mandatory
applies_to: frontend
---

# Frontend Forms & UX

**Status**: MANDATORY - All forms MUST follow these patterns

## Overview

Forms are critical user interfaces in KN KITCHEN. Proper form handling, validation, and UX patterns ensure data integrity and user satisfaction.

**Key Libraries:**
- React Hook Form (form state management)
- Zod (schema validation)
- Tailwind CSS (styling)
- React (hooks for state and effects)

## Core Principles

1. **Client + Server Validation**: Validate on client for UX, on server for security
2. **Progressive Disclosure**: Show errors as user completes fields
3. **Immediate Feedback**: Validate on blur, not on every keystroke
4. **Autosave Drafts**: Save work in progress automatically
5. **Accessible**: Proper labels, ARIA attributes, keyboard navigation

## 1. Complex Form Handling

Use React Hook Form for managing form state, validation, and submission.

### Basic Form Setup

```typescript
// ✅ CORRECT: React Hook Form with Zod validation
// components/forms/CustomerForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Define validation schema
const customerSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  billing_address: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

export function CustomerForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    mode: "onBlur", // Validate on blur (not on change)
  });

  const onSubmit = async (data: CustomerFormData) => {
    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to create customer");
      }

      // Success handling
      alert("Customer created successfully");
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to create customer");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Name field */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          {...register("name")}
          className={`w-full px-3 py-2 border rounded ${
            errors.name ? "border-red-500" : "border-gray-300"
          }`}
          aria-invalid={errors.name ? "true" : "false"}
          aria-describedby={errors.name ? "name-error" : undefined}
        />
        {errors.name && (
          <p id="name-error" className="text-red-500 text-sm mt-1">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Email field */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          id="email"
          type="email"
          {...register("email")}
          className={`w-full px-3 py-2 border rounded ${
            errors.email ? "border-red-500" : "border-gray-300"
          }`}
          aria-invalid={errors.email ? "true" : "false"}
          aria-describedby={errors.email ? "email-error" : undefined}
        />
        {errors.email && (
          <p id="email-error" className="text-red-500 text-sm mt-1">
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Phone field (optional) */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium mb-1">
          Phone
        </label>
        <input
          id="phone"
          type="tel"
          {...register("phone")}
          className="w-full px-3 py-2 border border-gray-300 rounded"
        />
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Creating..." : "Create Customer"}
      </button>
    </form>
  );
}
```

### Nested Form Fields (Order with Line Items)

```typescript
// ✅ CORRECT: Form with dynamic nested fields
// components/forms/OrderForm.tsx
"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Nested schema
const orderItemSchema = z.object({
  item_id: z.string().min(1, "Item is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
});

const orderSchema = z.object({
  customer_id: z.number().min(1, "Customer is required"),
  delivery_date: z.string().min(1, "Delivery date is required"),
  items: z.array(orderItemSchema).min(1, "At least one item required"),
  notes: z.string().optional(),
});

type OrderFormData = z.infer<typeof orderSchema>;

export function OrderForm() {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      items: [{ item_id: "", quantity: 1 }], // Start with one item
    },
  });

  // Manage dynamic line items array
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const onSubmit = async (data: OrderFormData) => {
    // Submit order...
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Customer selection */}
      <div>
        <label htmlFor="customer_id" className="block text-sm font-medium mb-1">
          Customer <span className="text-red-500">*</span>
        </label>
        <select
          id="customer_id"
          {...register("customer_id", { valueAsNumber: true })}
          className={`w-full px-3 py-2 border rounded ${
            errors.customer_id ? "border-red-500" : "border-gray-300"
          }`}
        >
          <option value="">Select customer...</option>
          {/* Options populated from API */}
        </select>
        {errors.customer_id && (
          <p className="text-red-500 text-sm mt-1">
            {errors.customer_id.message}
          </p>
        )}
      </div>

      {/* Delivery date */}
      <div>
        <label htmlFor="delivery_date" className="block text-sm font-medium mb-1">
          Delivery Date <span className="text-red-500">*</span>
        </label>
        <input
          id="delivery_date"
          type="date"
          {...register("delivery_date")}
          min={new Date().toISOString().split("T")[0]} // Today or later
          className={`w-full px-3 py-2 border rounded ${
            errors.delivery_date ? "border-red-500" : "border-gray-300"
          }`}
        />
        {errors.delivery_date && (
          <p className="text-red-500 text-sm mt-1">
            {errors.delivery_date.message}
          </p>
        )}
      </div>

      {/* Line items (dynamic array) */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium">
            Items <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={() => append({ item_id: "", quantity: 1 })}
            className="text-blue-600 text-sm hover:underline"
          >
            + Add Item
          </button>
        </div>

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-start">
              {/* Item selection */}
              <div className="flex-1">
                <select
                  {...register(`items.${index}.item_id`)}
                  className={`w-full px-3 py-2 border rounded ${
                    errors.items?.[index]?.item_id
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                >
                  <option value="">Select item...</option>
                  {/* Options populated from Sanity CMS */}
                </select>
                {errors.items?.[index]?.item_id && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.items[index].item_id?.message}
                  </p>
                )}
              </div>

              {/* Quantity */}
              <div className="w-24">
                <input
                  type="number"
                  {...register(`items.${index}.quantity`, {
                    valueAsNumber: true,
                  })}
                  min="1"
                  className={`w-full px-3 py-2 border rounded ${
                    errors.items?.[index]?.quantity
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                />
                {errors.items?.[index]?.quantity && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.items[index].quantity?.message}
                  </p>
                )}
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => remove(index)}
                disabled={fields.length === 1} // Keep at least one
                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        {/* Array-level error */}
        {errors.items && !Array.isArray(errors.items) && (
          <p className="text-red-500 text-sm mt-1">{errors.items.message}</p>
        )}
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium mb-1">
          Notes
        </label>
        <textarea
          id="notes"
          {...register("notes")}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? "Creating Order..." : "Create Order"}
      </button>
    </form>
  );
}
```

## 2. Validation

Implement both client-side (UX) and server-side (security) validation.

### Client-Side Validation with Zod

```typescript
// ✅ CORRECT: Comprehensive validation schema
import { z } from "zod";

const orderSchema = z.object({
  customer_id: z
    .number({ required_error: "Customer is required" })
    .min(1, "Customer is required"),

  delivery_date: z
    .string()
    .min(1, "Delivery date is required")
    .refine(
      (date) => new Date(date) >= new Date(new Date().setHours(0, 0, 0, 0)),
      "Delivery date cannot be in the past"
    ),

  items: z
    .array(
      z.object({
        item_id: z.string().min(1, "Item is required"),
        quantity: z
          .number({ required_error: "Quantity is required" })
          .min(1, "Quantity must be at least 1")
          .max(1000, "Quantity cannot exceed 1000"),
      })
    )
    .min(1, "At least one item is required")
    .max(50, "Maximum 50 items per order"),

  notes: z
    .string()
    .max(1000, "Notes cannot exceed 1000 characters")
    .optional(),
});

// Custom validation (cross-field)
const orderSchemaWithTotal = orderSchema.refine(
  async (data) => {
    // Example: Check if total doesn't exceed credit limit
    const customer = await getCustomer(data.customer_id);
    const total = calculateOrderTotal(data.items);
    return total <= customer.credit_limit;
  },
  {
    message: "Order total exceeds customer credit limit",
    path: ["items"], // Show error on items field
  }
);
```

### Real-Time Validation (On Blur)

```typescript
// ✅ CORRECT: Validate on blur, not on change
const {
  register,
  formState: { errors, touchedFields },
} = useForm({
  resolver: zodResolver(schema),
  mode: "onBlur", // Validate when field loses focus
  reValidateMode: "onChange", // Re-validate on change after first error
});

// Show error only if field has been touched (blurred)
{touchedFields.email && errors.email && (
  <p className="text-red-500 text-sm">{errors.email.message}</p>
)}
```

### Server-Side Validation

```typescript
// ✅ CORRECT: Backend validation (FastAPI)
// backend/src/api/routes/orders.py
from pydantic import BaseModel, Field, validator
from datetime import date

class CreateOrderDTO(BaseModel):
    customer_id: int = Field(gt=0)
    delivery_date: date
    items: List[OrderItemDTO] = Field(min_items=1, max_items=50)
    notes: Optional[str] = Field(None, max_length=1000)

    @validator("delivery_date")
    def validate_delivery_date(cls, v):
        if v < date.today():
            raise ValueError("Delivery date cannot be in the past")
        return v

    @validator("items")
    def validate_items_total_quantity(cls, v):
        total_qty = sum(item.quantity for item in v)
        if total_qty > 10000:
            raise ValueError("Total quantity cannot exceed 10,000")
        return v

@router.post("/orders")
async def create_order(order: CreateOrderDTO):
    # Pydantic validates automatically
    # Additional business validation
    customer = await get_customer(order.customer_id)
    if not customer:
        raise HTTPException(status_code=400, detail="Customer not found")

    # Create order...
```

### Handling Server Validation Errors

```typescript
// ✅ CORRECT: Display server validation errors
"use client";

import { useForm } from "react-hook-form";
import { useState } from "react";

export function OrderForm() {
  const { register, handleSubmit, setError } = useForm();
  const [serverError, setServerError] = useState<string | null>(null);

  const onSubmit = async (data) => {
    setServerError(null);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();

        // Handle field-specific errors
        if (error.errors) {
          error.errors.forEach((err: any) => {
            const field = err.loc?.[1]; // ["body", "field_name"]
            if (field) {
              setError(field, { message: err.msg });
            }
          });
        }

        // Handle general error
        if (error.detail) {
          setServerError(error.detail);
        }

        return;
      }

      // Success
      alert("Order created successfully");
    } catch (error) {
      setServerError("Network error. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* General server error */}
      {serverError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {serverError}
        </div>
      )}

      {/* Form fields... */}
    </form>
  );
}
```

## 3. Debounced Autosave

Automatically save drafts as users work on forms.

### Autosave Hook

```typescript
// ✅ CORRECT: Debounced autosave hook
// hooks/useAutosave.ts
import { useEffect, useRef } from "react";

interface UseAutosaveOptions {
  data: any;
  onSave: (data: any) => Promise<void>;
  delay?: number; // Debounce delay in milliseconds
  enabled?: boolean; // Enable/disable autosave
}

export function useAutosave({
  data,
  onSave,
  delay = 2000, // Default: 2 seconds
  enabled = true,
}: UseAutosaveOptions) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const previousDataRef = useRef<any>();
  const isSavingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    // Skip if data hasn't changed
    if (JSON.stringify(data) === JSON.stringify(previousDataRef.current)) {
      return;
    }

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(async () => {
      if (isSavingRef.current) return;

      try {
        isSavingRef.current = true;
        await onSave(data);
        previousDataRef.current = data;
      } catch (error) {
        console.error("Autosave failed:", error);
      } finally {
        isSavingRef.current = false;
      }
    }, delay);

    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, onSave, delay, enabled]);
}
```

### Using Autosave in Form

```typescript
// ✅ CORRECT: Form with autosave
"use client";

import { useForm } from "react-hook-form";
import { useAutosave } from "@/hooks/useAutosave";
import { useState } from "react";

export function OrderFormWithAutosave({ draftId }: { draftId?: number }) {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { watch, register } = useForm({
    defaultValues: async () => {
      // Load existing draft if editing
      if (draftId) {
        const draft = await fetch(`/api/drafts/${draftId}`).then((r) => r.json());
        return draft.data;
      }
      return {};
    },
  });

  // Watch all form fields
  const formData = watch();

  // Autosave function
  const handleAutosave = async (data: any) => {
    setIsSaving(true);

    try {
      if (draftId) {
        // Update existing draft
        await fetch(`/api/drafts/${draftId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } else {
        // Create new draft
        const response = await fetch("/api/drafts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "order", data }),
        });
        const draft = await response.json();
        // Update draftId (would need state management)
      }

      setLastSaved(new Date());
    } finally {
      setIsSaving(false);
    }
  };

  // Enable autosave
  useAutosave({
    data: formData,
    onSave: handleAutosave,
    delay: 3000, // Save after 3 seconds of inactivity
    enabled: true,
  });

  return (
    <div>
      {/* Autosave indicator */}
      <div className="flex justify-between items-center mb-4">
        <h1>Create Order</h1>
        <div className="text-sm text-gray-500">
          {isSaving ? (
            <span className="flex items-center">
              <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Saving...
            </span>
          ) : lastSaved ? (
            <span>Saved {formatTimeAgo(lastSaved)}</span>
          ) : (
            <span>Draft</span>
          )}
        </div>
      </div>

      <form>{/* Form fields... */}</form>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}
```

### Draft Recovery

```typescript
// ✅ CORRECT: Prompt user to recover unsaved draft
"use client";

import { useEffect, useState } from "react";

export function OrderFormWithRecovery() {
  const [hasDraft, setHasDraft] = useState(false);
  const [draftId, setDraftId] = useState<number | null>(null);

  useEffect(() => {
    // Check for existing draft on mount
    async function checkDraft() {
      const response = await fetch("/api/drafts?type=order&status=incomplete");
      const drafts = await response.json();

      if (drafts.length > 0) {
        setHasDraft(true);
        setDraftId(drafts[0].id);
      }
    }

    checkDraft();
  }, []);

  const handleRecoverDraft = () => {
    // Load draft into form
    setHasDraft(false);
  };

  const handleDiscardDraft = async () => {
    if (draftId) {
      await fetch(`/api/drafts/${draftId}`, { method: "DELETE" });
    }
    setHasDraft(false);
    setDraftId(null);
  };

  return (
    <div>
      {/* Draft recovery prompt */}
      {hasDraft && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded mb-4">
          <p className="text-blue-900 mb-2">
            You have an unsaved draft. Would you like to continue where you left off?
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleRecoverDraft}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm"
            >
              Recover Draft
            </button>
            <button
              onClick={handleDiscardDraft}
              className="border border-gray-300 px-4 py-2 rounded text-sm"
            >
              Start Fresh
            </button>
          </div>
        </div>
      )}

      {/* Form */}
      <OrderFormWithAutosave draftId={draftId ?? undefined} />
    </div>
  );
}
```

## 4. Error and Loading States

Provide clear feedback for all user actions.

### Loading States

```typescript
// ✅ CORRECT: Loading states for buttons
"use client";

import { useState } from "react";

export function SubmitButton({
  isSubmitting,
  children,
}: {
  isSubmitting: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={isSubmitting}
      className="relative bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
    >
      {isSubmitting && (
        <svg
          className="animate-spin h-5 w-5 mr-2"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {isSubmitting ? "Processing..." : children}
    </button>
  );
}

// Usage
<SubmitButton isSubmitting={isSubmitting}>
  Create Order
</SubmitButton>
```

### Skeleton Loading

```typescript
// ✅ CORRECT: Skeleton UI while form data loads
export function OrderFormSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 bg-gray-200 rounded w-1/3"></div>
      <div className="h-40 bg-gray-200 rounded"></div>
      <div className="h-10 bg-gray-200 rounded w-1/4"></div>
    </div>
  );
}

// Usage with Suspense
import { Suspense } from "react";

export default function EditOrderPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<OrderFormSkeleton />}>
      <OrderFormLoader orderId={params.id} />
    </Suspense>
  );
}
```

### Error States

```typescript
// ✅ CORRECT: Error message component
export function ErrorMessage({
  title,
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="bg-red-50 border border-red-200 rounded p-4">
      {title && <h3 className="text-red-900 font-medium mb-2">{title}</h3>}
      <p className="text-red-700 mb-3">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

// Usage
{error && (
  <ErrorMessage
    title="Failed to create order"
    message={error.message}
    onRetry={() => handleSubmit(onSubmit)()}
  />
)}
```

### Success Feedback (Toast)

```typescript
// ✅ CORRECT: Toast notification for success
// components/Toast.tsx
"use client";

import { useEffect, useState } from "react";

export function Toast({
  message,
  type = "success",
  duration = 3000,
  onClose,
}: {
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = {
    success: "bg-green-500",
    error: "bg-red-500",
    info: "bg-blue-500",
  }[type];

  return (
    <div
      className={`fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded shadow-lg z-50 animate-slide-in`}
    >
      <div className="flex items-center gap-2">
        <span>{message}</span>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-200"
        >
          ×
        </button>
      </div>
    </div>
  );
}

// Usage
const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

// On success
setToast({ message: "Order created successfully!", type: "success" });

{toast && (
  <Toast
    message={toast.message}
    type={toast.type}
    onClose={() => setToast(null)}
  />
)}
```

### Form State Indicator

```typescript
// ✅ CORRECT: Visual indicator of form state
export function FormStateIndicator({ isDirty, isValid }: {
  isDirty: boolean;
  isValid: boolean;
}) {
  if (!isDirty) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 border">
      <div className="flex items-center gap-2">
        {isValid ? (
          <>
            <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm text-gray-700">Form is valid</span>
          </>
        ) : (
          <>
            <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm text-gray-700">Please fix errors</span>
          </>
        )}
      </div>
    </div>
  );
}

// Usage
const { formState: { isDirty, isValid } } = useForm();

<FormStateIndicator isDirty={isDirty} isValid={isValid} />
```

## Best Practices Checklist

- [ ] **React Hook Form**: Use for form state management
- [ ] **Zod Validation**: Define schemas for type safety and validation
- [ ] **onBlur Mode**: Validate on blur, re-validate on change
- [ ] **Field Arrays**: Use `useFieldArray` for dynamic nested fields
- [ ] **Server Validation**: Backend validates all input (never trust client)
- [ ] **Error Display**: Show field-specific errors below inputs
- [ ] **ARIA Attributes**: `aria-invalid`, `aria-describedby` for accessibility
- [ ] **Required Indicators**: Mark required fields with asterisk
- [ ] **Autosave**: Debounced autosave for long forms
- [ ] **Draft Recovery**: Prompt to recover unsaved work
- [ ] **Loading States**: Disable buttons, show spinners during submission
- [ ] **Success Feedback**: Toast or message on successful submission
- [ ] **Error Feedback**: Clear error messages with retry option
- [ ] **Skeleton UI**: Show loading skeleton while data fetches

## Reference Documents

- Constitution: `.specify/memory/constitution.md` (Draft vs Confirmed orders)
- Next.js App Router: `.claude/skills/nextjs-app-router.md` (Client components)
- FastAPI Backend: `.claude/skills/fastapi-backend.md` (Server validation)

---

**Remember**: Forms are where users interact most with the system. Provide immediate feedback, save work automatically, handle errors gracefully, and validate on both client and server.
