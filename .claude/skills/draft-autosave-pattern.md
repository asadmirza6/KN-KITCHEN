---
name: Draft Auto-Save Pattern
description: Patterns for draft state management, debounced autosave, recovery flows, and cleanup strategies
scope: mandatory
applies_to: frontend, backend
---

# Draft Auto-Save Pattern

**Status**: MANDATORY - All draft workflows MUST follow these patterns

## Overview

Draft auto-save enables users to work on incomplete orders without fear of data loss. This skill defines how drafts are created, saved, recovered, and cleaned up in accordance with Constitution Principle III (Draft vs Confirmed Order Separation).

**Key Technologies:**
- React Hook Form (form state)
- useAutosave hook (debounced saving)
- FastAPI (draft persistence)
- SQLModel (draft storage)

## Core Principles

1. **Automatic Persistence**: Save work in progress without user intervention
2. **Debounced Updates**: Prevent excessive API calls during active editing
3. **Graceful Recovery**: Prompt users to resume incomplete work
4. **State Separation**: Drafts and confirmed orders are distinct entities
5. **Clean Expiration**: Remove abandoned drafts after reasonable period

## 1. Draft vs Confirmed States

In accordance with Constitution Principle III, orders exist in two mutually exclusive states.

### Draft State Characteristics

```typescript
// ✅ CORRECT: Draft order model
interface DraftOrder {
  id: number;
  type: "order"; // Draft type (order, customer, etc.)
  user_id: number; // Creator
  data: {
    // Partial order data - may be incomplete
    customer_id?: number;
    delivery_date?: string;
    items?: Array<{ item_id: string; quantity: number }>;
    notes?: string;
  };
  created_at: Date;
  updated_at: Date;
  status: "incomplete" | "abandoned"; // Draft-specific statuses
}
```

**Draft Rules:**
- **Editable**: Can be modified freely without audit trail
- **Deletable**: Can be deleted by user or automatically expired
- **Invisible to Billing**: Never appear in invoices or revenue reports
- **User-Scoped**: Only visible to creating user
- **Validation Optional**: May contain incomplete/invalid data
- **No State Transitions**: Cannot move between statuses (no workflow)

### Confirmed Order State Characteristics

```typescript
// ✅ CORRECT: Confirmed order model
interface Order {
  id: number;
  customer_id: number; // REQUIRED - validated
  delivery_date: Date; // REQUIRED - validated
  items: OrderLineItem[]; // REQUIRED - at least one
  subtotal: Decimal;
  tax: Decimal;
  total: Decimal;
  status: "pending" | "in_progress" | "completed" | "cancelled"; // Order workflow
  created_at: Date;
  confirmed_at: Date; // When draft → confirmed
  notes?: string;
}
```

**Confirmed Order Rules:**
- **Immutable**: Changes require explicit edit with audit log
- **Non-Deletable**: Can only be cancelled with reason
- **Billable**: Eligible for invoice generation and reporting
- **Validated**: All required fields present and valid
- **State Machine**: Follows defined status transitions
- **Audit Trail**: All changes logged

### State Transition (Draft → Confirmed)

```typescript
// ✅ CORRECT: Explicit confirmation with validation
async function confirmOrder(draftId: number) {
  // 1. Validate draft data
  const draft = await getDraft(draftId);
  const validationResult = orderSchema.safeParse(draft.data);

  if (!validationResult.success) {
    return {
      success: false,
      errors: validationResult.error.errors,
    };
  }

  // 2. Create confirmed order (with backend calculations)
  const order = await createConfirmedOrder({
    customer_id: draft.data.customer_id!,
    delivery_date: draft.data.delivery_date!,
    items: draft.data.items!,
    notes: draft.data.notes,
  });

  // 3. Delete draft (no longer needed)
  await deleteDraft(draftId);

  return { success: true, order };
}
```

**Key Rule**: Drafts and confirmed orders are SEPARATE entities. A draft is NOT an order with `status: "draft"`. They live in different tables/collections with different validation rules.

## 2. Autosave Triggers

Autosave prevents data loss during active editing. Use debounced saves to minimize server load.

### When to Autosave

```typescript
// ✅ CORRECT: Autosave triggers
const AUTOSAVE_TRIGGERS = {
  // Primary: User stops typing (debounced)
  onFormChange: { delay: 3000 }, // 3 seconds after last change

  // Secondary: User navigates away
  onPageUnload: { immediate: true },

  // Tertiary: Periodic backup (optional)
  periodicBackup: { interval: 60000 }, // Every 60 seconds
};
```

### Debounced Autosave Implementation

