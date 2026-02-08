# Project Architecture & Status Report

Canonical reading order: `docs/INDEX.md`.
Execution policy is defined in `docs/AI_TOOLING_RULEBOOK.md` and
`docs/AI_OPERATING_MODEL.md`.

## 1. The "Clean" Stack (Active Technology)

_List only the technologies that are CRITICAL. Mark others as "To Deprecate".
Keep in sync with the actual codebase. The core runtime is the gateway/pipeline
in `src/lib/core/`._

| Component     | Active Choice                   | Status in Code                              |
| :------------ | :------------------------------ | :------------------------------------------ |
| **Framework** | Next.js 16 (App Router)         | ✅ Implemented (v16.0.10 in `package.json`) |
| **Database**  | Supabase                        | ✅ Active (`src/lib/supabase/`)             |
| **Auth**      | Supabase Auth + Magic Tokens    | ✅ Active (`src/lib/auth/`)                 |
| **Messaging** | WhatsApp + Telegram + 360dialog | ✅ Active (`src/lib/channels/`)             |
| **AI**        | Gemini + OpenAI (fallback)      | ✅ Active (`src/lib/ai/`)                   |
| **Vision**    | Gemini Vision + OpenAI          | ✅ Active (`src/actions/process-vision.ts`) |
| **Core Flow** | Gateway + Pipeline              | ✅ Active (`src/lib/core/`)                 |

## 2. Directory Structure (Post-Refactoring)

```
src/lib/
├── ai/                         # 🧠 AI providers & parsing
│   ├── index.ts               # Main entry - Gemini first, OpenAI fallback
│   ├── prompts.ts             # Centralized system prompts
│   ├── schemas.ts             # Shared Zod schemas
│   ├── types.ts               # ParsedEvent, EventExtractionResult
│   └── providers/
│       ├── openai.ts          # OpenAI GPT-4o-mini
│       └── gemini.ts          # Gemini 3 Flash Preview (primary)
│
├── ai/agents/                  # 🤖 Specialized AI agents
│   └── vision-agent.ts         # Image → Event extraction
│
├── auth/                       # 🔐 Authentication & security
│   ├── index.ts
│   ├── helpers.ts             # validateSession
│   └── vault.ts               # Supabase Vault token storage
│
├── channels/                   # 📱 Messaging integrations
│   ├── index.ts
│   ├── telegram/               # Telegram Bot API
│   ├── whatsapp/               # Meta WhatsApp API
│   ├── 360dialog/              # 360dialog WhatsApp API
│   └── providers.config.ts     # Provider on/off switches
│
├── supabase/                   # 🗄️ Database operations
│   ├── client.ts
│   ├── db-events.ts
│   ├── db-families.ts
│   ├── db-messages.ts
│   ├── db-reminders.ts
│   └── db-users.ts
│
├── sync/                       # 🔄 External sync services
│   └── google-sync-service.ts # Google Calendar sync orchestration
│
├── utils/                      # 🛠️ Generic utilities
│   ├── cn.ts                  # Tailwind class merging
│   ├── fetch.ts               # fetchWithTimeout
│   ├── logger.ts              # Logging utilities
│   ├── phone.ts               # Phone number formatting
│   ├── security.ts            # Webhook verification, masking
│   └── ui-helpers.ts          # getMemberColor, getInitials
│
└── config/                     # ⚙️ App configuration
```

## 3. AI Provider Strategy (Cost Optimized)

### Text Processing

```
User Message → Gemini 3 Flash Preview (FREE) → OpenAI GPT-4o-mini ($0.15/1M)
```

### Image/Vision Processing

```
Image → Gemini 3 Flash Preview (FREE) → OpenAI GPT-4o-mini ($0.15/1M)
```

| Provider              | Model           | Cost           | Use Case         |
| --------------------- | --------------- | -------------- | ---------------- |
| **Gemini (Primary)**  | gemini-3-flash-preview | Free tier      | Text + Vision    |
| **OpenAI (Fallback)** | gpt-4o-mini            | $0.15/1M input | Fallback parsing |

Model names should mirror `src/lib/ai/providers/*.ts` and `src/actions/process-vision.ts`.

## 3.1 Engineering Rules

