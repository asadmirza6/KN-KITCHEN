---
name: Spec-Driven Development
description: Enforces spec-first workflow for all code changes
scope: mandatory
applies_to: all
---

# Spec-Driven Development

**Status**: MANDATORY - All agents MUST follow this workflow

## Core Rule

**NO CODE MAY BE WRITTEN WITHOUT A CORRESPONDING SPEC.**

This is a non-negotiable requirement for the KN KITCHEN project. Any code implementation, feature addition, bug fix, or modification MUST have a corresponding specification document before a single line of code is written.

## Governance Hierarchy

The following hierarchy defines authority and override rules:

```
Constitution (.specify/memory/constitution.md)
    ↓ overrides
Specifications (specs/<feature>/spec.md)
    ↓ overrides
Plans (specs/<feature>/plan.md)
    ↓ overrides
Tasks (specs/<feature>/tasks.md)
    ↓ overrides
Code Implementation
```

**Critical Rules:**
- Constitution ALWAYS overrides specs, plans, tasks, and code
- If a spec contradicts the constitution, the constitution wins
- Changes to specs that violate constitution are PROHIBITED
- Code that contradicts its spec is a defect and MUST be corrected

## When This Skill Applies

This skill is ALWAYS ACTIVE for:

1. **New Feature Requests**: User asks to add functionality
2. **Bug Fixes**: User reports a bug or requests a fix
3. **Refactoring**: User asks to restructure or improve existing code
4. **Architecture Changes**: User proposes technical changes
5. **Configuration Changes**: User requests infrastructure or deployment changes
6. **Any Code Modification**: User asks to modify, add, or remove code

## Workflow Enforcement

### For New Features

```
User Request
    ↓
❌ BLOCK: Do NOT write code
    ↓
✅ Create spec.md using /sp.specify
    ↓
Get user approval of spec
    ↓
✅ Create plan.md using /sp.plan
    ↓
Get user approval of plan
    ↓
✅ Create tasks.md using /sp.tasks
    ↓
Get user approval of tasks
    ↓
✅ NOW write code using /sp.implement
```

### For Bug Fixes

```
User Reports Bug
    ↓
Find existing spec for affected feature
    ↓
Does spec cover this scenario?
    ├─ YES: Spec is correct, code is defective → Fix code
    └─ NO: Spec is incomplete → Update spec FIRST, then fix code
```

### For Refactoring

```
User Requests Refactoring
    ↓
❌ BLOCK: Do NOT refactor code
    ↓
✅ Create/update spec describing desired structure
    ↓
✅ Create/update plan with refactoring approach
    ↓
Get user approval
    ↓
✅ NOW refactor code
```

### For Spec Changes

```
User Requests Feature Change
    ↓
Locate spec for affected feature
    ↓
✅ Update spec.md FIRST
    ↓
✅ Update plan.md if architecture changes
    ↓
✅ Update tasks.md if task breakdown changes
    ↓
Get user approval of spec changes
    ↓
✅ NOW modify code
```

## Required Checks Before Writing Code

Before writing ANY code, agents MUST verify:

- [ ] **Spec Exists**: Is there a spec.md for this feature in `specs/<feature>/spec.md`?
- [ ] **Spec is Current**: Does the spec describe the requested change?
- [ ] **Spec is Approved**: Has the user reviewed and approved the spec?
- [ ] **Plan Exists**: Is there a plan.md with architectural decisions?
- [ ] **Plan is Approved**: Has the user reviewed and approved the plan?
- [ ] **Tasks Exist**: Is there a tasks.md breaking down the work?
- [ ] **Tasks are Approved**: Has the user reviewed and approved the tasks?
- [ ] **Constitution Check**: Does the spec comply with `.specify/memory/constitution.md`?

If ANY check fails, STOP and create/update the missing artifact.

## Agent Behavior Rules

### What Agents MUST Do

1. **Always Ask First**: If user requests code, ask "Should I create a spec first using /sp.specify?"
2. **Block Direct Code Requests**: If user says "write code for X", respond:
   ```
   I need to create a spec before writing code. Let me run /sp.specify to create
   the specification for this feature.
   ```
3. **Enforce Spec Updates**: If user asks to change existing code, verify spec is updated first
4. **Reference Constitution**: Always check that specs don't violate constitution principles
5. **Create PHRs**: After spec/plan/task creation, create Prompt History Records

### What Agents MUST NOT Do

1. **Never Write Spec-less Code**: Don't write code without a corresponding spec, even for "quick fixes"
2. **Never Assume Specs**: Don't assume what the spec should say - create it explicitly
3. **Never Skip Approval**: Don't proceed to code without user approval of spec/plan/tasks
4. **Never Violate Constitution**: Don't create specs that contradict constitution principles
5. **Never Update Code Without Spec**: Don't modify code without updating the spec first