```typescript
// ✅ CORRECT: Debounced autosave with useAutosave hook
"use client";

import { useForm } from "react-hook-form";
import { useAutosave } from "@/hooks/useAutosave";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function OrderDraftForm({ draftId }: { draftId?: number }) {
  const router = useRouter();
  const [localDraftId, setLocalDraftId] = useState(draftId);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { register, watch, handleSubmit } = useForm({
    defaultValues: async () => {
      if (localDraftId) {
        const response = await fetch(`/api/drafts/${localDraftId}`);
        const draft = await response.json();
        return draft.data;
      }
      return { items: [{ item_id: "", quantity: 1 }] };
    },
  });

  // Watch all form fields
  const formData = watch();

  // Autosave handler
  const handleAutosave = async (data: any) => {
    setIsSaving(true);

    try {
      if (localDraftId) {
        // Update existing draft
        await fetch(`/api/drafts/${localDraftId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        });
      } else {
        // Create new draft
        const response = await fetch("/api/drafts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "order", data }),
        });
        const draft = await response.json();
        setLocalDraftId(draft.id);

        // Update URL to include draft ID (for bookmarking)
        router.replace(`/orders/new?draft=${draft.id}`);
      }

      setLastSaved(new Date());
    } catch (error) {
      console.error("Autosave failed:", error);
      // Don't throw - silent failure for autosave
    } finally {
      setIsSaving(false);
    }
  };

  // Enable autosave with 3-second debounce
  useAutosave({
    data: formData,
    onSave: handleAutosave,
    delay: 3000,
    enabled: true,
  });

  // Save on page unload (beforeunload)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Try to save immediately (may not complete if user closes quickly)
      handleAutosave(formData);

      // Show browser warning if draft has unsaved changes
      if (formData && Object.keys(formData).length > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [formData]);

  return (
    <div>
      {/* Autosave indicator */}
      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <h1 className="text-2xl font-bold">New Order</h1>
        <div className="flex items-center gap-2 text-sm">
          {isSaving ? (
            <span className="flex items-center text-gray-500">
              <svg className="animate-spin h-4 w-4 mr-1" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
              </svg>
              Saving...
            </span>
          ) : lastSaved ? (
            <span className="text-green-600">
              ✓ Saved {formatTimeAgo(lastSaved)}
            </span>
          ) : (
            <span className="text-gray-400">Draft</span>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit(onConfirmOrder)}>
        {/* Form fields... */}
      </form>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}
```

### Backend Draft Endpoint

```python
# ✅ CORRECT: Draft persistence endpoint
# backend/src/api/routes/drafts.py
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from datetime import datetime
from typing import Any, Dict

router = APIRouter(prefix="/drafts", tags=["drafts"])

class Draft(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    type: str = Field(index=True)  # "order", "customer", etc.
    user_id: int = Field(foreign_key="user.id", index=True)
    data: Dict[str, Any] = Field(sa_column=Column(JSON))  # Partial data
    status: str = Field(default="incomplete", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

@router.post("/")
async def create_draft(
    draft_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Create new draft (no validation required)."""
    draft = Draft(
        type=draft_data.get("type", "order"),
        user_id=current_user.id,
        data=draft_data.get("data", {}),
        status="incomplete",
    )
    session.add(draft)
    session.commit()
    session.refresh(draft)
    return draft

@router.put("/{draft_id}")
async def update_draft(
    draft_id: int,
    draft_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Update existing draft (no validation)."""
    draft = session.get(Draft, draft_id)

    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    # Verify ownership
    if draft.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Update data and timestamp
    draft.data = draft_data.get("data", draft.data)
    draft.updated_at = datetime.utcnow()

    session.add(draft)
    session.commit()
    session.refresh(draft)
    return draft

@router.get("/")
async def list_drafts(
    type: Optional[str] = None,
    status: str = "incomplete",
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """List user's drafts."""
    statement = select(Draft).where(
        Draft.user_id == current_user.id,
        Draft.status == status,
    )

    if type:
        statement = statement.where(Draft.type == type)

    drafts = session.exec(statement.order_by(Draft.updated_at.desc())).all()
    return drafts

@router.delete("/{draft_id}")
async def delete_draft(
    draft_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Delete draft (hard delete)."""
    draft = session.get(Draft, draft_id)

    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    if draft.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    session.delete(draft)
    session.commit()
    return {"success": True}
```

**Key Points:**
- No validation on save (drafts can be incomplete)
- User ownership enforced (JWT user_id)
- Timestamp updated on every save
- Hard delete (no soft delete for drafts)

## 3. Recovery Flows

Prompt users to recover incomplete work when returning to forms.

### Recovery Decision Tree

```
User navigates to form page
  ↓
Check for existing incomplete drafts
  ↓
  ├─ No drafts → Show empty form
  ├─ One draft (< 24h old) → Auto-prompt recovery
  ├─ One draft (> 24h old) → Prompt with "Discard" emphasis
  └─ Multiple drafts → Show list, let user choose
```

### Single Draft Recovery

```typescript
// ✅ CORRECT: Automatic recovery prompt
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function NewOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftIdFromUrl = searchParams.get("draft");

  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false);
  const [draftToRecover, setDraftToRecover] = useState<any>(null);
  const [selectedDraftId, setSelectedDraftId] = useState<number | undefined>(
    draftIdFromUrl ? parseInt(draftIdFromUrl) : undefined
  );

  useEffect(() => {
    async function checkForDrafts() {
      // Skip if URL already has draft ID
      if (draftIdFromUrl) return;

      const response = await fetch("/api/drafts?type=order&status=incomplete");
      const drafts = await response.json();

      if (drafts.length === 1) {
        const draft = drafts[0];
        const ageInHours = (Date.now() - new Date(draft.updated_at).getTime()) / (1000 * 60 * 60);

        if (ageInHours < 24) {
          // Recent draft - prompt recovery
          setDraftToRecover(draft);
          setShowRecoveryPrompt(true);
        } else {
          // Old draft - still prompt but emphasize "Start Fresh"
          setDraftToRecover(draft);
          setShowRecoveryPrompt(true);
        }
      } else if (drafts.length > 1) {
        // Multiple drafts - show list (separate component)
        router.push("/orders/drafts");
      }
    }

    checkForDrafts();
  }, [draftIdFromUrl]);

  const handleRecoverDraft = () => {
    setSelectedDraftId(draftToRecover.id);
    setShowRecoveryPrompt(false);
    router.replace(`/orders/new?draft=${draftToRecover.id}`);
  };

  const handleDiscardDraft = async () => {
    if (draftToRecover) {
      await fetch(`/api/drafts/${draftToRecover.id}`, { method: "DELETE" });
    }
    setShowRecoveryPrompt(false);
    setDraftToRecover(null);
  };

  const draftAge = draftToRecover
    ? (Date.now() - new Date(draftToRecover.updated_at).getTime()) / (1000 * 60 * 60)
    : 0;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Recovery Prompt Modal */}
      {showRecoveryPrompt && draftToRecover && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-3">
              {draftAge < 24 ? "Continue where you left off?" : "Old draft found"}
            </h2>
            <p className="text-gray-700 mb-4">
              {draftAge < 24 ? (
                <>
                  You have an unsaved order from{" "}
                  <strong>{formatTimeAgo(new Date(draftToRecover.updated_at))}</strong>.
                  Would you like to continue editing?
                </>
              ) : (
                <>
                  You have an old draft from{" "}
                  <strong>{Math.floor(draftAge)} hours ago</strong>.
                  It may be outdated. Start fresh or recover?
                </>
              )}
            </p>

            {/* Show preview of draft data */}
            {draftToRecover.data.customer_id && (
              <div className="bg-gray-50 p-3 rounded mb-4 text-sm">
                <p className="text-gray-600">
                  Draft contains: {draftToRecover.data.items?.length || 0} items
                </p>
              </div>
            )}

            <div className="flex gap-3">
              {draftAge < 24 ? (
                <>
                  <button
                    onClick={handleRecoverDraft}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Recover Draft
                  </button>
                  <button
                    onClick={handleDiscardDraft}
                    className="flex-1 border border-gray-300 px-4 py-2 rounded hover:bg-gray-50"
                  >
                    Start Fresh
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleDiscardDraft}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Start Fresh
                  </button>
                  <button
                    onClick={handleRecoverDraft}
                    className="flex-1 border border-gray-300 px-4 py-2 rounded hover:bg-gray-50"
                  >
                    Recover Draft
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <OrderDraftForm draftId={selectedDraftId} />
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const hours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
  if (hours < 1) return "less than an hour ago";
  if (hours === 1) return "1 hour ago";
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}
```

### Multiple Drafts List

```typescript
// ✅ CORRECT: Draft list page for multiple drafts
// app/orders/drafts/page.tsx
export default async function DraftsPage() {
  const drafts = await fetch("/api/drafts?type=order&status=incomplete").then(r => r.json());

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Your Draft Orders</h1>

      {drafts.length === 0 ? (
        <p className="text-gray-500">No drafts found.</p>
      ) : (
        <div className="space-y-3">
          {drafts.map((draft: any) => (
            <div
              key={draft.id}
              className="border rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-500">
                      Draft #{draft.id}
                    </span>
                    <span className="text-sm text-gray-400">
                      Updated {formatTimeAgo(new Date(draft.updated_at))}
                    </span>
                  </div>

                  {/* Draft preview */}
                  <p className="text-sm text-gray-700">
                    {draft.data.items?.length || 0} items
                    {draft.data.delivery_date && (
                      <> • Delivery: {draft.data.delivery_date}</>
                    )}
                  </p>
                </div>

                <div className="flex gap-2">
                  <a
                    href={`/orders/new?draft=${draft.id}`}
                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
                  >
                    Continue
                  </a>
                  <button
                    onClick={async () => {
                      await fetch(`/api/drafts/${draft.id}`, { method: "DELETE" });
                      window.location.reload();
                    }}
                    className="text-red-600 hover:bg-red-50 px-3 py-2 rounded text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6">
        <a
          href="/orders/new"
          className="inline-block border border-gray-300 px-4 py-2 rounded hover:bg-gray-50"
        >
          Start New Order
        </a>
      </div>
    </div>
  );
}
```

**Recovery Rules:**
- **< 1 hour**: Very likely user wants to continue → Auto-prompt
- **< 24 hours**: Likely still relevant → Prompt with "Recover" emphasis
- **> 24 hours**: Possibly stale → Prompt with "Start Fresh" emphasis
- **> 7 days**: Mark as abandoned in cleanup job

## 4. Cleanup Strategy

Automatically remove abandoned drafts to prevent database bloat.

### Draft Lifecycle

```
Draft created
  ↓
User edits (autosave updates `updated_at`)
  ↓
User abandons (no updates for X days)
  ↓
Marked as "abandoned" (soft delete)
  ↓
After Y days, hard delete
```

### Cleanup Job (Backend)

```python
# ✅ CORRECT: Draft cleanup background job
# backend/src/jobs/cleanup_drafts.py
from sqlmodel import Session, select
from datetime import datetime, timedelta
from src.models import Draft

async def cleanup_abandoned_drafts(session: Session):
    """
    Mark drafts as abandoned if not updated in 7 days.
    Delete abandoned drafts older than 30 days.
    """
    now = datetime.utcnow()

    # 1. Mark drafts as abandoned (7 days)
    seven_days_ago = now - timedelta(days=7)
    statement = select(Draft).where(
        Draft.status == "incomplete",
        Draft.updated_at < seven_days_ago,
    )
    old_drafts = session.exec(statement).all()

    for draft in old_drafts:
        draft.status = "abandoned"
        session.add(draft)

    session.commit()
    print(f"Marked {len(old_drafts)} drafts as abandoned")

    # 2. Hard delete abandoned drafts (30 days)
    thirty_days_ago = now - timedelta(days=30)
    statement = select(Draft).where(
        Draft.status == "abandoned",
        Draft.updated_at < thirty_days_ago,
    )
    expired_drafts = session.exec(statement).all()

    for draft in expired_drafts:
        session.delete(draft)

    session.commit()
    print(f"Deleted {len(expired_drafts)} expired drafts")

# Run this job daily via cron or scheduler
# Example: 3 AM daily
# 0 3 * * * python -m src.jobs.cleanup_drafts
```

### Cleanup Configuration

```python
# ✅ CORRECT: Configurable cleanup periods
# backend/src/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Draft cleanup settings
    DRAFT_ABANDON_DAYS: int = 7    # Mark as abandoned after 7 days
    DRAFT_DELETE_DAYS: int = 30    # Hard delete after 30 days

    # Feature flag: disable cleanup in development
    ENABLE_DRAFT_CLEANUP: bool = True

settings = Settings()
```

### User-Initiated Cleanup

```typescript
// ✅ CORRECT: Let users delete their own drafts
export function DraftCleanupButton() {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAllDrafts = async () => {
    if (!confirm("Delete all your drafts? This cannot be undone.")) {
      return;
    }

    setIsDeleting(true);

    try {
      // Fetch all user's drafts
      const response = await fetch("/api/drafts?status=incomplete");
      const drafts = await response.json();

      // Delete each draft
      await Promise.all(
        drafts.map((draft: any) =>
          fetch(`/api/drafts/${draft.id}`, { method: "DELETE" })
        )
      );

      alert(`Deleted ${drafts.length} drafts`);
      window.location.reload();
    } catch (error) {
      alert("Failed to delete drafts");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDeleteAllDrafts}
      disabled={isDeleting}
      className="text-red-600 text-sm hover:underline disabled:opacity-50"
    >
      {isDeleting ? "Deleting..." : "Delete All Drafts"}
    </button>
  );
}
```

**Cleanup Rules:**
- **7 days inactive**: Mark as `status: "abandoned"`
- **30 days abandoned**: Hard delete from database
- **User action**: Allow manual delete anytime
- **Post-confirmation**: Delete draft immediately (no longer needed)

## Best Practices Checklist

- [ ] **Separate Tables**: Drafts and orders are distinct entities
- [ ] **No Validation**: Drafts can be incomplete/invalid
- [ ] **Debounced Saves**: 3-second delay after last change
- [ ] **User Ownership**: Enforce user_id on all draft operations
- [ ] **Timestamp Updates**: Update `updated_at` on every save
- [ ] **Recovery Prompts**: Check for drafts on form page load
- [ ] **Age-Based UX**: Emphasize recovery for recent drafts, discard for old
- [ ] **Multiple Drafts**: Show list if user has > 1 draft
- [ ] **Autosave Indicator**: Show "Saving...", "Saved Xm ago" status
- [ ] **Page Unload**: Save on beforeunload (best effort)
- [ ] **Confirmation Cleanup**: Delete draft after successful order creation
- [ ] **Abandoned Marking**: Auto-mark drafts abandoned after 7 days
- [ ] **Hard Delete**: Remove abandoned drafts after 30 days
- [ ] **Manual Cleanup**: Let users delete their own drafts
- [ ] **URL Integration**: Update URL with draft ID for bookmarking

## Common Pitfalls

### Pitfall 1: Storing Drafts as Orders

```typescript
// ❌ WRONG: Drafts as orders with status="draft"
interface Order {
  status: "draft" | "pending" | "completed"; // WRONG
}

// ✅ CORRECT: Separate Draft entity
interface Draft { /* separate from Order */ }
interface Order { status: "pending" | "completed" } // No "draft" status
```

**Why**: Drafts and orders have different validation rules, mutability, and lifecycle. Mixing them creates complexity.

### Pitfall 2: Validating Drafts on Save

```python
# ❌ WRONG: Validate draft data on save
@router.put("/drafts/{id}")
async def update_draft(draft_id: int, data: OrderCreateDTO):  # WRONG: validates
    # Will reject incomplete drafts
    pass

# ✅ CORRECT: No validation for drafts
@router.put("/drafts/{id}")
async def update_draft(draft_id: int, data: Dict[str, Any]):  # No validation
    # Accepts any JSON
    pass
```

**Why**: Drafts are work in progress. Validation happens only during confirmation (draft → order transition).

### Pitfall 3: Saving on Every Keystroke

```typescript
// ❌ WRONG: Save immediately on change
const formData = watch();
useEffect(() => {
  saveDraft(formData); // Triggers on every keystroke
}, [formData]);

// ✅ CORRECT: Debounced save
useAutosave({
  data: formData,
  onSave: saveDraft,
  delay: 3000, // Wait 3 seconds
});
```

**Why**: Immediate saves create excessive API calls. Debouncing reduces load by 95%+.

### Pitfall 4: Not Cleaning Up Post-Confirmation

```typescript
// ❌ WRONG: Keep draft after order created
async function confirmOrder(draftId: number) {
  const order = await createOrder(draftData);
  // Draft still exists - user sees duplicate
  return order;
}

// ✅ CORRECT: Delete draft after confirmation
async function confirmOrder(draftId: number) {
  const order = await createOrder(draftData);
  await deleteDraft(draftId); // Clean up
  return order;
}
```

**Why**: Drafts are temporary. Once confirmed, they're no longer needed and should be removed.

### Pitfall 5: Infinite Recovery Loops

```typescript
// ❌ WRONG: Auto-load draft without user consent
useEffect(() => {
  const draft = await getDraft();
  setFormData(draft.data); // WRONG: User might want fresh form
}, []);

// ✅ CORRECT: Prompt user before loading
useEffect(() => {
  const draft = await getDraft();
  setShowRecoveryPrompt(true); // Let user choose
}, []);
```

**Why**: Users may want to start fresh. Always ask before loading draft data.

## Reference Documents

- Constitution: `.specify/memory/constitution.md` (Principle III: Draft vs Confirmed)
- Frontend Forms & UX: `.claude/skills/frontend-forms-ux.md` (useAutosave hook)
- FastAPI Backend: `.claude/skills/fastapi-backend.md` (API patterns)
- SQLModel ORM: `.claude/skills/sqlmodel-orm.md` (Database models)

---

**Remember**: Drafts are temporary, editable, and incomplete. Confirmed orders are permanent, immutable, and validated. Keep these states strictly separated with explicit transitions.
