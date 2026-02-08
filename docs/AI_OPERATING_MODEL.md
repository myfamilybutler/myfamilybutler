# AI Operating Model

Principal-level operating model for AI-assisted delivery in this repository.

## Goal

Enable reliable autonomous loops:
- AI agent implements
- AI reviewers audit from multiple roles
- AI fixer resolves findings
- AI verifier rechecks
- Repeat until merge criteria pass

## Role System

Minimum roles for major changes:

1. `Implementation Agent`
- Writes code and migrations
- Updates docs in the same change

2. `Security Auditor Agent`
- Verifies auth, secrets handling, webhook signature paths, abuse vectors

3. `Frontend Quality Agent`
- Verifies UX behavior, state boundaries, hooks correctness, accessibility

4. `Backend Correctness Agent`
- Verifies schema changes, constraints, idempotency, transactional behavior

5. `Performance Agent`
- Verifies render/query cost and N+1 risks

6. `Architecture Agent`
- Verifies source-of-truth boundaries and coupling

7. `Program/Risk Agent`
- Verifies rollout risk, migration risk, and operational readiness

8. `AI Systems Agent`
- Verifies prompt safety, model fallback behavior, structured output validation

## Delivery Loop

### Loop A: Build

1. Classify risk (`low`, `medium`, `high`).
2. Implement smallest valid change.
3. Run required checks.

### Loop B: Multi-Role Audit (major changes only)

1. Run Pass A audit with all required roles.
2. Record findings in `docs/MULTI_ROLE_REVIEW_TEMPLATE.md`.
3. Fix in severity order.
4. Run Pass C re-audit with a different role order.
5. Repeat until no Critical/High findings remain.

### Loop C: Release Gate

Merge only when:
- quality gates pass
- no unresolved Critical/High findings
- documentation gate passes
- migration and rollback risks are explicitly documented

## Trigger Matrix

Use multi-role loop when a change touches:
- `supabase/migrations/**`
- auth/session/magic-token/webhook code
- AI provider, parsing schema, prompt, fallback logic
- core gateway/pipeline orchestration
- shared UI components or major UX flow
- CI/CD or deployment workflows

## Evidence Requirements

Each major PR must include:
- changed files summary
- risk summary
- command results (`lint`, `build`, `test`, migration checks)
- filled multi-role report artifact
- docs updated list
- if introducing cross-cutting implementation rules, update `docs/AI_TOOLING_RULEBOOK.md` in the same PR

## Non-Negotiable Policies

- No interactive prompts in CI steps.
- No manual production SQL as normal workflow.
- No schema-changing SQL outside `supabase/migrations/`.
- No secret values in docs or committed files.
- No merge with unresolved Critical/High findings.

## Automation Targets

- All migrations run from GitHub Actions.
- All major changes produce machine-reviewable evidence.
- Documentation is maintained as executable policy for AI agents.

---

Last updated: 2026-02-08
