# Project Architecture & Status Report

## 1. The "Clean" Stack (Active Technology)

_List only the technologies that are CRITICAL. Mark others as "To Deprecate"._

| Component     | Active Choice                | Status in Code                              |
| :------------ | :--------------------------- | :------------------------------------------ |
| **Framework** | Next.js 16 (App Router)      | ✅ Implemented (v16.0.10 in `package.json`) |
| **Database**  | Supabase                     | ✅ Active (`src/lib/supabase/`)             |
| **Auth**      | Supabase Auth + Magic Tokens | ✅ Active (`src/lib/auth/`)                 |
| **Messaging** | WhatsApp + Telegram          | ✅ Active (`src/lib/channels/`)             |
| **AI**        | Gemini + OpenAI (fallback)   | ✅ Active (`src/lib/ai/`)                   |
| **Vision**    | Gemini Vision + OpenAI       | ✅ Active (`src/actions/process-vision.ts`) |

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
│       └── gemini.ts          # Gemini 1.5 Flash (primary)
│
├── agents/                     # 🤖 Specialized AI agents
│   └── vision-agent.ts        # Image → Event extraction
│
├── auth/                       # 🔐 Authentication & security
│   ├── index.ts
│   ├── helpers.ts             # validateSession
│   └── vault.ts               # Supabase Vault token storage
│
├── channels/                   # 📱 Messaging integrations
│   ├── index.ts
│   ├── telegram.ts            # Telegram Bot API
│   ├── whatsapp.ts            # Meta WhatsApp API
│   ├── message-processor.ts   # Unified message handling
│   └── providers.config.ts    # Provider on/off switches
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
│   └── google.ts              # Google Calendar sync
│
├── utils/                      # 🛠️ Generic utilities
│   ├── cn.ts                  # Tailwind class merging
│   ├── fetch.ts               # fetchWithTimeout
│   ├── logger.ts              # Logging utilities
│   ├── phone.ts               # Phone number formatting
│   ├── security.ts            # Webhook verification, masking
│   └── ui-helpers.ts          # getMemberColor, getInitials
│
└── config.ts                   # ⚙️ App configuration
```

## 3. AI Provider Strategy (Cost Optimized)

### Text Processing

```
User Message → Gemini 1.5 Flash (FREE) → OpenAI GPT-4o-mini ($0.15/1M)
```

### Image/Vision Processing

```
Image → Gemini 1.5 Flash Vision (FREE) → OpenAI GPT-4o-mini ($0.15/1M)
```

| Provider              | Model       | Cost           | Use Case          |
| --------------------- | ----------- | -------------- | ----------------- |
| **Gemini (Primary)**  | 1.5 Flash   | Free tier      | Text + Vision     |
| **OpenAI (Fallback)** | GPT-4o-mini | $0.15/1M input | When Gemini fails |

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

### Message Processing Flow

1. **User sends message** → Received by webhook
2. **Deduplication check** → Prevent processing same message twice
3. **Command handling** → Dashboard/Start/Help commands intercepted
4. **Image detection** → If image, process with Vision Agent (Gemini → OpenAI)
5. **Intent parsing** → Reminder/Event detection via AI (Gemini → OpenAI)
6. **AI Response** → `generateResponseWithFallback` for general queries
7. **Response sent** → Via WhatsApp/Telegram API

## 5. Identity Resolution (Multi-Provider)

**Phone Number is the Golden Key** - all channels resolve to phone:

| Entry Point | Primary ID                       | Links To           |
| ----------- | -------------------------------- | ------------------ |
| WhatsApp    | `phone_number` (wa_id)           | users.phone_number |
| Telegram    | `telegram_chat_id` → phone share | users.phone_number |
| Web/Email   | `email` + onboarding phone       | users.phone_number |

## 6. Key Files (Updated Paths)

| File                                    | Purpose                        |
| --------------------------------------- | ------------------------------ |
| `src/lib/supabase/client.ts`            | Supabase client initialization |
| `src/lib/ai/index.ts`                   | AI router with fallback logic  |
| `src/lib/channels/message-processor.ts` | Unified message processing     |
| `src/lib/channels/providers.config.ts`  | Provider on/off switches       |
| `src/lib/utils/security.ts`             | Webhook verification, masking  |
| `src/app/api/webhook/whatsapp/route.ts` | WhatsApp message handling      |
| `src/app/api/webhook/telegram/route.ts` | Telegram message handling      |
| `src/actions/process-vision.ts`         | Image → Event extraction       |
| `src/middleware.ts`                     | Route protection               |

## 7. Provider Switching

Toggle messaging providers via environment variables:

```bash
# Production (WhatsApp only)
PROVIDER_WHATSAPP_ENABLED=true
PROVIDER_TELEGRAM_ENABLED=false

# Testing (Telegram)
PROVIDER_TELEGRAM_ENABLED=true
PROVIDER_WHATSAPP_ENABLED=false
```

## 8. Webhook Security

| Feature            | Implementation                         |
| ------------------ | -------------------------------------- |
| WhatsApp signature | X-Hub-Signature-256 HMAC verification  |
| Telegram secret    | X-Telegram-Bot-Api-Secret-Token header |
| Phone masking      | PII redacted in logs (`+43***5678`)    |
| Message truncation | Max 4096 chars to prevent DoS          |
