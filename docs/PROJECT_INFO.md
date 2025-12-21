# Project Documentation: MyFamilyButler

## 1. Tech Stack

| Tech                        | Purpose          | Implementation Details                                              |
| --------------------------- | ---------------- | ------------------------------------------------------------------- |
| **Next.js 16 (App Router)** | Core Framework   | `src/app` directory. Uses Server Actions, Middleware, and React 19. |
| **Vitest**                  | Unit Testing     | `vitest.config.ts`. Run via `npm test`.                             |
| **Supabase**                | Backend & RLS    | DB (`src/lib/supabase/`) + SQL Policies (`supabase/migrations`).    |
| **Firebase**                | Phone Auth       | `src/lib/firebase.ts`. Verifies OTPs.                               |
| **Gemini 1.5 Flash**        | AI (Primary)     | `src/lib/ai/providers/gemini.ts`. Free tier, text + vision.         |
| **OpenAI GPT-4o-mini**      | AI (Fallback)    | `src/lib/ai/providers/openai.ts`. Cheapest OpenAI model.            |
| **WhatsApp Cloud API**      | Messaging        | `src/lib/channels/whatsapp.ts`. Webhook at `/api/webhook/whatsapp`. |
| **Telegram Bot API**        | Messaging        | `src/lib/channels/telegram.ts`. Webhook at `/api/webhook/telegram`. |
| **Zustand**                 | State Management | `src/stores/auth-store.ts`.                                         |
| **Zod**                     | Validation       | Used for API inputs and AI parsing in `src/lib/ai/schemas.ts`.      |

## 2. Architecture & Logic

### Directory Structure

The `src/lib` folder is organized by domain:

```
src/lib/
├── ai/           # AI providers (Gemini primary, OpenAI fallback)
├── agents/       # Vision agent for image processing
├── auth/         # Authentication helpers & Vault
├── channels/     # WhatsApp, Telegram, message processor
├── supabase/     # Database operations
├── sync/         # Google Calendar sync
├── utils/        # Shared utilities
└── config.ts     # App configuration
```

### AI Provider Strategy (Cost Optimized)

**Primary: Gemini 1.5 Flash** (Free tier)

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
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
TELEGRAM_BOT_TOKEN=

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
2. Update `message-processor.ts` if needed
3. Create webhook route in `src/app/api/webhook/`

---

_Last updated: 2024-12-20_
