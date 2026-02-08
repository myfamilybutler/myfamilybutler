# WhatsApp Business API Setup

> **Last Updated:** February 8, 2026
>
> Canonical reading order: `docs/INDEX.md`.
>
> Policy and merge gates live in `docs/AI_TOOLING_RULEBOOK.md`.

## Current Status

| Component             | Status                                               |
| --------------------- | ---------------------------------------------------- |
| Phone Number          | ✅ `<configured_business_number>` connected          |
| Webhook URL           | ✅ `https://myfamilybutler.com/api/webhook/whatsapp` |
| API Token             | ✅ Valid (permanent token)                           |
| Code Implementation   | ✅ Complete                                          |
| Business Verification | ⏳ Pending                                           |
| App Review            | ⏳ Pending                                           |

---

## Environment Variables

```env
# WhatsApp Business API
WHATSAPP_API_TOKEN=<permanent_access_token>
WHATSAPP_ACCESS_TOKEN=<media_download_token>
WHATSAPP_PHONE_ID=<phone_number_id>
WHATSAPP_VERIFY_TOKEN=<custom_verify_token>
WHATSAPP_BUSINESS_ACCOUNT_ID=<business_account_id>

# Webhook Security (REQUIRED for production)
WHATSAPP_APP_SECRET=<app_secret_from_meta_developer_portal>

# Provider Switch
PROVIDER_WHATSAPP_ENABLED=true
```

Never commit real IDs, keys, or tokens to documentation.

> **Security Note:** Get `WHATSAPP_APP_SECRET` from Meta Developer Portal → App
> Settings → Basic → App Secret. This is used for webhook signature
> verification.

---

## TODO Checklist

### ✅ Completed

- [x] Register WhatsApp Business phone number
- [x] Verify phone number in Meta Developer Portal
- [x] Create webhook endpoint (`/api/webhook/whatsapp`)
- [x] Configure webhook URL in Meta
- [x] Subscribe to "messages" webhook field
- [x] Generate permanent access token
- [x] Deploy to Vercel with environment variables
- [x] Test webhook verification (GET request)
- [x] Test message processing (POST request)
- [x] Implement message response flow

### ⏳ Waiting / In Progress

- [ ] **Complete Business Verification**
  - Submit business documents to Meta
  - Wait for approval (1-3 business days)
- [ ] **Submit App Review**
  - Request `whatsapp_business_messaging` permission
  - Wait for approval
- [ ] **Testing with Real Users**
  - Currently: Only testers can trigger webhooks
  - After approval: Any user can message

---

## Business Verification Requirements

### Documents Needed

- Business registration certificate OR
- Tax registration document OR
- Utility bill with business name and address

### Steps

1. Go to
   [Meta Business Settings](https://business.facebook.com/settings/security)
2. Click "Start Verification"
3. Upload required documents
4. Wait 1-3 business days

---

## App Review Requirements

### Permission Needed

`whatsapp_business_messaging`

### Steps

1. Go to **Developer Portal** → **Permissions and features**
2. Find `whatsapp_business_messaging`
3. Click **Actions** → **Request App Review**
4. Provide:
   - App description
   - Privacy policy URL
   - Screenshots/video of functionality
5. Submit and wait for approval

---

## Code Changes After Verification

> **No code changes required!** The current implementation is production-ready.

Once business verification and app review are complete:

1. ✅ Webhooks will automatically start receiving real user messages
2. ✅ No code modifications needed
3. ✅ No environment variable changes needed

---

## Testing While Waiting for Verification

### Add Testers (up to 25)

1. Go to **Developer Portal** → **App Roles** → **Roles**
2. Click **Add People** → Select **Tester**
3. Enter tester's Facebook email
4. Tester accepts invitation
5. Tester's WhatsApp must be linked to that Facebook account

---

## Webhook Endpoint Reference

| Method | Path                    | Purpose                   |
| ------ | ----------------------- | ------------------------- |
| GET    | `/api/webhook/whatsapp` | Webhook verification      |
| POST   | `/api/webhook/whatsapp` | Receive incoming messages |

### Supported Message Types

- ✅ Text messages
- ✅ Image messages (caption only)
- ✅ Voice messages (placeholder)
- ✅ Document messages (filename only)
- ✅ Video messages (caption only)

### Special Commands

| Command                      | Action              |
| ---------------------------- | ------------------- |
| `start`, `hallo`, `hi`       | Welcome message     |
| `help`, `hilfe`              | Help message        |
| `dashboard`, `link`, `login` | Generate magic link |

---

## Useful Links

- [Meta Developer Portal](https://developers.facebook.com)
- [Meta Business Settings](https://business.facebook.com/settings)
- [WhatsApp Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Webhook Reference](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks)
