# AI Tooling Rulebook

Canonical engineering rules for AI-assisted development in this repository.

## Scope

This rulebook defines standards for:

- AI-assisted code generation and edits
- Concurrency and race-condition safety
- Error handling and resilience
- Build/lint/test quality gates
- Documentation consistency and security hygiene

If any other document conflicts with this file, this file is the source of truth.

## Always

- Use `supabase/migrations/` as the canonical migration directory.
- Use atomic DB operations (`RPC`, `UPSERT`, unique constraints, row locks) for shared-state writes.
- Use idempotency keys for async/retried workflows.
- Validate AI outputs with Zod before applying side effects.
- Verify webhook authenticity before processing payloads.
- Normalize identities through `src/lib/supabase/identity.ts` (phone in E.164, normalized email).
- Keep AI prompts centralized in `src/lib/ai/prompts.ts` and `src/lib/ai/agents/vision-agent.ts`.
- Treat tokens/secrets as sensitive data and keep them out of docs/commits.
- Run `npm run lint`, `npm run build`, and `npm test -- --run` before shipping major changes.

## Never

- Never rely on in-memory maps for critical distributed guarantees (dedup, global rate-limit, ordering).
- Never bypass signature checks in production webhooks.
- Never store plaintext secrets in docs, examples, or tracked config.
- Never add schema-changing SQL outside canonical migrations.
- Never swallow errors silently for critical workflows (auth, payments, message delivery, sync).
- Never update docs with aspirational architecture without marking it as proposal/planned.

## Concurrency Rules

### Message Ingestion

- Deduplicate using DB uniqueness (`processed_messages`), not process memory.
- Queueing and sync processing must not cause duplicate side effects.
- If dual path exists (queue + immediate), idempotency and dedup are mandatory.

### Reminders

- Claim due reminders atomically with `FOR UPDATE SKIP LOCKED` or equivalent claim RPC.
- Complete by claim token to prevent cross-worker completion races.

### Event Writes

- Use unique fingerprints for create dedup.
- Use optimistic locking (`version`) for updates that can race.

### Google Sync

- Use distributed locks in DB for cross-instance sync exclusion.
- Keep in-memory in-flight maps only as local optimization, not correctness layer.

### Token Flows

- Consume magic/email tokens atomically in a single DB update.
- Short grace windows for browser prefetch are acceptable, but must be time-bounded.

## Error Handling Matrix

- `Webhook verification`: fail closed in production.
- `Rate limit service unavailable`: fail open only for non-security-critical user paths; log loudly.
- `AI parse failure`: fallback provider, then safe user-facing retry message.
- `External sync failure`: non-blocking for core user action; log and retry path.
- `DB write conflict`: handle explicitly (retry, return existing, or conflict response).

## Quality Gates

Minimum expected status:

- Lint: zero errors; warnings are tracked and intentionally accepted.
- Build: successful production `next build`.
- Tests: all tests pass.

Current baseline (2026-02-06):

- `npm run lint`: pass with 1 warning (`src/components/dashboard/today-widget.tsx`, unused var).
- `npm run build`: pass.
- `npm test -- --run`: pass (1 file, 2 tests).

## Consistency Rules

- Keep model names consistent across docs and code (`gemini-3-flash-preview`, `gpt-4o-mini`).
- Keep docs paths accurate (`docs/...` links from root README).
- Keep provider names consistent (`whatsapp_business`, `telegram`, `360dialog`).
- Keep API behavior statements aligned with implementation (for example, account-enumeration claims).
- Use one canonical terminology per concept ("Gateway", "Pipeline", "Brain", "Identity Resolution").

## Documentation Update Rules

Documentation is a release gate for major changes.

### Definition of Major Change

Any change affecting one or more of these areas is major:

