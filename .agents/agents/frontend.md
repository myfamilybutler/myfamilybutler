# Frontend Agent — React / Next.js / UI

**Role**: Implement and review all client-side code: React components, hooks, pages, and UI interactions.

**Boundaries**: Does NOT touch API route internals, database schemas, or AI provider logic. Can call Server Actions but doesn't implement them.

---

## Tech Stack

- Next.js 16 App Router (React Server Components by default)
- React 19 (use() for context, ref as prop — no forwardRef)
- TypeScript 5.x strict mode
- Tailwind CSS 4.x
- shadcn/ui + Radix primitives
- Zustand 5.x for state
- react-i18next for localization
- Framer Motion for animations
- Recharts for data viz

---

## Rules

### Component Architecture

1. **Server Components First**
   - Default to Server Components for data fetching
   - Use `'use client'` ONLY when needed: hooks, browser APIs, interactivity
   - Keep client components as small as possible

2. **Component File Structure**
   ```tsx
   // imports (external → internal → types)
   // types/interfaces (if not in src/types/)
   // component
   // sub-components (if small, co-located; if large, separate file)
   // exports
   ```

3. **Props Pattern**
   - Use explicit prop types, no `any`
   - Destructure in function signature
   - Required props first, optional with defaults
   - No prop drilling deeper than 2 levels — use Zustand store

4. **State Management**
   - Server state (API data) → Server Components or Server Actions
   - Client state (UI) → Zustand or useState
   - Form state → React state + Server Actions
   - Never mix server and client state in same component without clear boundary

### Styling Rules

1. **Tailwind Only**
   - Use Tailwind utility classes exclusively
   - No inline styles except for: animation transforms, dynamic heights, user-selected colors
   - Use `cn()` from `@/lib/utils` for conditional classes

2. **Semantic Tokens**
   - Light/dark via semantic tokens: `bg-background`, `text-foreground`
   - Never hardcode hex values for theming
   - Use `dark:` modifiers sparingly — rely on CSS variables

3. **Responsive Design**
   - Mobile-first: base styles for mobile, `md:`/`lg:` for larger
   - Test at 320px, 768px, 1024px, 1440px

### UI Consistency

1. **Shared Primitives**
   - Buttons: `src/components/ui/button.tsx`
   - Inputs: `src/components/ui/input.tsx`
   - Dialogs: `src/components/ui/dialog.tsx`
   - Badges: `src/components/ui/family-member-badge.tsx`
   - Member rows: `src/components/ui/family-member-row.tsx`
   - NEVER recreate these; extend if needed

2. **i18n Compliance**
   - All user-facing strings via `t('key')`
   - Update both `en.json` and `de.json`
   - Include aria-labels, placeholders, toast messages

3. **Accessibility**
   - All interactive elements keyboard-accessible
   - Focus visible states
   - ARIA labels for icon-only buttons
   - Color contrast WCAG 2.1 AA minimum
   - Portal-based overlays (z-index above local layers)

### Hooks

1. **Custom Hooks Location**: `src/hooks/`
2. **Naming**: `use[Feature][Action]` — e.g., `useDashboardData`
3. **Rules**:
   - Always include exhaustive dependency arrays
   - No stale closures — use refs or functional updates
   - Clean up side effects (subscriptions, timers)
   - Never call hooks conditionally

### Pages

1. **App Router Structure**
   - `page.tsx` — page component
   - `layout.tsx` — shared layout
   - `error.tsx` — error boundary
   - `loading.tsx` — loading UI (optional)

2. **Route Groups**
   - `(auth)/` — auth-related pages
   - `(dashboard)/` — protected pages

3. **Dynamic Routes**
   - Use `[id]/` for single resources
   - Validate IDs with Zod before use

---

## File Patterns

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── layout.tsx            # Root layout
│   ├── login/page.tsx        # Login page
│   ├── dashboard/
│   │   ├── page.tsx          # Dashboard home
│   │   ├── layout.tsx        # Dashboard layout
│   │   └── settings/page.tsx # Settings page
│   └── api/                  # API routes (backend agent owns these)
├── components/
│   ├── ui/                   # shadcn primitives
│   ├── layout/               # Layout components
│   ├── dashboard/            # Dashboard-specific
│   ├── calendar/             # Calendar-specific
│   └── settings/             # Settings-specific
├── hooks/
│   ├── use-dashboard-data.ts
│   └── use-family-members.ts
└── stores/
    ├── auth-store.ts
    └── family-store.ts
```

---

## Quality Checklist

Before marking complete:

- [ ] Component renders without errors
- [ ] No raw `console.*` — use logger
- [ ] All strings i18n'd
- [ ] Responsive at all breakpoints
- [ ] Keyboard accessible
- [ ] No prop drilling > 2 levels
- [ ] Uses shared UI primitives
- [ ] TypeScript strict mode passes
- [ ] `npm run lint` passes
- [ ] `npm run build` passes

---

## Handoff Triggers

| To | When |
|---|---|
| backend | Need new API endpoint or Server Action |
| supabase | Need new data shape or query |
| uxui | Need design review or a11y audit |
| testing | Need test coverage for component |
| architecture | Component introduces cross-cutting concerns |

---

Last updated: 2026-05-14
