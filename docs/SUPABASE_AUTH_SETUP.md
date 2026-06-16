# Supabase Auth Setup Guide

This project uses **native Supabase Auth** with the official `@supabase/ssr` package. This guide covers the required dashboard configuration after deploying the auth migration.

## 1. Apply the database migration

Run the migration in your Supabase project:

```bash
npx supabase migration up
```

Or execute `supabase/migrations/20260616000001_central_supabase_auth.sql` manually in the Supabase SQL Editor.

This migration:
- Adds a trigger that automatically creates/updates a `public.users` row whenever a user is created in `auth.users`.
- Updates the `onboarding_source` constraint to allow `'web'` sign-ups.

## 2. Configure Site URL and Redirect URLs

In your Supabase dashboard:

1. Go to **Authentication → URL Configuration**.
2. Set **Site URL** to your production domain, e.g. `https://myfamilybutler.com`.
3. Add `/auth/callback` to **Redirect URLs**:
   - `https://myfamilybutler.com/auth/callback`
   - `http://localhost:3000/auth/callback` (for local development)

## 3. Enable email/password auth

In **Authentication → Providers → Email**:

- Enable **Email provider**.
- Decide whether to require email confirmation:
  - **Recommended for production**: Enable **Confirm email**.
  - For faster local testing, you can disable it.

## 4. Configure Google OAuth

### Google

1. Go to **Authentication → Providers → Google**.
2. Enable it.
3. Add your Google OAuth client ID and secret.
4. Set the authorized redirect URI in Google Cloud Console to:
   `https://<your-project-ref>.supabase.co/auth/v1/callback`
5. Add your production and local domains to **Authorized JavaScript origins**.

## 5. (Optional but recommended) Use a custom SMTP provider

By default, Supabase Auth sends emails from a shared Supabase domain. For branded emails and better deliverability, configure a custom SMTP provider such as **Resend**.

### Resend SMTP setup

1. In Resend, create an API key with **Sending access**.
2. Verify and configure your sending domain (e.g. `mail.myfamilybutler.com` or `myfamilybutler.com`).
3. In your Supabase dashboard, go to **Authentication → SMTP Settings**.
4. Enable **Custom SMTP** and enter:

| Field | Value |
|-------|-------|
| Host | `smtp.resend.com` |
| Port | `465` (SSL) or `587` (STARTTLS) |
| Username | `resend` |
| Password | Your Resend API key |
| Sender email | `noreply@mail.myfamilybutler.com` (or `noreply@myfamilybutler.com`) |
| Sender name | `MyFamilyButler` |

5. Save and send a test email from the Supabase dashboard.

### Why use custom SMTP?

- Emails come from your own domain.
- You control templates and sender name.
- Better deliverability and reputation.

If you do **not** configure custom SMTP, Supabase will still send verification and password-reset emails using its default provider. No code changes are required either way.

## 6. Environment variables

Ensure your application has these environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

For local development, add them to `.env.local`.

## 7. Testing the flow

1. Start the app locally: `npm run dev`
2. Visit `http://localhost:3000/register`.
3. Sign up with email and password.
4. Check that a `public.users` row is created with `id` matching `auth.users.id`.
5. Test Google OAuth sign-in.
6. If email confirmation is enabled, click the verification link and confirm `email_verified` becomes `true`.
