# Multi-Role Review Report Template

Use this for major changes: new features, major refactors, shared component rewrites, and architecture-impacting changes.

## Change Metadata

- Change title:
- Scope:
- Risk level: Low / Medium / High
- Reviewer/owner:
- Date:

## Pass A - Audit (All Roles)

### UX/UI Engineer
- Findings:
- Severity:
- Evidence:
- Checklist: accessibility, clarity, empty/error states, mobile responsiveness, design consistency

### Frontend Engineer
- Findings:
- Severity:
- Evidence:
- Checklist: hooks correctness, state boundaries, re-render risks, component composition

### Backend Engineer
- Findings:
- Severity:
- Evidence:
- Checklist: API contracts, data validation, transaction safety, retries/idempotency

### Project Manager
- Findings:
- Severity:
- Evidence:
- Checklist: scope risk, rollout risk, migration risk, operational readiness

### Architect
- Findings:
- Severity:
- Evidence:
- Checklist: source-of-truth boundaries, coupling, long-term maintainability, consistency

### Security Auditor
- Findings:
- Severity:
- Evidence:
- Checklist: authz/authn, secret exposure, injection risk, abuse/replay vectors

### Performance Engineer
- Findings:
- Severity:
- Evidence:
- Checklist: render cost, query efficiency, N+1 risk, payload/bundle cost, latency

## Findings Register

| ID | Role | Severity | Finding | Owner | Target Fix Date | Status |
| --- | --- | --- | --- | --- | --- | --- |
| F-001 |  | Critical/High/Medium/Low |  |  |  | Open |

## Pass B - Fix

- Fixes mapped to finding IDs:
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

## Verification

- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `npm test -- --run`

## Final Decision

- Decision: Approve / Approve with follow-ups / Block
- Approval rationale:
- Follow-up items (owner + due date):
