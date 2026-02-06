# Developer Guide & Usage Manual

This guide explains the architectural features implemented in `MyFamilyButler`
and how to use them in your daily development.

Canonical rules for AI tooling, concurrency safety, and quality gates live in
`AI_TOOLING_RULEBOOK.md`.

## 1. AI Integration

Current model targets:
- Gemini: `gemini-3-flash-preview`
- OpenAI: `gpt-4o-mini`

### Provider Strategy (Cost Optimized)

The app uses a **dual-provider strategy** to minimize costs:

**Primary: Gemini 3 Flash Preview** (Free tier / $0.075 per 1M tokens)
**Fallback: OpenAI GPT-4o-mini** ($0.15 per 1M tokens)

Note: Model names are defined in `src/lib/ai/providers/gemini.ts` and `src/lib/ai/providers/openai.ts`.

```typescript
// Automatic fallback - just import from @/lib/ai
import {
  generateResponseWithFallback, // Chat responses
  parseEventWithFallback, // Event extraction
} from "@/lib/ai";

// For vision/image processing
import { processLocalImage } from "@/actions/process-vision";
```

### AI Directory Structure

```
src/lib/ai/
├── index.ts          # Main entry - exports fallback functions
├── schemas.ts        # Shared Zod schemas for validation
├── prompts.ts        # Centralized system prompts
├── types.ts          # TypeScript types
└── providers/
    ├── gemini.ts     # Gemini 3 Flash Preview (primary)
    └── openai.ts     # GPT-4o-mini (fallback)
```

### Adding New AI Features

1. **Add Zod schema** to `src/lib/ai/schemas.ts`
2. **Add system prompt** to `src/lib/ai/prompts.ts`
3. **Implement in both providers** or just the primary
4. **Export with fallback** in `src/lib/ai/index.ts`

## 2. Vision Agent (Image Processing)

Extracts calendar events from images (school letters, appointment cards).

```typescript
import { processLocalImage } from "@/actions/process-vision";

const result = await processLocalImage(
  imageBuffer, // Buffer
  userId, // User ID
  householdId, // Household ID for events
  "image/jpeg", // MIME type
);

// result.events - extracted events
// result.eventsCreated - count saved to DB
```

### Supported Image Types

- School letters (Elternbrief)
- Event flyers
- Appointment cards
- Calendar screenshots
- Schedules

## 3. Directory Structure

### src/lib/ (Post-Refactoring)

| Directory   | Purpose                | Key Files                                            |
| ----------- | ---------------------- | ---------------------------------------------------- |
| `ai/`       | AI providers & parsing | `index.ts`, `schemas.ts`, `prompts.ts`               |
| `ai/agents/` | Specialized agents     | `vision-agent.ts`                                    |
| `auth/`     | Authentication         | `helpers.ts`, `vault.ts`                             |
| `channels/` | Messaging              | `telegram/`, `whatsapp/`, `360dialog/`               |
| `core/`     | Core processing        | `gateway.ts`, `pipeline.ts`, `state.ts`              |
| `supabase/` | Database ops           | `client.ts`, `db-*.ts`                               |
| `sync/`     | External sync          | `google-sync-service.ts`                             |
| `utils/`    | Utilities              | `fetch.ts`, `phone.ts`, `logger.ts`                  |

## 4. Automated Testing (Vitest)

- **Location**: `vitest.config.ts`, `src/**/*.test.ts`
- **How to Run**:
  ```bash
  npm test
  ```
- **How to Add Tests**: Create a file ending in `.test.ts` or `.test.tsx`

## 5. Server Actions

We use Next.js Server Actions for data mutations.

- **Location**: `src/actions/`
- **Examples**: `reminders.ts`, `process-vision.ts`, `process-voice.ts`

```typescript
// src/actions/example.ts
"use server";

import { z } from "zod";

const InputSchema = z.object({
  title: z.string().min(1),
});

export async function createExample(formData: FormData) {
  const input = InputSchema.parse({
    title: formData.get("title"),
  });
  // ... implementation
}
```

## 6. Configuration & Localization

Stop hardcoding values in your components.

- **Location**: `src/lib/config/index.ts`
- **Usage**:

Keep UI constants (links, phone numbers) in config where possible.
  ```typescript
  import { APP_CONFIG } from "@/lib/config";

  console.log(APP_CONFIG.localization.timezone); // 'Europe/Vienna'
  console.log(APP_CONFIG.localization.locale); // 'de-AT'
  ```

## 7. Middleware & Auth

### Route Protection

`src/middleware.ts` protects `/dashboard/*` and `/onboarding/*` routes.

### Multi-Provider Authentication

**Email Users (Web Registration):**

