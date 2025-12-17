# Project Architecture & Status Report

## 1. The "Clean" Stack (Active Technology)

_List only the technologies that are CRITICAL. Mark others as "To Deprecate"._

| Component     | Active Choice           | Status in Code                              |
| :------------ | :---------------------- | :------------------------------------------ |
| **Framework** | Next.js 16 (App Router) | ✅ Implemented (v16.0.10 in `package.json`) |
| **Database**  | Supabase                | ✅ Active (`src/lib/supabase.ts`)           |
| **Auth**      | Supabase Auth (OTP)     | 🚧 In Progress                              |
| **Messaging** | Meta Cloud API          | ❌ Missing / Currently using **WaSender**   |
| **AI**        | OpenAI (GPT-4)          | ✅ Active (`src/lib/openai.ts`)             |

## 2. The Data Flow (How it works)

_Describe the lifecycle of a message._

**Current Flow (WaSender) - TO BE REPLACED:**

1. **User sends "Dinner?"** -> Sent to WaSender.
2. **Webhook** -> `src/app/api/webhook/whatsapp/route.ts` receives
   `messages.received` event.
3. **Auth Check** -> `findOrCreateUser` (Supabase) using phone number.
4. **Intent Processing** -> `parseReminderIntent` / `parseEventIntent` (OpenAI).
5. **AI Response** -> `generateAIResponse` (OpenAI).
6. **Response** -> `sendWhatsAppMessage` (WaSender API) sends reply.

**Target Flow (Meta Cloud API) - THE GOAL:**

1. **User sends "Dinner?"** -> Sent to Meta WhatsApp Cloud.
2. **Webhook** -> `src/app/api/webhook/whatsapp/route.ts` receives secured POST
   from Meta.
3. **Auth Check** -> Supabase User Lookup (Phone Number).
4. **AI Processing** -> OpenAI Assistant / Chat Completion.
5. **Response** -> `POST https://graph.facebook.com/v21.0/.../messages` (Meta
   API).

## 3. The "Testing" Pivot (Strategy)

_We are blocked on WhatsApp Verification. We need a "Sandbox" strategy._

- **Phase 1: Telegram Bot (The Brain Sandbox)**
  - _Plan:_ Use Telegram to test the _Logic_ (OpenAI + Database + Auth flows)
    without Meta's restrictions and business verification hurdles.
  - _Action:_ Create `src/app/api/webhook/telegram/route.ts` and
    `src/lib/telegram.ts`.
- **Phase 2: WhatsApp Test Number**
  - _Plan:_ Use the Meta Test Number (+1 555...) strictly for developer testing.
  - _Action:_ Configure `WHATSAPP_TEST_NUMBER_ID` and ensure webhook handles
    Meta's specific payload structure (different from WaSender).

## 4. Cleanup Checklist (Immediate Actions)

_List specific files or folders to DELETE or REFACTOR._

- [ ] **Delete** `src/lib/firebase.ts` (Legacy Auth).
- [ ] **Refactor** `src/lib/whatsapp.ts` (Replace WaSender implementation with
      Meta Cloud API).
- [ ] **Delete** `src/lib/test-whatsapp.ts` (WaSender specific tests).
- [ ] **Refactor** `src/app/api/webhook/whatsapp/route.ts` to handle Meta
      payloads instead of WaSender events.
- [ ] **Verify** `package.json` dependencies (Ensure `firebase` is removed if
      not used elsewhere).
