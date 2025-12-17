# Developer Guide & Usage Manual

This guide explains the new architectural features implemented in
`MyFamilyButler` and how to use them in your daily development.

## 1. Automated Testing (Vitest)

We have added a unit testing framework to ensure code stability.

- **Location**: `vitest.config.ts`, `src/**/*.test.ts`
- **How to Run**:
  ```bash
  npm test
  ```
- **How to Add Tests**: Create a file ending in `.test.ts` or `.test.tsx` next
  to the file you want to test.
  ```typescript
  // src/lib/example.test.ts
  import { describe, expect, it } from "vitest";
  import { myFunction } from "./example";

  describe("myFunction", () => {
      it("should return true", () => {
          expect(myFunction()).toBe(true);
      });
  });
  ```

## 2. Server Actions

We are moving away from `/api/` routes for data mutations (creates/updates) in
favor of Next.js Server Actions. This provides better type safety and cleaner
code.

- **Location**: `src/actions/`
- **Example**: `src/actions/reminders.ts`
- **How to Use**:
  1. Define a Zod schema for your input.
  2. Create an async function with `'use server'` at the top.
  3. Call this function directly from your Client Components (e.g., in a
     `<form action={myAction}>`). _Tip: See `src/actions/reminders.ts` for a
     complete reference implementation including validation and error handling._

## 3. Configuration & Localization

Stop hardcoding "Austria" or specific prompts in your components.

- **Location**: `src/lib/config.ts`
- **Usage**:
  ```typescript
  import { APP_CONFIG } from "@/lib/config";

  console.log(APP_CONFIG.localization.timezone); // 'Europe/Vienna'
  console.log(APP_CONFIG.ai.systemPrompts.butlerPersona);
  ```
- **When to Update**: If you need to change the AI's personality or support a
  new country, edit this file only.

## 4. Input Validation (Zod)

Never trust AI output or User input blindly.

- **Usage**: We use `zod` to validate JSON from OpenAI.
  ```typescript
  import { z } from "zod";

  const MySchema = z.object({
      title: z.string(),
      date: z.string().datetime(),
  });

  // safeParse doesn't throw!
  const result = MySchema.safeParse(data);
  if (!result.success) {
      console.error(result.error);
  }
  ```

## 5. Row Level Security (RLS)

We created a SQL migration file to secure your Database.

- **Location**: `supabase/migrations/20241217_initial_rls.sql`
- **Action Required**:
  1. Go to your Supabase Dashboard -> SQL Editor.
  2. Open or Copy/Paste the contents of the migration file.
  3. Run it. _This will enable security policies so users can only see their own
     data._

## 6. Type Generation

Keep your TypeScript types in sync with your Database schema.

- **Script**: `npm run refresh-types`
- **Setup**: You need to edit `package.json` to replace `<your-project-id>` with
  your actual Supabase Project Reference ID.
- **When to run**: Every time you change your Database Schema (add columns,
  tables).

## 7. Middleware & Auth

- **Behavior**: `src/middleware.ts` runs on every request to `/dashboard/*`. It
  checks for a `session_authenticated` cookie.
- **Login Flow**: When a user logs in via Firebase, we call `/api/auth/session`
  to set this cookie.
- **Developer Note**: If you manually clear cookies, you will be logged out of
  the Dashboard but might still be logged in to Firebase on the client. Just go
  to `/login` to refresh the session.
