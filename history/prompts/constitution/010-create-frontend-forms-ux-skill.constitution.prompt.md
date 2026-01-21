---
id: 010
title: Create Frontend Forms & UX Skill
stage: constitution
date: 2026-01-16
surface: agent
model: claude-sonnet-4-5
feature: none
branch: master
user: system
command: manual
labels: ["skill", "forms", "validation", "ux", "react-hook-form", "zod"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - .claude/skills/frontend-forms-ux.md
tests:
  - None
---

## Prompt

Create a skill named "Frontend Forms & UX".

Includes:
- Complex form handling
- Validation
- Debounced autosave
- Error and loading states

Create at:
.claude/skills/frontend-forms-ux.md

## Response snapshot

Created mandatory Frontend Forms & UX skill at `.claude/skills/frontend-forms-ux.md`.

The skill defines comprehensive form handling and UX patterns for KN KITCHEN:

**Core Principles:**
1. Client + Server Validation - Validate on client for UX, on server for security
2. Progressive Disclosure - Show errors as user completes fields
3. Immediate Feedback - Validate on blur, not on every keystroke
4. Autosave Drafts - Save work in progress automatically
5. Accessible - Proper labels, ARIA attributes, keyboard navigation

**1. Complex Form Handling:**

**React Hook Form Setup:**
- Use `useForm` with Zod resolver for validation
- Register fields with `{...register("field")}`
- Access errors via `formState.errors`
- `mode: "onBlur"` - validate when field loses focus
- `reValidateMode: "onChange"` - re-validate on change after first error

**Nested Fields (Dynamic Arrays):**
- Use `useFieldArray` for dynamic line items
- `fields.map()` to render items
- `append()` to add new item
- `remove(index)` to delete item
- Validation for array-level and item-level

**Basic Form Pattern:**
```typescript
const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
  resolver: zodResolver(schema),
  mode: "onBlur",
});

<input {...register("name")} />
{errors.name && <p>{errors.name.message}</p>}
```

**2. Validation:**

**Zod Schemas:**
- Define schemas with `.min()`, `.max()`, `.email()`, etc.
- Custom validators with `.refine()`
- Cross-field validation
- Infer TypeScript types: `type FormData = z.infer<typeof schema>`

**Real-Time Validation:**
- `mode: "onBlur"` - validate on blur (UX-friendly)
- Show errors only if field `touchedFields[field]` is true
- Re-validate on change after first error shown

**Server-Side Validation:**
- Pydantic validates in FastAPI backend
- Custom validators with `@validator`
- Return 422 status with detailed errors
- Frontend displays server errors via `setError(field, { message })`

**Error Handling:**
```typescript
try {
  const response = await fetch(...);
  if (!response.ok) {
    const error = await response.json();
    error.errors?.forEach(err => {
      setError(err.loc[1], { message: err.msg });
    });
  }
} catch (error) {
  setServerError("Network error");
}
```

**3. Debounced Autosave:**

**useAutosave Hook:**
- Custom hook with debounce delay (default 2 seconds)
- Watches form data changes with `JSON.stringify` comparison
- `setTimeout` to delay save
- Clear previous timeout on new change
- Prevent concurrent saves with ref flag

**Autosave Integration:**
```typescript
const formData = watch(); // Watch all fields
useAutosave({
  data: formData,
  onSave: handleAutosave,
  delay: 3000,
  enabled: true,
});
```

**Autosave Indicator:**
- Show "Saving..." with spinner during save
- Show "Saved Xm ago" after successful save
- Track `lastSaved` timestamp

**Draft Recovery:**
- Check for existing drafts on mount
- Prompt user: "Recover Draft" or "Start Fresh"
- Load draft data into form on recovery
- Delete draft on discard

**4. Error and Loading States:**

**Loading States:**
- `isSubmitting` from `formState`
- Disable submit button during submission
- Show spinner icon and "Processing..." text
- Prevent double-submission

**Skeleton Loading:**
- Animate pulse on gray rectangles
- Show while form data loads (edit mode)
- Use with Suspense boundaries

**Error Messages:**
- Field-level errors below inputs
- Red border on invalid fields
- `aria-invalid` and `aria-describedby` for accessibility
- General errors in banner at top

**Success Feedback:**
- Toast notification component
- Auto-dismiss after 3 seconds
- Types: success, error, info
- Fixed position (top-right or bottom-right)

**Form State Indicator:**
- Fixed position indicator showing form validity
- Green checkmark if valid
- Red X if invalid (with errors)
- Only show if form is dirty (`isDirty`)

**Components Provided:**
- `SubmitButton`: Loading state with spinner
- `OrderFormSkeleton`: Skeleton UI
- `ErrorMessage`: Error display with retry
- `Toast`: Success/error notifications
- `FormStateIndicator`: Real-time validation feedback

**Best Practices Checklist:**
- [ ] React Hook Form for state management
- [ ] Zod schemas for validation
- [ ] onBlur mode (validate on blur)
- [ ] useFieldArray for dynamic fields
- [ ] Server-side validation (backend)
- [ ] Field-specific error display
- [ ] ARIA attributes for accessibility
- [ ] Required field indicators (asterisk)
- [ ] Debounced autosave (2-3 seconds)
- [ ] Draft recovery prompt
- [ ] Loading states on buttons
- [ ] Success feedback (toast)
- [ ] Clear error messages
- [ ] Skeleton UI while loading

## Outcome

- ✅ Impact: Established comprehensive form handling patterns ensuring data integrity through dual validation, excellent UX with autosave and progressive disclosure, and clear feedback for all user actions
- 🧪 Tests: None (UX patterns and components)
- 📁 Files: Created .claude/skills/frontend-forms-ux.md (689 lines)
- 🔁 Next prompts: Reference during form implementation, validate patterns in code reviews
- 🧠 Reflection: Skill covers complex scenarios (nested arrays, autosave, draft recovery) that are critical for KN KITCHEN's order management forms, with strong emphasis on accessibility and user feedback

## Evaluation notes (flywheel)

- Failure modes observed: None (initial creation)
- Graders run and results (PASS/FAIL): Will be validated during first form implementation (order form, customer form)
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Test autosave debouncing and draft recovery during order form implementation
