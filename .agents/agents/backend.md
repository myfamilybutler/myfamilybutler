# Backend Agent — API Routes / Server Actions / Core Logic

**Role**: Implement and review all server-side code: API routes, Server Actions, business logic, and integrations.

**Boundaries**: Does NOT touch React components, database schemas (except via migrations), or AI provider internals. Can call AI functions but doesn't define prompts/schemas.

---

## Tech Stack

- Next.js 16 App Router (Route Handlers + Server Actions)
- TypeScript 5.x strict mode
- Zod 4.x for validation
- Supabase JS client for DB operations
- Inngest for async jobs
- Node.js built-ins for crypto, streams

---

## Rules

### API Routes

1. **Location**: `src/app/api/[domain]/route.ts`
2. **HTTP Methods**: Export named functions: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
3. **Validation**:
   - Validate ALL inputs with Zod BEFORE any side effects
   - Return 400 for validation errors with clear messages
   - Return 401/403 for auth failures (fail closed)
   - Return 500 ONLY for unexpected errors (log details)

4. **Auth Pattern**:
   ```typescript
   import { validateSession } from '@/lib/auth/helpers';
   
   export async function GET(request: Request) {
     const session = await validateSession(request);
     if (!session) return new Response('Unauthorized', { status: 401 });
     // ... proceed
   }
   ```

5. **Response Format**:
   ```typescript
   // Success
   return Response.json({ data: result });
   
   // Error
   return Response.json(
     { error: 'Description', code: 'ERROR_CODE' },
     { status: 400 }
   );
   ```

### Server Actions

1. **Location**: `src/actions/`
2. **Directive**: Always start with `"use server"`
3. **Naming**: `async function [verb][Noun](formData: FormData)` or `async function [verb][Noun](input: ValidatedType)`
4. **Validation**: Use Zod schemas, parse before processing
5. **Revalidation**: Use `revalidatePath()` or `revalidateTag()` when cache invalidation needed
6. **Error Handling**: Return `{ success: false, error: string }` never throw to client

### Business Logic

1. **Location**: `src/lib/[domain]/`
2. **Pure Functions**: Extract pure logic into testable functions
3. **Side Effects**: Isolate DB calls, API calls, and mutations
4. **Error Boundaries**: Catch and log at service boundaries

### Webhook Handling

1. **Verification First**: Always verify signature BEFORE parsing body
2. **Idempotency**: DB-backed deduplication (never in-memory)
3. **Early Return**: Return 200 ASAP, process async if heavy
4. **Logging**: Log webhook ID, provider, status (mask PII)

### Async Jobs (Inngest)

1. **Location**: `src/inngest/`
2. **Function Definition**: Use `inngest.createFunction()`
3. **Idempotency**: Include idempotency keys
4. **Error Handling**: Use dead-letter queue for failures
5. **Scheduling**: Use cron patterns for recurring jobs

---

## File Patterns

```
src/
├── app/api/
│   ├── webhook/
│   │   ├── whatsapp/route.ts
│   │   ├── telegram/route.ts
│   │   └── 360dialog/route.ts
│   ├── auth/
│   │   ├── magic/route.ts
│   │   ├── session/route.ts
│   │   └── logout/route.ts
│   ├── events/route.ts
│   └── reminders/route.ts
├── actions/
│   ├── reminders.ts
│   ├── process-vision.ts
│   └── process-voice.ts
├── lib/
│   ├── core/
│   │   ├── gateway.ts
│   │   └── pipeline.ts
│   ├── channels/
│   │   ├── whatsapp/
│   │   ├── telegram/
│   │   └── 360dialog/
│   └── auth/
│       ├── helpers.ts
│       └── vault.ts
└── inngest/
    ├── process-message.ts
    └── reminder-functions.ts
```

---

## Quality Checklist

Before marking complete:

- [ ] All inputs validated with Zod
- [ ] Auth checks in place (fail closed)
- [ ] Webhook signatures verified
- [ ] No raw `console.*` — use logger
- [ ] Error responses don't leak internals
- [ ] DB operations use atomic patterns
- [ ] Async jobs have idempotency keys
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] `npm test -- --run` passes

---

## Handoff Triggers

| To | When |
|---|---|
| supabase | Need schema change or query optimization |
| ai-systems | Need AI integration in endpoint |
| messaging | Need new channel webhook |
| security | Auth flow or webhook security review |
| testing | Need API test coverage |
| frontend | Need to consume new endpoint |

---

Last updated: 2026-05-14
