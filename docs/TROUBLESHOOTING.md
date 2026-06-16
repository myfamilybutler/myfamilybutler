# Troubleshooting Guide

Common problems and how to fix them when developing or operating
MyFamilyButler.

## Local Development

### `npm install` fails

- Make sure you are using **Node.js 22+** (see [`.nvmrc`](../.nvmrc)).
- Delete `node_modules` and `package-lock.json`, then reinstall:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```

### `npm run dev` fails to start

- Verify `.env.local` exists:
  ```bash
  cp .env.local.example .env.local
  ```
- Fill in at least `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### `npm run build` fails with environment errors

- The build validates that required environment variables are present.
- Set placeholder values locally if you only need to verify compilation:
  ```bash
  NEXT_PUBLIC_SUPABASE_URL=http://localhost NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder npm run build
  ```

### Tests fail with module resolution errors

- Check that path aliases in `tsconfig.json` and `vitest.config.ts` match.
- Run tests with verbose output:
  ```bash
  npm test -- --run --reporter=verbose
  ```

## Supabase

### Migration validation fails in CI

- Migration filenames must follow `YYYYMMDDHHMMSS_description.sql`.
- Versions must be unique and sorted.
- See [RUNBOOK_SUPABASE_MIGRATIONS.md](./RUNBOOK_SUPABASE_MIGRATIONS.md).

### Local Supabase CLI commands fail

- Ensure you are linked to the correct project:
  ```bash
  supabase link --project-ref <project-ref>
  ```
- Verify `SUPABASE_ACCESS_TOKEN` is set and not expired.

## Messaging Channels

### WhatsApp webhook not receiving messages

1. Check `PROVIDER_WHATSAPP_ENABLED=true` in `.env.local`.
2. Verify the webhook URL is HTTPS and reachable from the internet.
3. Confirm `WHATSAPP_VERIFY_TOKEN` matches Meta's configuration.
4. Check that `WHATSAPP_APP_SECRET` is set for production signature verification.

### Telegram webhook returns 401

- Verify `TELEGRAM_WEBHOOK_SECRET` matches the secret set in `setWebhook`.
- Re-register the webhook if the secret changed:
  ```bash
  curl -X POST "https://api.telegram.org/bot<token>/setWebhook" \
    -H "Content-Type: application/json" \
    -d '{"url":"https://yourdomain.com/api/webhook/telegram","secret_token":"YOUR_SECRET"}'
  ```

### 360dialog messages show as empty

- 360dialog and Meta wrap payloads in nested structures.
- Check that `entry[].changes[].value.messages` is parsed correctly.
- See [MESSAGING_CHANNELS.md](./MESSAGING_CHANNELS.md).

## AI / Event Extraction

### Events are not extracted from messages

- Check that at least one AI key is set (`GOOGLE_GEMINI_API_KEY` or
  `OPENAI_API_KEY`).
- Verify model names in `src/lib/ai/providers/*.ts` are still valid.
- Look for Zod validation errors in the logs.

### Image processing fails

- Supported formats: JPEG, PNG, WebP.
- Ensure the image is under the provider's size limit.
- Check `processLocalImage` logs for provider-specific errors.

## Google Calendar Sync

### Sync fails or stops

- Verify OAuth credentials in Google Cloud Console.
- Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` match the Console.
- Ensure the refresh token has not been revoked by the user.

## Still Stuck?

- Check [docs/INDEX.md](./INDEX.md) for the full documentation map.
- Search [GitHub Issues](https://github.com/myfamilybutler/myfamilybutler/issues).
- Start a [GitHub Discussion](https://github.com/myfamilybutler/myfamilybutler/discussions).

---

_Last updated: 2026-06-16_
