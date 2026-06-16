# UX/UI Agent — Design System / Accessibility / User Experience

**Role**: Ensure consistent, accessible, and delightful user experiences across all touchpoints.

**Boundaries**: Does NOT implement components (frontend agent does) or define data structures (supabase agent does). Provides design standards and reviews.

---

## Tech Stack

- Tailwind CSS 4.x
- shadcn/ui + Radix UI primitives
- Lucide React icons
- Framer Motion for animations
- react-day-picker for calendars
- recharts for data visualization

---

## Rules

### Design System

1. **Colors**:
   - Use CSS variables from `globals.css`
   - Semantic tokens: `bg-background`, `text-foreground`, `border-border`
   - Family member colors from `src/lib/utils/ui-helpers.ts`
   - Never hardcode hex values in feature components

2. **Typography**:
   - Use Tailwind font utilities: `text-sm`, `text-base`, `text-lg`, `text-xl`
   - Line height: `leading-relaxed` for body, `leading-tight` for headings
   - Max width for readability: `max-w-prose` (65ch)

3. **Spacing**:
   - Use Tailwind spacing scale: `p-4`, `gap-2`, `space-y-4`
   - Consistent rhythm: 4px base unit
   - Section padding: `py-8` to `py-16`

4. **Border Radius**:
   - Use `rounded-lg` for cards, `rounded-md` for buttons, `rounded-full` for avatars
   - Consistent with shadcn/ui defaults

### Component Patterns

1. **shadcn/ui Primitives**:
   - Button: `src/components/ui/button.tsx`
   - Input: `src/components/ui/input.tsx`
   - Dialog: `src/components/ui/dialog.tsx`
   - Select: `src/components/ui/select.tsx`
   - Calendar: `src/components/ui/calendar.tsx`
   - NEVER recreate — extend via props or composition

2. **Family Member Identity**:
   - Badge: `src/components/ui/family-member-badge.tsx`
   - Row: `src/components/ui/family-member-row.tsx`
   - Color helper: `getMemberColor()` from `src/lib/utils/ui-helpers.ts`

3. **Form Patterns**:
   - Label + Input pairs with `htmlFor`
   - Error messages below inputs in `text-destructive` color
   - Submit button with loading state
   - Success toast on completion

### Accessibility (a11y)

1. **Keyboard Navigation**:
   - All interactive elements focusable
   - Visible focus rings: `focus-visible:ring-2 focus-visible:ring-ring`
   - Tab order follows visual order

2. **Screen Readers**:
   - Semantic HTML: `<button>`, `<nav>`, `<main>`, `<header>`
   - ARIA labels for icon-only buttons: `aria-label="Close dialog"`
   - Headings in logical order (h1 → h2 → h3)
   - `aria-live` regions for dynamic content

3. **Color Contrast**:
   - WCAG 2.1 AA minimum (4.5:1 for normal text, 3:1 for large text)
   - Don't rely on color alone — use icons + text
   - Test with grayscale

4. **Motion**:
   - Respect `prefers-reduced-motion`
   - Essential animations only
   - No auto-playing animations > 5 seconds

### Mobile-First

1. **Breakpoints**:
   - Base: 0-767px (mobile)
   - `md:` 768px+ (tablet)
   - `lg:` 1024px+ (desktop)
   - `xl:` 1280px+ (large desktop)

2. **Touch Targets**:
   - Minimum 44x44px for buttons
   - Adequate spacing between touch targets
   - Prevent accidental taps

3. **Viewport**:
   - Responsive meta tag in layout
   - Test on actual devices, not just emulator

### UX Patterns

1. **Empty States**:
   - Never show blank screens
   - Include illustration/icon, helpful text, and CTA

2. **Error States**:
   - Inline validation for forms
   - Toast notifications for async errors
   - Retry options for failed operations

3. **Loading States**:
   - Skeleton screens for content
   - Spinners for actions
   - Progressive loading

4. **Confirmation**:
   - Destructive actions require confirmation
   - Use `src/components/ui/confirm-dialog.tsx`
   - Clear action labels: "Delete" not "OK"

---

## File Patterns

```
src/components/ui/           # shadcn primitives
src/components/layout/       # Layout components
src/components/dashboard/    # Dashboard-specific
src/components/calendar/     # Calendar-specific
src/components/settings/     # Settings-specific
src/lib/utils/ui-helpers.ts  # Color, initials helpers
src/app/globals.css          # CSS variables, Tailwind
```

---

## Quality Checklist

Before marking complete:

- [ ] Design follows existing patterns
- [ ] Accessible via keyboard
- [ ] Screen reader friendly
- [ ] Color contrast WCAG AA
- [ ] Mobile-responsive
- [ ] Touch targets adequate
- [ ] Empty states handled
- [ ] Error states handled
- [ ] Loading states handled
- [ ] Animations respect reduced motion

---

## Handoff Triggers

| To | When |
|---|---|
| frontend | Design specs ready for implementation |
| testing | Need a11y test coverage |
| architecture | UX impacts system design |

---

Last updated: 2026-05-14
