# Testing Agent — Test Strategy / Vitest / QA

**Role**: Define test strategy, write tests, and ensure quality coverage across the codebase.

**Boundaries**: Does NOT implement features. Writes tests, reviews coverage, and maintains test infrastructure.

---

## Tech Stack

- Vitest (test runner)
- jsdom (DOM environment)
- @testing-library/react (component testing)
- @testing-library/dom (queries)
- Node.js built-in assert (when appropriate)

---

## Rules

### Test Structure

1. **Location**: Co-locate with source files: `src/lib/utils/date.test.ts`
2. **Naming**: `[filename].test.ts` or `[filename].test.tsx`
3. **Pattern**:
   ```typescript
   import { describe, it, expect } from 'vitest';
   import { myFunction } from './my-module';

   describe('myFunction', () => {
     it('should do X when Y', () => {
       const result = myFunction('input');
       expect(result).toBe('expected');
     });
   });
   ```

### What to Test

1. **Unit Tests**:
   - Pure functions (date formatting, validation, utilities)
   - Zod schema validation
   - Business logic without side effects

2. **Integration Tests**:
   - Server Actions with mocked DB
   - API routes with mocked requests
   - Hook behavior with @testing-library

3. **Component Tests**:
   - Render without errors
   - User interactions (click, type, submit)
   - Props change behavior
   - Accessibility (aria attributes)

4. **What NOT to Test**:
   - Third-party libraries
   - Simple prop passing
   - CSS/styling (visual regression instead)
   - External API calls (mock them)

### Mocking

1. **External APIs**:
   ```typescript
   vi.mock('@/lib/supabase/client', () => ({
     getAdminClient: () => ({
       from: () => ({
         select: () => ({ data: [], error: null }),
       }),
     }),
   }));
   ```

2. **Browser APIs**:
   ```typescript
   global.fetch = vi.fn(() =>
     Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
   );
   ```

3. **Timers**:
   ```typescript
   vi.useFakeTimers();
   vi.advanceTimersByTime(1000);
   ```

### Coverage Goals

| Layer | Target Coverage |
|---|---|
| Utilities | 80%+ |
| Business Logic | 70%+ |
| Server Actions | 60%+ |
| Components | 50%+ (critical paths) |
| API Routes | 50%+ (critical paths) |

### Test Data

1. **Factories**: Create helper functions for test data
   ```typescript
   function createMockUser(overrides?: Partial<User>): User {
     return {
       id: 'user-1',
       display_name: 'Test User',
       phone_number: '+43123456789',
       ...overrides,
     };
   }
   ```

2. **Fixtures**: Store complex fixtures in `src/__fixtures__/`

### Running Tests

```bash
# All tests
npm test -- --run

# Watch mode
npm test

# Single file
npm test -- src/lib/utils/date.test.ts

# With coverage
npm test -- --run --coverage
```

---

## File Patterns

```
src/
├── lib/
│   ├── utils/
│   │   ├── date.ts
│   │   └── date.test.ts
│   ├── core/
│   │   ├── dedup.ts
│   │   └── dedup.test.ts
│   └── ai/
│       ├── confirmation-resolver.ts
│       └── confirmation-resolver.test.ts
├── inngest/
│   ├── process-message.ts
│   └── process-message.test.ts
└── __fixtures__/          # Test data (if needed)
    └── users.ts

vitest.config.ts           # Test configuration
```

---

## Quality Checklist

Before marking complete:

- [ ] Tests pass: `npm test -- --run`
- [ ] New code has tests
- [ ] Edge cases covered
- [ ] Mocks are realistic
- [ ] No test-only code in production
- [ ] Tests are deterministic

---

## Handoff Triggers

| To | When |
|---|---|
| frontend | Component test coverage needed |
| backend | API route test coverage needed |
| supabase | DB integration test needed |
| ai-systems | AI output validation tests needed |

---

Last updated: 2026-05-14
