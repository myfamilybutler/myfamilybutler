# Messaging Channels Setup Guide

Complete guide for setting up and onboarding users via all messaging channels.

## Channel Overview

| Channel             | Status          | Use Case             | Webhook URL              |
| ------------------- | --------------- | -------------------- | ------------------------ |
| **WhatsApp (Meta)** | Production      | Primary users        | `/api/webhook/whatsapp`  |
| **Telegram**        | Production      | Tech-savvy users     | `/api/webhook/telegram`  |
| **360dialog**       | Sandbox/Testing | Alternative WhatsApp | `/api/webhook/360dialog` |

---

## Provider Configuration

Toggle providers via environment variables:

```bash
# Enable/disable any combination
PROVIDER_WHATSAPP_ENABLED=true
PROVIDER_TELEGRAM_ENABLED=true
PROVIDER_360DIALOG_ENABLED=false
```

Configuration file: `src/lib/channels/providers.config.ts`

---

## 1. WhatsApp (Meta Cloud API)

### Prerequisites

- Meta Business Account
- WhatsApp Business App in Meta Developer Portal
- Phone number verified for WhatsApp Business

### Environment Variables

```bash
WHATSAPP_API_TOKEN=          # System User access token
WHATSAPP_PHONE_ID=           # Phone Number ID
WHATSAPP_VERIFY_TOKEN=       # Custom verify token for webhook
WHATSAPP_APP_SECRET=         # App Secret for signature verification
```

### Webhook Setup

1. Go to **Meta Developer Portal** → Your App → WhatsApp → Configuration
2. Set webhook URL: `https://yourdomain.com/api/webhook/whatsapp`
3. Set Verify Token: same as `WHATSAPP_VERIFY_TOKEN`
4. Subscribe to: `messages`, `message_deliveries`

### User Onboarding Flow

```
User sends message → Bot creates user account → Welcome message sent
         ↓
User types "Dashboard" → Magic link generated → User clicks to access dashboard
```

---

## 2. Telegram

### Prerequisites

- Telegram Bot created via @BotFather
- Bot token

### Environment Variables

```bash
TELEGRAM_BOT_TOKEN=          # From @BotFather
TELEGRAM_WEBHOOK_SECRET=     # Random 32-char secret (generate with: openssl rand -hex 16)
```

### Webhook Setup

Set webhook via API call:

```bash
curl -X POST "https://api.telegram.org/bot{YOUR_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://yourdomain.com/api/webhook/telegram",
    "secret_token": "YOUR_WEBHOOK_SECRET"
  }'
```

### User Onboarding Flow

```
User sends /start → Bot requests phone number via button
         ↓
User shares phone → Account created/linked → Welcome message sent
         ↓
User types "Dashboard" → Magic link generated → User clicks to access dashboard
```

**Note:** Telegram requires phone sharing via a button due to privacy. Users
must explicitly share their number.

---

## 3. 360dialog

### Prerequisites

- 360dialog account (https://www.360dialog.com)
- API key (sandbox or production)

### Environment Variables

```bash
D360_API_KEY=                # API key from 360dialog dashboard
D360_BASE_URL=https://waba-sandbox.360dialog.io  # Sandbox
# D360_BASE_URL=https://waba-v2.360dialog.io     # Production
```

### Webhook Setup

```bash
curl -X POST https://waba-sandbox.360dialog.io/v1/configs/webhook \
  -H "Content-Type: application/json" \
  -H "D360-API-KEY: YOUR_API_KEY" \
  -d '{
    "url": "https://yourdomain.com/api/webhook/360dialog"
  }'
```

### Sandbox Testing

1. Send `START` to **+49 30 609 859 535** (360dialog sandbox)
2. You'll receive your API key
3. Configure webhook with that key
4. Send messages to same number to test

### User Onboarding Flow

Same as WhatsApp:

```
User sends message → Bot creates user account → Welcome message sent
         ↓
User types "Dashboard" → Magic link generated → User clicks to access dashboard
```

---

## Database Updates for 360dialog

Run this SQL in Supabase to enable 360dialog for magic tokens:

```sql
-- Add 360dialog to magic_tokens channel check constraint
ALTER TABLE magic_tokens DROP CONSTRAINT IF EXISTS magic_tokens_channel_check;
ALTER TABLE magic_tokens ADD CONSTRAINT magic_tokens_channel_check 
  CHECK (channel IN ('whatsapp', 'telegram', '360dialog'));
```

---

## User Commands (All Channels)

| Command                        | Description                     |
| ------------------------------ | ------------------------------- |
| `dashboard` / `link` / `login` | Get magic link to web dashboard |
| `start` / `hallo` / `hi`       | Welcome message with usage tips |
| `help` / `hilfe`               | Show available commands         |

---

## Identity Resolution

All channels use phone number as the "Golden Key":

```
┌─────────────────┐
│   WhatsApp      │ ──────┐
├─────────────────┤       │
│   360dialog     │ ──────┼──→  users.phone_number
├─────────────────┤       │
│   Telegram      │ ──────┘
│ (shares phone)  │
└─────────────────┘
```

Users can use multiple channels with the same phone number — all messages and
events are linked to the same account.

---

## Security

| Channel         | Verification Method                      |
| --------------- | ---------------------------------------- |
| WhatsApp (Meta) | `X-Hub-Signature-256` HMAC               |
| Telegram        | `X-Telegram-Bot-Api-Secret-Token` header |
| 360dialog       | `D360-API-KEY` header (outbound only)    |

All channels:

- Phone numbers masked in logs (`+43***5678`)
- Messages truncated to 4096 chars
- Deduplication via message ID

---

## Troubleshooting

### Webhook not receiving messages

1. Check provider is enabled in `.env.local`
2. Verify webhook URL is HTTPS
3. Check deployment has latest code
4. Verify webhook configuration in provider dashboard

### Dashboard command not working

1. Ensure database constraint allows channel: run SQL above
2. Check logs for `generateDashboardLink` errors
3. Verify `D360_API_KEY` matches the one used for webhook

### Messages showing 0 in logs

- 360dialog/Meta wrap messages in nested structure
- Check webhook is parsing `entry[].changes[].value.messages`

---

_Last updated: 2024-12-26_
