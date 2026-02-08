# Supabase Migrations Runbook

Canonical operational runbook for schema changes and migration automation.

## Current Automation

- Workflow file: `.github/workflows/supabase-migrations.yml`
- Trigger:
  - push to `main` affecting `supabase/migrations/**`
  - manual `workflow_dispatch`
- Apply command in CI:
  - `supabase db push --linked --yes`

Required GitHub Secrets:
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_PASSWORD`
- `VERCEL_DEPLOY_HOOK_URL` (optional)

## Migration Naming Convention (Required)

Use unique 14-digit timestamp versions:

`YYYYMMDDHHMMSS_description.sql`

Example:
- `20260208113000_add_events_end_date.sql`

Rules:
- Version must be unique.
- Never reuse an existing numeric prefix.
- Use lowercase snake_case description.

## Standard Development Flow

1. Create a new SQL migration file in `supabase/migrations/` with unique version.
2. Commit migration with related code changes.
3. Push to `main`.
4. Verify GitHub Action `Supabase Migrations` passed.

## Recovery Playbook

### Case A: CI prompts for confirmation or appears stuck

Expected fix:
- Ensure workflow uses non-interactive command:
  - `supabase db push --linked --yes`

### Case B: CI fails by re-running old migrations

Likely cause:
- migration history mismatch or duplicate version prefixes

Fix:
1. Normalize local migration file versions to unique 14-digit format.
2. Repair migration history in remote project:
   - mark canonical versions as `applied`
   - revert obsolete/legacy versions
3. Re-run workflow.

### Case C: migration conflict in production

1. Stop and do not force-apply.
2. Inspect failing migration SQL and current remote schema.
3. Add a corrective migration with explicit idempotency handling.
4. Re-run workflow.

## Notes

- Manual SQL in Supabase UI is emergency-only.
- Normal path is migration file + CI workflow.
- Keep this runbook in sync with `.github/workflows/supabase-migrations.yml`.

---

Last updated: 2026-02-08
