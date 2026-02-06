# Project Documentation: MyFamilyButler

## 1. Tech Stack

Canonical AI/dev/concurrency rules: `AI_TOOLING_RULEBOOK.md`.

| Tech                        | Purpose          | Implementation Details                                              |
| --------------------------- | ---------------- | ------------------------------------------------------------------- |
| **Next.js 16 (App Router)** | Core Framework   | `src/app` directory. Uses Server Actions, Middleware, and React 19. |
| **Vitest**                  | Unit Testing     | `vitest.config.ts`. Run via `npm test`.                             |
| **Supabase**                | Backend & RLS    | DB (`src/lib/supabase/`) + SQL Policies (`supabase/migrations`).    |
| **Inngest**                 | Background jobs  | `src/lib/inngest.ts`                                                |
| **Phone Auth**              | Messaging-based  | WhatsApp/Telegram implicit verification + magic links               |
| **Gemini 3 Flash Preview**  | AI (Primary)     | `src/lib/ai/providers/gemini.ts`. Free tier, text + vision.         |
| **OpenAI GPT-4o-mini**      | AI (Fallback)    | `src/lib/ai/providers/openai.ts`. Cheapest OpenAI model.            |
| **WhatsApp Cloud API**      | Messaging        | `src/lib/channels/whatsapp/` + `/api/webhook/whatsapp`              |
| **Telegram Bot API**        | Messaging        | `src/lib/channels/telegram/` + `/api/webhook/telegram`              |
| **360dialog**               | Messaging        | `src/lib/channels/360dialog/` + `/api/webhook/360dialog`            |
| **Zustand**                 | State Management | `src/stores/auth-store.ts`.                                         |
| **Core Pipeline**           | Message routing  | `src/lib/core/gateway.ts`, `src/lib/core/pipeline.ts`               |
| **Zod**                     | Validation       | Used for API inputs and AI parsing in `src/lib/ai/schemas.ts`.      |

## 2. Architecture & Logic

### Directory Structure

The `src/lib` folder is organized by domain:

```
src/lib/
├── ai/           # AI providers (Gemini primary, OpenAI fallback)
├── ai/agents/    # Vision agent for image processing
├── auth/         # Authentication helpers & Vault
├── channels/     # WhatsApp, Telegram, 360dialog
├── core/         # Gateway + pipeline orchestration
├── supabase/     # Database operations
├── sync/         # Google Calendar sync
├── utils/        # Shared utilities
└── config/       # App configuration
```

### AI Provider Strategy (Cost Optimized)

**Primary: Gemini 3 Flash Preview** (Free tier)

- Text parsing: Event extraction, reminders
- Vision: School letters, appointment cards
- Response generation

**Fallback: OpenAI GPT-4o-mini** ($0.15/1M tokens)

- When Gemini fails or is unavailable
- Automatic fallback with retry logic

```typescript
// Usage - automatically handles fallback
import { generateResponseWithFallback, parseEventWithFallback } from "@/lib/ai";

const events = await parseEventWithFallback(message, history);
const response = await generateResponseWithFallback(history, message);
```

### Core Data Flow

1. **Auth (Multi-Provider Implicit Auth)**:
   - **Email Users**: Register via web → Supabase Auth → Onboarding (add phone)
   - **WhatsApp/Telegram Users**: Message → Webhook creates user → Send
     "Dashboard" → Magic link → Auto-login
   - Phone number is the **golden key** for identity resolution across channels

2. **Dashboard Access (Custom Tokens)**:
   - `generateDashboardLink()` creates cryptographic token stored in
     `magic_tokens` table
   - Token exchanged for session cookie at `/api/auth/magic`
   - Single-use tokens with 15-minute expiry

3. **Message Processing**:
   - Webhook receives message → Deduplicates → Handles commands
   - If image: Vision Agent extracts events (Gemini → OpenAI fallback)
   - If text: AI parses intent (Reminder/Event) → DB Update → Response sent

### Key Patterns

- **AI Fallback**: Gemini first (free), OpenAI second (cheap)
- **Domain-Based Structure**: Code organized by feature, not by type
- **Server Actions**: `src/actions/*` contain server-side logic
- **Core Gateway/Pipeline**: `src/lib/core/*` orchestrates message processing
- **Zod Validation**: All AI responses validated via schemas
- **Centralized Prompts**: `src/lib/ai/prompts.ts` for all system prompts

## 3. Project Status

- ✅ **Authentication**: Full hybrid flow + Middleware protection.
- ✅ **Testing Infrastructure**: Vitest configured + Example tests.
- ✅ **Security**: RLS Policies defined + Zod Validation.
- ✅ **AI Integration**: Gemini + OpenAI with automatic fallback.
- ✅ **Vision Processing**: Image → Event extraction (school letters, etc).
- ✅ **WhatsApp Integration**: Functional with AI.
- ✅ **Telegram Integration**: Functional with AI + image processing.
- ✅ **Google Calendar Sync**: OAuth + bidirectional sync.
- ⚠️ **Core Processing**: Gateway/pipeline introduced; legacy message processor still present.
- 🚧 **Feature Parity**: Dashboard supports Reminders/Events, Settings basic.

## 4. Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI Providers
GOOGLE_GEMINI_API_KEY=      # Primary (free tier)
OPENAI_API_KEY=             # Fallback

# Messaging
WHATSAPP_API_TOKEN=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_ID=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=
WHATSAPP_BUSINESS_ACCOUNT_ID=
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
NEXT_PUBLIC_APP_URL=

# Google Calendar
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# App
NEXT_PUBLIC_APP_URL=
```

## 5. Common Tasks

### Adding a new AI feature

1. Add schema to `src/lib/ai/schemas.ts`
2. Add prompt to `src/lib/ai/prompts.ts`
3. Add function to appropriate provider
4. Export via `src/lib/ai/index.ts` with fallback

### Adding a new channel

1. Create handler in `src/lib/channels/`
2. Register adapter in core gateway/pipeline if required
3. Create webhook route in `src/app/api/webhook/`
4. Update provider toggles in `src/lib/channels/providers.config.ts`

## 6. Quality Gate Snapshot (2026-02-06)

- `npm run lint`: pass with 1 warning (`src/components/dashboard/today-widget.tsx`, unused variable)
- `npm run build`: pass
- `npm test -- --run`: pass (1 test file, 2 tests)

---

_Last updated: 2026-02-06_