- Canonical AI/dev rules: `AI_TOOLING_RULEBOOK.md`
- Canonical DB migrations: `supabase/migrations/`
- Concurrency-critical paths must use DB-enforced atomicity (RPC, locks, unique constraints)
- In-memory maps are optimization-only, never source-of-truth for correctness

## 4. The Data Flow

### Authentication Flow (Custom Token)

```
User sends message (WhatsApp/Telegram)
        ↓
Webhook receives → Signature verified → User found/created by phone
        ↓
User sends "Dashboard" command
        ↓
generateDashboardLink() → Creates token in magic_tokens table
        ↓
Link sent: /api/auth/magic?token=xxx
        ↓
User clicks → Token validated → Session cookie set (14 days)
```

### Dev Login Flow (Development Only)

```
Developer opens /login
        ↓
DevLoginForm visible (NODE_ENV === 'development')
        ↓
Enter E2E_TEST_EMAIL + E2E_TEST_PASSWORD
        ↓
POST /api/auth/dev-login → Find/create test user + household
        ↓
Session cookies set → Redirect to /dashboard
```

> ⚠️ Returns 404 in production - completely invisible

### Message Processing Flow

1. **User sends message** → Received by channel webhook
2. **Provider checks** → Signature validation + provider enabled
3. **Deduplication check** → Prevent processing same message twice
4. **Gateway + Pipeline** → Standardized message handling (core flow)
5. **AI Routing** → Event/Reminder extraction (Gemini → OpenAI fallback)
6. **Response sent** → Via channel adapter

## 5. Identity Resolution (Multi-Provider)

**Phone Number is the Golden Key** - all channels resolve to phone:

| Entry Point | Primary ID                       | Links To           |
| ----------- | -------------------------------- | ------------------ |
| WhatsApp    | `phone_number` (wa_id)           | users.phone_number |
| 360dialog   | `phone_number` (wa_id)           | users.phone_number |
| Telegram    | `telegram_chat_id` → phone share | users.phone_number |
| Web/Email   | `email` + onboarding phone       | users.phone_number |

## 6. Key Files (Updated Paths)

| File                                     | Purpose                               |
| ---------------------------------------- | ------------------------------------- |
| `src/lib/supabase/client.ts`             | Supabase client initialization        |
| `src/lib/ai/index.ts`                    | AI router with fallback logic         |
| `src/lib/core/gateway.ts`                | Unified message entry point           |
| `src/lib/core/pipeline.ts`               | Message processing orchestration      |
| `src/lib/channels/providers.config.ts`   | Provider on/off switches              |
| `src/lib/utils/security.ts`              | Webhook verification, masking         |
| `src/app/api/webhook/whatsapp/route.ts`  | WhatsApp message handling             |
| `src/app/api/webhook/telegram/route.ts`  | Telegram message handling             |
| `src/app/api/webhook/360dialog/route.ts` | 360dialog message handling            |
| `src/app/api/auth/dev-login/route.ts`    | Dev-only password login (404 in prod) |
| `src/actions/process-vision.ts`          | Image → Event extraction              |
| `src/middleware.ts`                      | Route protection                      |

> Note: Some legacy flows are still being migrated to the new core structure.

## 7. Provider Switching

Toggle messaging providers via environment variables:

```bash
# Production (WhatsApp only)
PROVIDER_WHATSAPP_ENABLED=true
PROVIDER_TELEGRAM_ENABLED=false
PROVIDER_360DIALOG_ENABLED=false

# Testing (Telegram)
PROVIDER_TELEGRAM_ENABLED=true
PROVIDER_WHATSAPP_ENABLED=false
PROVIDER_360DIALOG_ENABLED=false

# 360dialog Sandbox Testing
PROVIDER_360DIALOG_ENABLED=true
PROVIDER_WHATSAPP_ENABLED=false
PROVIDER_TELEGRAM_ENABLED=false
```

## 8. Webhook Security

| Feature            | Implementation                         |
| ------------------ | -------------------------------------- |
| WhatsApp signature | X-Hub-Signature-256 HMAC verification  |
| Telegram secret    | X-Telegram-Bot-Api-Secret-Token header |
| 360dialog          | D360-API-KEY header authentication     |
| Phone masking      | PII redacted in logs (`+43***5678`)    |
| Message truncation | Max 4096 chars to prevent DoS          |

_Last updated: 2026-02-08_
