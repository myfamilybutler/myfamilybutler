# Project Architecture & Status Report

## 1. The "Clean" Stack (Active Technology)

_List only the technologies that are CRITICAL. Mark others as "To Deprecate"._

| Component     | Active Choice            | Status in Code                              |
| :------------ | :----------------------- | :------------------------------------------ |
| **Framework** | Next.js 16 (App Router)  | ✅ Implemented (v16.0.10 in `package.json`) |
| **Database**  | Supabase                 | ✅ Active (`src/lib/supabase.ts`)           |
| **Auth**      | Supabase Auth (Implicit) | ✅ Active (`generateDashboardLink()`)       |
| **Messaging** | Meta Cloud API           | ✅ Active (`src/lib/whatsapp.ts`)           |
| **Telegram**  | Bot API                  | ✅ Active (`src/lib/telegram.ts`)           |
| **AI**        | OpenAI (GPT-4)           | ✅ Active (`src/lib/openai.ts`)             |

## 2. The Data Flow (How it works)

_Describe the lifecycle of a message and authentication._

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
4. **Intent parsing** → Reminder/Event detection via OpenAI
5. **AI Response** → `generateAIResponse` for general queries
6. **Response sent** → Via WhatsApp/Telegram API

## 3. Identity Resolution (Multi-Provider)

**Phone Number is the Golden Key** - all channels resolve to phone:

| Entry Point | Primary ID                       | Links To           |
| ----------- | -------------------------------- | ------------------ |
| WhatsApp    | `phone_number` (wa_id)           | users.phone_number |
| Telegram    | `telegram_chat_id` → phone share | users.phone_number |
| Web/Email   | `email` + onboarding phone       | users.phone_number |

**Merge Rules:**

- Email user adds phone (phone user exists) → Keep email user, merge data
- Messaging user requests dashboard → Create proxy auth, don't duplicate
- Same phone, different emails → Block (likely error/attack)

## 4. Key Files

| File                                    | Purpose                                  |
| --------------------------------------- | ---------------------------------------- |
| `src/lib/supabase.ts`                   | Database ops + `generateDashboardLink()` |
| `src/app/api/webhook/whatsapp/route.ts` | WhatsApp message handling                |
| `src/app/api/webhook/telegram/route.ts` | Telegram message handling                |
| `src/middleware.ts`                     | Route protection                         |
| `src/lib/openai.ts`                     | AI intent parsing                        |
