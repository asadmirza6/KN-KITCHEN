---
id: 013
title: Create Draft Auto-Save Pattern Skill
stage: constitution
date: 2026-01-16
surface: agent
model: claude-sonnet-4-5
feature: none
branch: master
user: system
command: manual
labels: ["skill", "drafts", "autosave", "recovery", "cleanup", "frontend", "backend"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - .claude/skills/draft-autosave-pattern.md
tests:
  - None
---

## Prompt

Create a skill named "Draft Auto-Save Pattern".

Includes:
- Draft vs confirmed states
- Autosave triggers
- Recovery flows
- Cleanup strategy

Create at:
.claude/skills/draft-autosave-pattern.md

## Response snapshot

Created mandatory Draft Auto-Save Pattern skill at `.claude/skills/draft-autosave-pattern.md`.

The skill defines comprehensive draft management patterns for KN KITCHEN:

**Core Principles:**
1. Automatic Persistence - Save work in progress without user intervention
2. Debounced Updates - Prevent excessive API calls during active editing
3. Graceful Recovery - Prompt users to resume incomplete work
4. State Separation - Drafts and confirmed orders are distinct entities
5. Clean Expiration - Remove abandoned drafts after reasonable period

**1. Draft vs Confirmed States:**

**Draft Characteristics:**
- Editable without audit trail
- Deletable by user or auto-expired
- Invisible to billing/reports
- User-scoped (only visible to creator)
- Validation optional (may be incomplete)
- No state transitions/workflow

**Confirmed Order Characteristics:**
- Immutable (changes require audit)
- Non-deletable (can only be cancelled with reason)
- Billable and reportable
- Fully validated
- Follows state machine
- All changes logged

**Key Rule**: Drafts and orders are SEPARATE entities in different tables. A draft is NOT an order with `status: "draft"`.

**State Transition (Draft → Confirmed):**
```typescript
async function confirmOrder(draftId: number) {
  // 1. Validate draft data
  const validationResult = orderSchema.safeParse(draft.data);

  // 2. Create confirmed order (backend calculates totals)
  const order = await createConfirmedOrder(draft.data);

  // 3. Delete draft (no longer needed)
  await deleteDraft(draftId);

  return order;
}
```

**2. Autosave Triggers:**

**When to Autosave:**
- Primary: User stops typing (3-second debounce after last change)
- Secondary: Page unload (beforeunload event, best effort)
- Tertiary: Periodic backup (optional, every 60 seconds)

**Implementation:**
- Use `useAutosave` hook with 3-second delay
- Watch all form fields with React Hook Form's `watch()`
- Create new draft on first save, update existing on subsequent saves
- Update URL with draft ID for bookmarking
- Show "Saving...", "Saved Xm ago" indicator
- Silent failure on autosave errors (don't block user)

**Backend Endpoint:**
```python
@router.post("/drafts")
async def create_draft(draft_data, current_user):
    # No validation required - accepts any JSON
    draft = Draft(
        type="order",
        user_id=current_user.id,
        data=draft_data,  # Partial/incomplete data OK
        status="incomplete",
    )
    return draft
```

**3. Recovery Flows:**

**Recovery Decision Tree:**
- No drafts → Show empty form
- One recent draft (< 24h) → Auto-prompt with "Recover" emphasis
- One old draft (> 24h) → Prompt with "Start Fresh" emphasis
- Multiple drafts → Redirect to drafts list page

**Recovery Prompt UX:**
- Modal overlay with two options: "Recover Draft" or "Start Fresh"
- Show draft age ("2 hours ago", "3 days ago")
- Show draft preview (e.g., "Contains 5 items")
- For recent drafts: emphasize "Recover"
- For old drafts: emphasize "Start Fresh"
- Never auto-load without user consent

**Multiple Drafts:**
- Show list page with all drafts
- Display: draft ID, age, preview (item count, delivery date)
- Actions: "Continue" (load into form) or "Delete"
- Link to start new order

**4. Cleanup Strategy:**

**Draft Lifecycle:**
```
Draft created
  ↓
User edits (autosave updates updated_at)
  ↓
User abandons (no updates for 7 days)
  ↓
Marked as "abandoned" (soft delete)
  ↓
After 30 days, hard delete
```

**Cleanup Job (Backend):**
```python
async def cleanup_abandoned_drafts(session):
    # 1. Mark as abandoned after 7 days
    seven_days_ago = now - timedelta(days=7)
    old_drafts = select(Draft).where(
        Draft.status == "incomplete",
        Draft.updated_at < seven_days_ago,
    )
    # Update status to "abandoned"

    # 2. Hard delete after 30 days
    thirty_days_ago = now - timedelta(days=30)
    expired_drafts = select(Draft).where(
        Draft.status == "abandoned",
        Draft.updated_at < thirty_days_ago,
    )
    # Delete from database
```

**Cleanup Configuration:**
- `DRAFT_ABANDON_DAYS: 7` - Mark abandoned after 7 days inactive
- `DRAFT_DELETE_DAYS: 30` - Hard delete after 30 days abandoned
- `ENABLE_DRAFT_CLEANUP: true` - Feature flag for cleanup job
- Run daily via cron (e.g., 3 AM)

**User-Initiated Cleanup:**
- Allow users to delete individual drafts
- "Delete All Drafts" button with confirmation
- Delete draft immediately after successful order confirmation

**Common Pitfalls:**

**Pitfall 1: Mixing Drafts and Orders**
- ❌ WRONG: `Order { status: "draft" | "pending" }`
- ✅ CORRECT: Separate `Draft` and `Order` entities

**Pitfall 2: Validating Drafts**
- ❌ WRONG: Validate draft data on save
- ✅ CORRECT: No validation for drafts (accepts any JSON)

**Pitfall 3: Saving on Every Keystroke**
- ❌ WRONG: Save immediately on every change
- ✅ CORRECT: Debounce with 3-second delay

**Pitfall 4: Not Cleaning Up Post-Confirmation**
- ❌ WRONG: Keep draft after order confirmed
- ✅ CORRECT: Delete draft after successful confirmation

**Pitfall 5: Auto-Loading Without Consent**
- ❌ WRONG: Load draft data automatically
- ✅ CORRECT: Prompt user before loading draft

**Best Practices Checklist:**
- [ ] Separate tables for drafts and orders
- [ ] No validation on draft save
- [ ] 3-second debounced autosave
- [ ] User ownership enforced (JWT)
- [ ] Timestamp updates on every save
- [ ] Recovery prompts on form load
- [ ] Age-based UX (recent vs old drafts)
- [ ] Multiple drafts list page
- [ ] Autosave status indicator
- [ ] Page unload save (best effort)
- [ ] Delete draft after confirmation
- [ ] Auto-abandon after 7 days
- [ ] Hard delete after 30 days
- [ ] Manual cleanup option
- [ ] URL with draft ID for bookmarking

## Outcome

- ✅ Impact: Established comprehensive draft management patterns ensuring data loss prevention through autosave, graceful recovery flows, and proper separation of draft/confirmed states in accordance with Constitution Principle III
- 🧪 Tests: None (draft management patterns)
- 📁 Files: Created .claude/skills/draft-autosave-pattern.md (889 lines)
- 🔁 Next prompts: Reference during order form implementation, validate autosave debouncing and recovery flows during first draft-enabled form
- 🧠 Reflection: Skill emphasizes critical principle that drafts and orders are SEPARATE entities (not order status variants), with comprehensive recovery UX patterns (age-based prompts), automatic cleanup strategy (7-day abandon, 30-day delete), and best practices to prevent common pitfalls (no validation, debounced saves, post-confirmation cleanup)

## Evaluation notes (flywheel)

- Failure modes observed: None (initial creation)
- Graders run and results (PASS/FAIL): Will be validated during first order form implementation with draft autosave and recovery flows
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Test debounced autosave (3-second delay), recovery prompt UX (recent vs old drafts), and cleanup job scheduling during first order form with draft support
