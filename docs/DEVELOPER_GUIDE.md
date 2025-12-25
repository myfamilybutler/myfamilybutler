# Developer Guide & Usage Manual

This guide explains the architectural features implemented in `MyFamilyButler`
and how to use them in your daily development.

## 1. AI Integration

### Provider Strategy (Cost Optimized)

The app uses a **dual-provider strategy** to minimize costs:

**Primary: Gemini 1.5 Flash** (Free tier / $0.075 per 1M tokens)
**Fallback: OpenAI GPT-4o-mini** ($0.15 per 1M tokens)

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
    ├── gemini.ts     # Gemini 1.5 Flash (primary)
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
| `agents/`   | Specialized agents     | `vision-agent.ts`                                    |
| `auth/`     | Authentication         | `helpers.ts`, `vault.ts`                             |
| `channels/` | Messaging              | `telegram.ts`, `whatsapp.ts`, `message-processor.ts` |
| `supabase/` | Database ops           | `client.ts`, `db-*.ts`                               |
| `sync/`     | External sync          | `google.ts` (Calendar)                               |
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
- **Examples**: `reminders.ts`, `process-vision.ts`

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

- **Location**: `src/lib/config.ts`
- **Usage**:
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
2. User sends "Dashboard" command
3. `generateDashboardLink()` creates token in `magic_tokens`
4. Link sent: `/api/auth/magic?token=xxx`
5. User clicks → token validated → session cookie set

### Commands (Available in WhatsApp & Telegram)

- `dashboard` / `link` / `login` - Get dashboard magic link
- `start` / `hi` / `hello` - Welcome message
- `help` / `hilfe` - Show help

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

Required for development:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI (at least one required)
GEMINI_API_KEY=               # Primary (free tier recommended)
OPENAI_API_KEY=               # Fallback

# Messaging Provider Switches
PROVIDER_PRIMARY=whatsapp_business    # or telegram
PROVIDER_WHATSAPP_ENABLED=true
PROVIDER_TELEGRAM_ENABLED=false

# WhatsApp Business API
WHATSAPP_API_TOKEN=
WHATSAPP_PHONE_ID=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=          # For webhook signature verification (production)

# Telegram Bot
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=      # Secret token for webhook verification

# Google Calendar (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Dev Testing (local browser testing only)
E2E_TEST_EMAIL=test@myfamilybutler.test
E2E_TEST_PASSWORD=DevTest2024!Secure
```

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

_Last updated: 2024-12-25_