## Exception Handling

### The ONLY Exceptions

The following are the ONLY cases where code may be written without a full spec:

1. **Emergency Hotfixes**: Critical production bugs with user explicitly saying "skip spec, emergency fix"
   - MUST create retro-spec documenting the fix within 24 hours
   - MUST create ADR explaining why spec was skipped

2. **Constitution Setup**: Initial project setup when constitution is being created
   - This is a one-time exception

3. **Trivial Changes**: ONLY if ALL of these are true:
   - Change is <5 lines
   - Change is in existing spec scope (e.g., fixing typo, adjusting spacing)
   - Change has zero business logic impact
   - User explicitly approves skipping spec

**WARNING**: Agents should be VERY conservative about claiming exceptions. When in doubt, create a spec.

## Spec Quality Standards

When creating specs, ensure:

- **Clarity**: Specs are written in clear, unambiguous language
- **Completeness**: All user scenarios are covered with acceptance criteria
- **Testability**: Every requirement can be independently tested
- **Traceability**: Specs reference constitution principles they comply with
- **Priority**: User stories are prioritized (P1, P2, P3) for incremental delivery

## Enforcement Mechanism

This skill is enforced through:

1. **Agent Instructions**: All agents receive this skill as mandatory context
2. **Tool Restrictions**: Agents are instructed to call /sp.specify before writing code
3. **Code Review**: Human reviewers verify code has corresponding specs
4. **Constitution**: The constitution mandates "Spec First" workflow
5. **Automated Checks**: CI/CD can verify spec exists for changed code (future)

## Example Interactions

### ✅ CORRECT: Spec-First Approach

```
User: "Add a feature to export orders as CSV"

Agent: "I'll create a spec for the CSV export feature before writing any code.
Let me run /sp.specify to create the specification."

[Agent creates spec]

User: "Looks good"

Agent: "Now I'll create the implementation plan using /sp.plan"

[Agent creates plan]

User: "Approved"

Agent: "Now I'll break this into tasks using /sp.tasks"

[Agent creates tasks]

User: "Go ahead"

Agent: "Now I'll implement the code following the approved spec, plan, and tasks."
```

### ❌ INCORRECT: Code-First Approach

```
User: "Add a feature to export orders as CSV"

Agent: "I'll create a CSV export endpoint in the backend..."
[Starts writing code]

❌ VIOLATION: No spec was created or approved first
```

### ✅ CORRECT: Spec Update Before Code Change

```
User: "Change the order confirmation flow to require manager approval"

Agent: "This changes the business logic described in specs/order-management/spec.md.
I need to update that spec first to reflect the new approval requirement.
Let me update the spec."

[Agent updates spec.md]

User: "Approved"

Agent: "Now I'll update the implementation to match the revised spec."
```

### ❌ INCORRECT: Code Change Without Spec Update

```
User: "Change the order confirmation flow to require manager approval"

Agent: "I'll modify the confirmation endpoint to add manager approval..."
[Starts changing code]

❌ VIOLATION: Spec was not updated to reflect the new requirement
```

## Integration with Other Skills

This skill interacts with:

- **Constitution**: Specs must comply with constitutional principles
- **Test-Driven Development**: Tests are written during task execution, after specs are approved
- **ADR Creation**: Architectural decisions in plans may trigger ADR creation
- **Code Review**: Reviewers verify spec-code alignment

## Success Metrics

Spec-Driven Development is successful when:

- ✅ Every feature has a corresponding spec.md before code exists
- ✅ Code changes are preceded by spec updates
- ✅ Specs are kept in sync with implementation
- ✅ Constitution compliance is verified in every spec
- ✅ User approval is obtained at each stage (spec → plan → tasks → code)

## Failure Modes to Avoid

Common violations to watch for:

1. **Cowboy Coding**: Writing code directly from user request without spec
2. **Spec Debt**: Implementing feature, planning to "spec it later" (never happens)
3. **Spec Drift**: Code diverges from spec over time without spec updates
4. **Constitution Violations**: Specs that contradict constitutional principles
5. **Approval Skipping**: Moving from spec to code without user review

## Reference Documents

- Constitution: `.specify/memory/constitution.md`
- Spec Template: `.specify/templates/spec-template.md`
- Plan Template: `.specify/templates/plan-template.md`
- Tasks Template: `.specify/templates/tasks-template.md`
- CLAUDE.md: Runtime guidance for agents

---

**Remember**: Spec-Driven Development exists to prevent wasted effort, ensure alignment, and maintain system integrity. The few minutes spent creating a spec saves hours of rework from building the wrong thing.
