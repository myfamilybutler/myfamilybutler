# Multi-Role Review Report Template

Use this for major changes (new features, major refactors, shared component rewrites, architecture-impacting updates, migrations, auth/security changes).

## Change Metadata

- Change title:
- Scope:
- Risk level: Low / Medium / High
- Reviewer/owner:
- Date:
- PR/commit reference:

## Pass A - Audit (All Roles)

### Security Auditor
- Findings:
- Severity:
- Evidence:
- Checklist: authn/authz, secret handling, signature verification, abuse/replay vectors

### Frontend Engineer
- Findings:
- Severity:
- Evidence:
- Checklist: hooks correctness, state boundaries, stale closure risks, render behavior

### UX/UI Engineer
- Findings:
- Severity:
- Evidence:
- Checklist: accessibility, clarity, empty/error states, mobile behavior

### Backend Engineer
- Findings:
- Severity:
- Evidence:
- Checklist: schema correctness, transaction safety, idempotency, conflict handling

### Performance Engineer
- Findings:
- Severity:
- Evidence:
- Checklist: N+1 risk, query cost, payload size, render cost, latency

### Architect
- Findings:
- Severity:
- Evidence:
- Checklist: source-of-truth boundaries, coupling, maintainability, consistency

### Program/Risk Manager
- Findings:
- Severity:
- Evidence:
- Checklist: rollout risk, migration risk, operational readiness, blast radius

### AI Systems Engineer
- Findings:
- Severity:
- Evidence:
- Checklist: prompt safety, fallback behavior, output validation, failure handling

## Findings Register

| ID | Role | Severity | Finding | Owner | Target Fix Date | Status |
| --- | --- | --- | --- | --- | --- | --- |
| F-001 |  | Critical/High/Medium/Low |  |  |  | Open |

## Pass B - Fix Plan and Execution

- Prioritization order:
- Fixes implemented (map to finding IDs):
- Deferred findings with rationale (Medium/Low only):

## Pass C - Re-Audit (Different Role Order)

- New role order used:
- Regression checks:
- Remaining findings:

## Repeat Loop Status

- Additional B/C cycles executed:
- Critical findings remaining: 0
- High findings remaining: 0

## Mandatory Engineering Checks

- [ ] Race conditions reviewed
- [ ] N+1 query/write patterns reviewed
- [ ] Logic edge cases reviewed
- [ ] Infinite loop risks reviewed
- [ ] Hook dependency and stale closure risks reviewed
- [ ] State ownership boundaries respected (server vs local)

## Verification Commands

- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `npm test -- --run`
- [ ] Migration workflow checked (if schema changed)

## Documentation Gate

- [ ] `docs/INDEX.md` impact reviewed
- [ ] Source-of-truth docs updated in same change
- [ ] `Last updated` dates refreshed
- [ ] Planned behavior marked clearly

## Final Decision

- Decision: Approve / Approve with follow-ups / Block
- Approval rationale:
- Follow-up items (owner + due date):

---

Last updated: 2026-02-08
