---
id: 002
title: Create Spec-Driven Development Skill
stage: constitution
date: 2026-01-16
surface: agent
model: claude-sonnet-4-5
feature: none
branch: master
user: system
command: manual
labels: ["skill", "governance", "workflow", "spec-driven-development"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - .claude/skills/spec-driven-development.md
tests:
  - None
---

## Prompt

Create a skill named "Spec-Driven Development".

This skill enforces that:
- No code is written without a corresponding spec
- Specs are the source of truth
- Changes require spec updates first
- Constitution overrides all specs

This skill is mandatory for all agents.

Create at:
.claude/skills/spec-driven-development.md

## Response snapshot

Created mandatory Spec-Driven Development skill at `.claude/skills/spec-driven-development.md`.

The skill enforces the following workflow:

**Core Rule**: NO CODE MAY BE WRITTEN WITHOUT A CORRESPONDING SPEC

**Governance Hierarchy**:
```
Constitution → Specs → Plans → Tasks → Code
```

**Workflow Enforcement**:
- New Features: spec.md → plan.md → tasks.md → code
- Bug Fixes: Check if spec covers scenario → Update spec if needed → Fix code
- Refactoring: Update spec → Update plan → Get approval → Refactor
- Spec Changes: Update spec → Update plan → Update tasks → Modify code

**Required Checks Before Code**:
- [ ] Spec exists and is current
- [ ] Spec is approved by user
- [ ] Plan exists and is approved
- [ ] Tasks exist and are approved
- [ ] Constitution compliance verified

**Agent Behavior Rules**:
- MUST ask to create spec before writing code
- MUST block direct code requests and redirect to /sp.specify
- MUST enforce spec updates before code changes
- MUST reference constitution for compliance
- MUST create PHRs after spec/plan/task creation

**Exceptions** (VERY LIMITED):
1. Emergency hotfixes (with retro-spec required)
2. Constitution setup (one-time)
3. Trivial changes <5 lines with zero business logic impact

**Success Metrics**:
- Every feature has spec.md before code
- Code changes preceded by spec updates
- Constitution compliance in all specs
- User approval at each stage

The skill integrates with the constitution's "Spec First" principle and provides concrete enforcement mechanisms for all agents working on KN KITCHEN.

## Outcome

- ✅ Impact: Established mandatory workflow enforcement preventing code-first development, ensuring all changes are spec-driven and constitution-compliant
- 🧪 Tests: None (governance skill)
- 📁 Files: Created .claude/skills/spec-driven-development.md (243 lines)
- 🔁 Next prompts: First feature implementation will test this workflow, /sp.specify to create first feature spec
- 🧠 Reflection: Skill provides clear guardrails and examples for agents, preventing common violations like cowboy coding and spec drift

## Evaluation notes (flywheel)

- Failure modes observed: None (initial creation)
- Graders run and results (PASS/FAIL): Will be validated during first feature implementation
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Test enforcement during first /sp.specify → /sp.plan → /sp.tasks → /sp.implement workflow
