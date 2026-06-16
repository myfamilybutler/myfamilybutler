# Messaging Agent — WhatsApp / Telegram / 360dialog

**Role**: Own all messaging channel integrations: webhooks, message sending, provider adapters, and onboarding flows.

**Boundaries**: Does NOT touch AI parsing logic or database schemas. Uses AI agent for NLP and Supabase agent for data persistence.

---

## Tech Stack

- WhatsApp Cloud API (Meta)
- Telegram Bot API
- 360dialog WhatsApp API
- Webhook signature verification
- Supabase for user lookup/creation

---

## Rules

### Provider Architecture

1. **Consistent Folder Structure**:
   ```
   src/lib/channels/
   ├── whatsapp/
   │   ├── adapter.ts    # Webhook handler
   │   └── send.ts       # Message sending
   ├── telegram/
   │   ├── adapter.ts
   │   ├── send.ts
   │   └── onboarding.ts
   ├── 360dialog/
   │   ├── adapter.ts
   │   └── send.ts
   └── providers.config.ts  # On/off switches
   ```

2. **Adapter Pattern**:
   - Each adapter normalizes provider-specific payloads to a common format
   - Returns standardized `{ userId, message, attachments, metadata }`

### Webhook Security

1. **Verification Order**:
   - Verify signature/secret FIRST
   - Parse body ONLY after verification
   - Return 200 for invalid signatures (don't leak existence)
   - Fail closed in production

2. **Provider-Specific**:
   | Provider | Method | Header/Body |
   |---|---|---|
   | WhatsApp | HMAC-SHA256 | `X-Hub-Signature-256` |
   | Telegram | Secret token | `X-Telegram-Bot-Api-Secret-Token` |
   | 360dialog | API key | `D360-API-KEY` |

### Message Sending

1. **Common Interface**:
   ```typescript
   interface SendMessageParams {
     to: string;           // Phone number or chat ID
     text: string;         // Message text
     buttons?: Button[];   // Optional interactive buttons
   }
   ```

2. **Button Types**:
   - WhatsApp/360dialog: CTA URL button
   - Telegram: Inline keyboard URL button
   - Fallback: Plain text link

3. **Error Handling**:
   - Retry once on transient failures
   - Log failed sends with provider error codes
   - Don't block response on send failures

### Deduplication

1. **DB-Backed Only**:
   - Store processed message IDs in `processed_messages` table
   - Check BEFORE processing
   - TTL: 7 days for message IDs

2. **Pattern**:
   ```typescript
   const isDuplicate = await checkMessageProcessed(messageId);
   if (isDuplicate) return new Response('OK'); // Already processed
   await markMessageProcessed(messageId);
   ```

### User Onboarding

1. **WhatsApp/360dialog**:
   - User sends first message → create user by phone
   - No explicit onboarding needed

2. **Telegram**:
   - User sends `/start` → request phone number
   - User shares phone → create/link account
   - Phone is the golden key for identity

### Provider Switching

Toggle via environment variables:
```bash
PROVIDER_WHATSAPP_ENABLED=true
PROVIDER_TELEGRAM_ENABLED=false
PROVIDER_360DIALOG_ENABLED=false
```

---

## File Patterns

```
src/lib/channels/
├── index.ts                  # Barrel exports
├── providers.config.ts       # On/off switches
├── whatsapp/
│   ├── adapter.ts           # Webhook handler
│   └── send.ts              # Send messages
├── telegram/
│   ├── adapter.ts
│   ├── send.ts
│   └── onboarding.ts
└── 360dialog/
    ├── adapter.ts
    └── send.ts

src/app/api/webhook/
├── whatsapp/route.ts
├── telegram/route.ts
└── 360dialog/route.ts
```

---

## Quality Checklist

Before marking complete:

- [ ] Webhook signatures verified
- [ ] Deduplication works across restarts
- [ ] Message sending has retry logic
- [ ] PII masked in logs
- [ ] Provider switches work correctly
- [ ] Error responses don't leak internals
- [ ] `npm run lint` passes
- [ ] `npm run build` passes

---

## Handoff Triggers

| To | When |
|---|---|
| backend | Webhook needs API integration |
| ai-systems | Message needs AI parsing |
| supabase | User creation/lookup needed |
| security | Webhook security review |
| testing | Need webhook test coverage |

---

Last updated: 2026-05-14