- Architecture/runtime flow (Gateway, Pipeline, Brain, queues, retries)
- Data model, migrations, constraints, or DB RPC behavior
- AI providers/models/prompts/fallback strategy
- Auth/session/token/identity/security behavior
- Public API contract, webhook behavior, or onboarding flow
- Concurrency guarantees (dedup, locking, ordering, idempotency)

### Mandatory Policy

- Major changes must include documentation updates in the same PR.
- If docs are intentionally deferred, PR must include `DOCS_DEFERRED` with owner and due date (max 24h).
- "Code-only" merges are not allowed for major changes.

### PR Documentation Gate (Required)

Every PR must include this checklist section:

```md
## Documentation Gate
- [ ] I evaluated doc impact for this PR
- [ ] I updated all impacted docs (or this PR is truly no-doc-impact)
- [ ] I updated "Last updated" dates for changed docs
- [ ] I verified model/provider names and file paths are accurate
- [ ] I updated concurrency/race-condition notes when behavior changed
```

### Multi-Lens Major-Change Review (Required)

For every major change, AI-assisted review must be performed across these lenses:

- Senior auditor (security, privacy, compliance, abuse resistance)
- UI/UX expert (clarity, usability, accessibility, mobile behavior)
- Project manager (scope risk, rollout risk, operational readiness)
- Senior frontend engineer (hooks correctness, render performance, a11y)
- AI systems expert (prompt safety, fallback behavior, eval impact)

Required review sequence:

1. `Pass A - Audit`: identify bugs, race conditions, N+1 patterns, hook issues, and doc drift.
2. `Pass B - Fix`: implement prioritized fixes.
3. `Pass C - Re-Audit`: re-review from a different lens ordering and verify no regressions.

For major changes, PRs must include this checklist section:

```md
## Multi-Lens Review Gate
- [ ] Pass A completed (Auditor, UI/UX, PM, Frontend, AI)
- [ ] Pass B fixes implemented
- [ ] Pass C re-audit completed from a different viewpoint order
- [ ] Race conditions reviewed
- [ ] N+1 query/write patterns reviewed
- [ ] React hooks dependency and stale closure risks reviewed
```

### Canonical Ownership

- `README.md`: product-level overview and entry links only
- `docs/ARCHITECTURE.md`: runtime/data-flow/source-of-truth architecture
- `docs/AI_TOOLING_RULEBOOK.md`: engineering rules and delivery standards
- `docs/SECURITY.md`: security model, controls, incident contact
- `docs/MESSAGING_CHANNELS.md`: channel-specific behavior and operational differences

Avoid duplicating normative rules across files. Link back to canonical docs.

### Drift Prevention Cadence

- Monthly: 30-minute docs drift review for critical docs above.
- Release day: quick link/model/path verification pass.
- Post-incident: update relevant docs within 24h.

- Update these files together when behavior changes:
  - `README.md`
  - `docs/ARCHITECTURE.md`
  - `docs/DEVELOPER_GUIDE.md`
  - `docs/PROJECT_INFO.md`
  - `docs/SECURITY.md`
  - `docs/MESSAGING_CHANNELS.md`
  - `docs/AI_TOOLING_RULEBOOK.md`
- Mark proposal-only content explicitly as "Planned" or "Design".
- Add a "Last updated" date when major behavior changes.

## Security Documentation Hygiene

- Use placeholders in setup docs (`<token>`, `<phone_id>`), never real values.
- Do not include internal project/org IDs from deployment metadata.
- Keep incident contact current in `docs/SECURITY.md`.

## Recommended Follow-up Fixes (Code)

- Normalize `check_rate_limit` RPC result handling in `src/lib/core/rate-limit.ts` to match Supabase return shape.
- Enforce one migration location and move or deprecate `src/lib/supabase/migrations/*`.
- Decide on Telegram webhook processing strategy (queue-only vs sync-only) and document exact idempotency guarantee.
- Implement explicit sequence enforcement if per-user ordering is required end-to-end.

---

Last updated: 2026-02-06
