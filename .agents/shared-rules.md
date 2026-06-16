# Shared Rules — Cross-Cutting Engineering Policy

These rules apply to ALL agents. They are the non-negotiable baseline. Individual agents add domain-specific rules on top. Conflict resolution: stricter rule wins.

---

## 1. Tech Stack (Canonical)

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js | 16.x (App Router) |
| Runtime | React | 19.x |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| UI Components | shadcn/ui + Radix | latest |
| State | Zustand | 5.x |
| Database | Supabase (Postgres) | latest |
| Auth | Supabase Auth + Magic Tokens | latest |
| AI Primary | Gemini 3 Flash Preview | free tier |
| AI Fallback | OpenAI GPT-4o-mini | $0.15/1M |
| Validation | Zod | 4.x |
| Testing | Vitest + jsdom + @testing-library/react | latest |
| Async Jobs | Inngest | latest |
| Analytics | PostHog | latest |
| PWA | Serwist | latest |
| i18n | react-i18next + i18next | latest |

No new dependencies without explicit approval. Prefer built-in Next.js/React features.

---

## 2. Code Quality Gates (Mandatory)

Every change must pass:

```bash
npm run lint      # ESLint with next/core-web-vitals + next/typescript
npm run build     # Next.js build (catches type + runtime errors)
npm test -- --run # Vitest unit tests
```

If schema/migrations changed:
- Verify migration naming: `YYYYMMDDHHMMSS_description.sql`
- Verify CI workflow: `.github/workflows/supabase-migrations.yml`

---

## 3. File & Naming Conventions

### General
- Use kebab-case for files: `my-component.tsx`, `api-route.ts`
- Use PascalCase for React components: `function MyComponent() {}`
- Use camelCase for functions/variables: `const myVariable = ...`
- Use UPPER_SNAKE_CASE for constants: `const MAX_RETRY_COUNT = 3`

### Directories
- `src/app/` — Next.js App Router (pages, layouts, API routes)
- `src/components/` — React components (ui/, layout/, feature/)
- `src/lib/` — Business logic (ai/, auth/, channels/, supabase/, core/, utils/)
- `src/stores/` — Zustand stores
- `src/types/` — Shared TypeScript types
- `src/actions/` — Next.js Server Actions
- `src/hooks/` — Custom React hooks
- `supabase/migrations/` — Database migrations ONLY

### Imports
- Always use `@/` path alias: `import { cn } from '@/lib/utils'`
- Use barrel exports (`index.ts`) for clean imports
- Never use relative paths like `../../lib/utils`

---

## 4. Logging Policy

**NEVER use raw `console.log` / `console.error` in production code.**

Use the centralized logger:

```typescript
import { log, logError, logWarn, logDebug } from '@/lib/utils/logger';

log.info('Something happened');           // dev only
log.error('Something broke', err);        // always
log.warn('Something is suspicious');      // always
log.debug('Detailed state', { obj });     // dev only
```

The logger automatically:
- Suppresses info/debug in production
- Prefixes with `[MFB]` for filtering
- Keeps error/warn always visible for debugging

---

## 5. Error Handling

- Always fail closed for security-critical checks
- Use Zod for input validation before any side effects
- Return structured errors, not raw exceptions to users
- Log errors with context (userId, householdId, operation)

---

## 6. Security Baseline

- Verify webhook signatures in production (fails closed)
- Mask PII in logs (`+43***5678`)
- Use DB-enforced atomicity for shared writes
- Never commit secrets (use `.env.local`, never commit it)
- Service-role key is server-side ONLY

---

## 7. Performance Rules

- No N+1 queries — use `Promise.all()` or joins
- No in-memory state as source of truth
- Keep API routes under 100ms for simple ops
- Use React Server Components by default
- Client components only when interactivity is needed

---

## 8. i18n Rules

- All user-facing strings must use `t('key')` from i18n
- Update BOTH `src/lib/locales/en.json` and `src/lib/locales/de.json` in same PR
- Use locale-aware date-fns tokens (`P`, `PP`, `PPP`)
- Week starts are language-aware (de = Monday, en = Sunday)
- Avoid `language === 'de'`; use prefix checks for `de-AT`, `en-US`

---

## 9. Documentation Gate

For behavior changes in architecture/auth/security/data model/AI/CI:

- [ ] Evaluate documentation impact
- [ ] Update impacted source-of-truth docs in `docs/`
- [ ] Update `Last updated` dates
- [ ] Verify commands, model names, file paths
- [ ] Mark planned behavior clearly

---

## 10. Merge Blocking Criteria

Block merge if ANY of the following is true:
- Critical/High finding unresolved
- Migration policy violated
- CI quality gates failing
- Security-sensitive behavior undocumented
- Docs and implementation diverge
- Raw `console.*` statements in new code
- Missing i18n keys for new user-facing strings

---

Last updated: 2026-05-14
