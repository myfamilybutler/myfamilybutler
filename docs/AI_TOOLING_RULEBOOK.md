# AI Tooling Rulebook

Canonical engineering rules for AI-assisted development in this repository.

This rulebook is aligned with the shared baseline at `AI_GLOBAL_RULES.md` (workspace root) and defines MyFamilyButler-specific constraints.

## Scope

This file governs:

- AI-assisted code generation and edits
- Concurrency and race-condition safety
- Security and secret hygiene
- Quality gates (lint/build/test)
- Documentation consistency

If another project doc conflicts with this file, this file is the source of truth.

## Tech Stack Reality

- Framework: Next.js 16
- Backend: Supabase
- Async jobs: Inngest
- AI: Gemini (`gemini-3-flash-preview`) with OpenAI fallback (`gpt-4o-mini`)
- Channels: WhatsApp, Telegram, 360dialog

## Canonical Ownership

- Product overview and links: `README.md`
- Runtime architecture: `docs/ARCHITECTURE.md`
- Developer patterns: `docs/DEVELOPER_GUIDE.md`
- Security controls and incident notes: `docs/SECURITY.md`
- Channel behavior and operations: `docs/MESSAGING_CHANNELS.md`
- This rulebook: `docs/AI_TOOLING_RULEBOOK.md`

Avoid duplicating normative rules across docs. Link to canonical docs.

## Always

- Use `supabase/migrations/` as the canonical migration path.
- Use DB-enforced atomic operations for shared-state writes (RPC, unique constraints, locks, upsert).
- Use idempotency keys for retried async workflows.
- Validate AI outputs with Zod before side effects.
- Verify webhook authenticity before processing payloads.
- Normalize identities using canonical identity utilities.
- Keep prompts centralized in `src/lib/ai/prompts.ts` and `src/lib/ai/agents/vision-agent.ts`.
- Keep model names consistent across docs and code (`gemini-3-flash-preview`, `gpt-4o-mini`).
- Run quality gates before shipping meaningful behavior changes.

## Never

- Never rely on in-memory structures for distributed correctness.
- Never bypass signature checks in production webhook paths.
- Never commit plaintext secrets, private IDs, or live credentials in docs.
- Never add schema-changing SQL outside canonical migrations.
- Never silently swallow critical workflow errors (auth, delivery, sync, persistence).
- Never document planned behavior as active implementation.

## Concurrency Rules

### Message ingestion

- Dedup via DB constraints (not process memory).
- If multiple paths can process the same message, idempotency and dedup are mandatory.

### Reminders

- Claim due reminders atomically (`FOR UPDATE SKIP LOCKED` or equivalent claim RPC).
- Complete by claim token or equivalent ownership guard.

### Event writes

- Use unique fingerprints for create dedup.
- Use optimistic locking (`version`) when concurrent updates are possible.

### Google sync and token flows

- Use distributed lock semantics for cross-instance exclusion.
- Consume one-time tokens atomically in a single DB operation.
- Any grace window must be explicitly bounded and documented.

## Error Handling Matrix

- Webhook verification failure: fail closed in production.
- Rate-limit service unavailable: fail open only for non-security-critical paths; log loudly.
- AI parse failure: fallback provider, then safe retry message.
- External sync failure: non-blocking for core user action; log and retry.
- DB conflict/write contention: explicit retry or conflict response.

## Quality Gates

Minimum expected status:

- Lint: zero errors
- Build: successful `next build`
- Tests: all tests pass

Standard commands:

- `npm run lint`
- `npm run build`
- `npm test -- --run`

## Documentation Gate (Required)

Major changes require docs updates in the same change.

Definition of major change:

- Architecture/runtime flow
- Data model/migration/constraint/RPC behavior
- AI provider/model/prompt/fallback strategy
- Auth/session/token/security behavior
- Public API/webhook/onboarding behavior
- Concurrency guarantees (dedup, locking, idempotency, ordering)

Required checklist:

```md
## Documentation Gate
- [ ] I evaluated doc impact for this PR
- [ ] I updated all impacted docs (or this PR is truly no-doc-impact)
- [ ] I updated "Last updated" dates for changed docs
- [ ] I verified model/provider names and file paths are accurate
- [ ] I updated concurrency/race-condition notes when behavior changed
```

## Multi-Role Review Gate (Required for Major Changes)

Major changes include new features, major refactors, core/shared component changes, and architecture changes.

Required lenses:

- Senior auditor (security/privacy/abuse resistance)
- UI/UX expert (clarity/accessibility/mobile behavior)
- Senior frontend engineer (hooks/render/performance)
- Senior backend engineer (data correctness/concurrency/API behavior)
- Project manager (scope/rollout/operational risk)
- Architect (system boundaries/source-of-truth decisions)
- Performance engineer (latency/render cost/query efficiency)
- AI systems expert (prompt safety/fallback/eval impact)

Required sequence:

1. Pass A - Audit
2. Pass B - Fix
3. Pass C - Re-audit from different lens order
4. Repeat Pass B and Pass C until no Critical/High findings remain

Required artifact:

- Maintain a review report using `docs/MULTI_ROLE_REVIEW_TEMPLATE.md`.
- Keep findings mapped to IDs through Pass A/B/C loops.
- Record final decision and follow-up owners/dates.

Severity policy:

- Critical/High: must be fixed before merge
- Medium: fix now or track with owner and due date
- Low: backlog allowed with rationale

Required checklist:

```md
## Multi-Role Review Gate
- [ ] Pass A completed (Auditor, UI/UX, Frontend, Backend, PM, Architect, Performance, AI)
- [ ] Pass B fixes implemented
- [ ] Pass C re-audit completed from a different viewpoint order
- [ ] No Critical/High findings remain
- [ ] Race conditions reviewed
- [ ] N+1 query/write patterns reviewed
- [ ] React hooks dependency and stale closure risks reviewed
```

## Documentation Drift Prevention

- Monthly: docs drift review for canonical docs.
- Release day: quick pass for links/model names/file paths.
- Post-incident: update relevant docs within 24h.

When behavior changes, evaluate all of:

- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/DEVELOPER_GUIDE.md`
- `docs/PROJECT_INFO.md`
- `docs/SECURITY.md`
- `docs/MESSAGING_CHANNELS.md`
- `docs/AI_TOOLING_RULEBOOK.md`

## Security Documentation Hygiene

- Use placeholders in setup docs (`<token>`, `<phone_id>`, `<project_id>`).
- Do not include real account/project identifiers.
- Keep security contact current in `docs/SECURITY.md`.

## Template Notes (for Other Projects)

This file is used as a template baseline for other repos. When adapting:

- Keep only framework-relevant rules (do not copy webhook/inngest rules blindly).
- Preserve core sections (Always/Never, Concurrency, Quality Gates, Doc Gate).
- Replace runtime-specific details with project-specific ownership and commands.

---

Last updated: 2026-02-07