1. User registers at `/register` with email/password
2. Supabase Auth creates user → redirect to `/onboarding`
3. Session cookie set

**WhatsApp/Telegram Users (Custom Token):**

1. User sends message → webhook creates user by phone
2. User creates event → confirmation includes URL button with magic link
3. User taps button → instant login to dashboard

Alternatively, user sends "Dashboard" command:

1. `generateDashboardLink()` creates token in `magic_tokens`
2. URL button sent with magic link embedded
3. User taps button → token validated → session cookie set

### Commands (Available in WhatsApp & Telegram)

- `dashboard` / `link` / `login` - Get URL button for instant dashboard access
- `start` / `hi` / `hello` - Welcome message
- `help` / `hilfe` - Show help

### Dashboard URL Buttons

When events are created or "dashboard" is invoked, responses include clickable
buttons:

- **WhatsApp/360dialog**: CTA URL button (opens directly when tapped)
- **Telegram**: Inline keyboard URL button
- **Fallback**: Text message with plain link if button API fails

## 8. Import Paths

Use the barrel exports for cleaner imports:

```typescript
// AI - automatic fallback
import { parseEventWithFallback } from "@/lib/ai";

// Channels
import { sendTelegramMessage } from "@/lib/channels/telegram";
import { sendWhatsAppMessage } from "@/lib/channels/whatsapp";

// Auth
import { validateSession } from "@/lib/auth/helpers";
import { getValidGoogleToken } from "@/lib/auth/vault";

// Database
import { createEvent, getEventsForHousehold } from "@/lib/supabase";

// Utils
import { cn } from "@/lib/utils";
```

## 9. Environment Variables

Required for development (see `.env.local.example` for the authoritative list):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI (at least one required)
GOOGLE_GEMINI_API_KEY=        # Primary (free tier recommended)
OPENAI_API_KEY=               # Fallback

# Messaging Provider Switches
PROVIDER_WHATSAPP_ENABLED=true
PROVIDER_TELEGRAM_ENABLED=false
PROVIDER_360DIALOG_ENABLED=false

# WhatsApp Business API (Meta Cloud API)
WHATSAPP_API_TOKEN=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_ID=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=          # For webhook signature verification (production)
WHATSAPP_BUSINESS_ACCOUNT_ID=

# 360dialog WhatsApp API (alternative to Meta Cloud API)
D360_API_KEY=                 # API key from 360dialog dashboard
D360_BASE_URL=https://waba-sandbox.360dialog.io  # or production URL

# Telegram Bot
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=      # Secret token for webhook verification

# Google Calendar (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Dev Testing (local browser testing only)
E2E_TEST_EMAIL=test@myfamilybutler.test
E2E_TEST_PASSWORD=DevTest2024!Secure
```

## 9.1 Migration Policy

- Canonical migration folder: `supabase/migrations/`
- Do not add new runtime migrations under `src/lib/supabase/migrations/`
- If legacy migrations exist in non-canonical paths, consolidate before release

## 9.2 Documentation Workflow (Required)

- Follow `AI_TOOLING_RULEBOOK.md` for mandatory doc updates on major changes
- Include a "Documentation Gate" checklist in every PR
- Include a "Multi-Lens Review Gate" for major changes (Pass A audit, Pass B fix, Pass C re-audit)
- Keep rule statements centralized (link to canonical docs instead of duplicating)
- Update `Last updated` timestamp in each doc touched by behavior changes

## 10. Dev Login for Browser Testing

A **dev-only password login** is available for browser testing without needing
magic links.

### How It Works

1. Only available when `NODE_ENV === 'development'`
2. Returns 404 in production (completely invisible)
3. Uses credentials from `.env.local`
4. Creates test user and household automatically on first login

### Setup

Add these to your `.env.local`:

```bash
# DEV TESTING ONLY (Browser Testing)
E2E_TEST_EMAIL=test@myfamilybutler.test
E2E_TEST_PASSWORD=DevTest2024!Secure
```

### Usage

1. Navigate to `/login` in development
2. Scroll to the red "DEV ONLY - Password Login" form at the bottom
3. Enter the test credentials
4. Click "Dev Login" → Redirects to `/dashboard`

### Key Files

| File                                  | Purpose                                  |
| ------------------------------------- | ---------------------------------------- |
| `src/app/login/page.tsx`              | DevLoginForm component (dev-only)        |
| `src/app/api/auth/dev-login/route.ts` | API endpoint (returns 404 in production) |

### Security Notes

- ⚠️ **Dev only** - Route returns 404 in production
- ✅ Credentials stored in `.env.local` (never commit)
- ✅ Creates isolated "Test Household" for testing
- ✅ httpOnly cookies with 1-week expiry

---

_Last updated: 2026-02-06_
