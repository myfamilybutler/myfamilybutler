# Security Documentation

Canonical reading order: `docs/INDEX.md`.

## Overview

My Family Butler implements security measures appropriate for a consumer-facing
family app with plans to scale to 10K+ users.

For engineering execution standards (always/never, concurrency patterns, quality
gates), see `docs/AI_TOOLING_RULEBOOK.md`.

For AI delivery lifecycle and role loops, see `docs/AI_OPERATING_MODEL.md`.

## Authentication

### Session Management

- **Custom Sessions**: HTTP-only, secure cookies with 90-day expiration (magic/invite) and shorter durations for other flows (7–60 days)
- **Session Format**: UUID-based user IDs with format validation
- **Logout**: Clear endpoint at `/api/auth/logout` for session invalidation

### Magic Link Authentication

Used for passwordless login from messaging channels:

- **Token generation**: 32-byte random token, SHA-256 hashed before storage
- **Expiration**: 15 minutes from generation
- **One-time use**: Token consumed atomically on first use
- **Grace period**: 30-second window handles browser prefetch protection
- **Delivery**: Embedded in URL buttons (WhatsApp CTA, Telegram inline keyboard)
- **Fallback**: Text message with plain link if button API fails

### OAuth (Google Calendar)

- Standard OAuth 2.0 flow
- Tokens stored in database (service-role access only)
- Automatic token refresh with deduplication

## API Security

### Webhook Verification

- **WhatsApp**: HMAC-SHA256 signature verification (required in production)
- **Telegram**: Secret token verification
- Timing-safe comparisons to prevent timing attacks
- Message deduplication prevents replay attacks

### Input Validation

- Phone number normalization with format validation
- UUID format validation on all user IDs
- Message length limits to prevent abuse

## Development Security

### Dev-Only Endpoints

- `/api/auth/dev-login`: Returns 404 in production (checked before any
  processing)
- Environment-based feature flags

### Secrets Management

- All secrets in environment variables
- `.env*` files excluded from git
- Service role key separated from anon key
- CI secrets for migration automation are stored in GitHub repository secrets
  (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`)

## Threat Model

### Current Protections

| Threat            | Mitigation                                    |
| ----------------- | --------------------------------------------- |
| Webhook spoofing  | Signature verification (fails closed in prod) |
| Session hijacking | HTTP-only, secure cookies                     |
| Injection attacks | UUID validation, parameterized queries        |
| Replay attacks    | Message deduplication                         |

### Planned Improvements (Phase 2)

| Threat              | Planned Mitigation                              |
| ------------------- | ----------------------------------------------- |
| API abuse           | Centralized rate limiting (Redis/Upstash)       |
| Credential stuffing | Rate limiting + monitoring                      |
| Breach detection    | Audit logging + anomaly alerts                  |
| In-memory state     | Move conversation state + dedup to shared store |

### Accepted Risks

| Risk                          | Rationale                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------- |
| Service role has broad access | Mitigated by server-side only usage. Full RLS migration planned for 10K+ scale. |
| OAuth tokens in plaintext     | Database access requires breach. Supabase provides storage encryption.          |

## Incident Response

### If Service Role Key is Compromised

1. Immediately rotate key in Supabase dashboard
2. Update environment variables in Vercel
3. Review audit logs for unauthorized access
4. Notify affected users if data was accessed

### If User Reports Unauthorized Access

1. Force logout via `/api/auth/logout` (user-initiated)
2. Review message logs for that user
3. Reset any connected OAuth tokens

## Security Contacts

For security issues, contact: myfamilybutler@gmail.com

_Last updated: 2026-02-08_
