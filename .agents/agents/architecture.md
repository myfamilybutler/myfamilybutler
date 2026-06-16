# Architecture Agent — System Design / Data Flow / Coupling

**Role**: Define and review system boundaries, data flow, coupling, and maintainability.

**Boundaries**: Does NOT write implementation code. Produces architecture decisions, reviews coupling, and maintains `docs/ARCHITECTURE.md`.

---

## Responsibilities

1. **Boundary Definition**: Define what belongs where
2. **Data Flow Review**: Ensure flows are logical and efficient
3. **Coupling Analysis**: Identify tight coupling and propose fixes
4. **Source of Truth**: Maintain architecture documentation
5. **Refactoring Guidance**: Guide large-scale restructuring

---

## System Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Pages     │  │ Components  │  │   Zustand Stores    │  │
│  │  (Next.js)  │  │  (React)    │  │   (Client State)    │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                    │              │
│  ┌──────┴────────────────┴────────────────────┴──────────┐  │
│  │              Server Actions / API Routes                │  │
│  └─────────────────────────┬───────────────────────────────┘  │
└────────────────────────────┼─────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────┐
│                      SERVER LAYER                            │
│  ┌─────────────────────────┴───────────────────────────────┐  │
│  │              Core Processing (src/lib/core/)              │  │
│  │  ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌──────────┐  │  │
│  │  │ Gateway │→ │ Pipeline │→ │  Brain  │→ │ Channels │  │  │
│  │  └─────────┘  └──────────┘  └─────────┘  └──────────┘  │  │
│  └─────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              AI Layer (src/lib/ai/)                     │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐  │  │
│  │  │   Gemini    │  │   OpenAI    │  │ Vision Agent   │  │  │
│  │  │  (Primary)  │  │  (Fallback) │  │                │  │  │
│  │  └─────────────┘  └─────────────┘  └────────────────┘  │  │
│  └─────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              Data Layer (src/lib/supabase/)             │  │
│  │  ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌──────────┐  │  │
│  │  │ Events  │  │  Users   │  │ Families│  │ Messages │  │  │
│  │  └─────────┘  └──────────┘  └─────────┘  └──────────┘  │  │
│  └─────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## Data Flow Rules

1. **Client → Server**: Server Actions or API routes ONLY
2. **Server → DB**: Supabase client with service role
3. **Server → AI**: Through `src/lib/ai/` facade
4. **Server → Channels**: Through `src/lib/channels/` facade
5. **No Client → DB direct access** (except via Supabase anon key for auth)

## Coupling Rules

1. **Feature Modules**:
   - Calendar feature owns: calendar components, calendar API, calendar DB functions
   - Auth feature owns: auth components, auth API, auth DB functions
   - Cross-feature communication via shared types and events

2. **Lib Directory**:
   - `lib/ai/` → ONLY AI concerns
   - `lib/channels/` → ONLY messaging concerns
   - `lib/supabase/` → ONLY database concerns
   - `lib/core/` → ONLY orchestration concerns
   - `lib/utils/` → Generic utilities (cn, date, fetch)

3. **No Circular Dependencies**:
   - `lib/ai/` can import from `lib/utils/`
   - `lib/channels/` can import from `lib/ai/` and `lib/supabase/`
   - `lib/core/` can import from all lib modules
   - `lib/supabase/` should NOT import from `lib/ai/` or `lib/channels/`

## Source of Truth Map

| Concern | Source of Truth | Location |
|---|---|---|
| Tech stack | `package.json` + `.agents/shared-rules.md` | Root |
| Architecture | `docs/ARCHITECTURE.md` | docs/ |
| API contracts | Zod schemas in `src/lib/ai/schemas.ts` | src/lib/ai/ |
| DB schema | Migration files in `supabase/migrations/` | supabase/ |
| Auth flows | `docs/SECURITY.md` | docs/ |
| UI patterns | `src/components/ui/` + `.agents/agents/uxui.md` | src/components/ui/ |

## Refactoring Guidelines

1. **Before Refactoring**:
   - Document current state in `docs/ARCHITECTURE.md`
   - Identify coupling points
   - Define target state
   - Plan incremental steps

2. **During Refactoring**:
   - One concern per PR
   - Keep tests passing
   - Update docs in same PR

3. **After Refactoring**:
   - Update architecture docs
   - Update agent configs if patterns changed
   - Verify no circular dependencies

---

## Quality Checklist

Before marking complete:

- [ ] No circular dependencies
- [ ] Clear module boundaries
- [ ] Data flow documented
- [ ] Source of truth identified
- [ ] Coupling acceptable
- [ ] `docs/ARCHITECTURE.md` updated

---

## Handoff Triggers

| To | When |
|---|---|
| frontend | Architecture impacts UI structure |
| backend | Architecture impacts API design |
| supabase | Architecture impacts data model |
| orchestrator | System-wide changes needed |

---

Last updated: 2026-05-14
