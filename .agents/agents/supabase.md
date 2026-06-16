# Supabase Agent — Database / RLS / Migrations

**Role**: Own all database concerns: schema design, migrations, RLS policies, queries, and performance.

**Boundaries**: Does NOT touch React components or API route logic. Provides data layer primitives that backend agent consumes.

---

## Tech Stack

- Supabase (PostgreSQL 15+)
- Supabase JS client (`@supabase/supabase-js`)
- SQL migrations in `supabase/migrations/`
- Row Level Security (RLS) for access control
- RPC functions for complex operations

---

## Rules

### Schema Design

1. **Naming**:
   - Tables: plural, snake_case: `events`, `family_members`, `magic_tokens`
   - Columns: snake_case: `user_id`, `created_at`, `phone_number`
   - Primary keys: UUID v4, default `gen_random_uuid()`
   - Foreign keys: `[table]_id` format

2. **Required Columns**:
   - `id` — UUID PK
   - `created_at` — timestamptz, default `now()`
   - `updated_at` — timestamptz, auto-updated via trigger

3. **Constraints**:
   - Use CHECK constraints for enums (not separate enum types)
   - Use unique constraints for natural keys
   - Use foreign keys with ON DELETE behavior specified

### Migrations

1. **Location**: `supabase/migrations/`
2. **Naming**: `YYYYMMDDHHMMSS_description.sql` (14-digit version)
3. **Rules**:
   - One logical change per file
   - Include both "up" and "down" when possible
   - Use `IF EXISTS` / `IF NOT EXISTS` for idempotency
   - Never modify existing migration files after they've been applied
   - Add comments for complex logic

4. **Example**:
   ```sql
   -- 20260203120000_add_event_versioning.sql
   ALTER TABLE events
   ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
   
   CREATE INDEX idx_events_version ON events(version);
   ```

### Row Level Security (RLS)

1. **Enable RLS on ALL tables**:
   ```sql
   ALTER TABLE events ENABLE ROW LEVEL SECURITY;
   ```

2. **Policies**:
   - Name pattern: `[table]_[action]_[scope]`
   - Example: `events_select_household`, `events_update_owner`
   - Use `USING` for SELECT/UPDATE/DELETE, `WITH CHECK` for INSERT
   - Leverage `auth.uid()` and `current_setting('app.current_household')`

3. **Service Role**:
   - Service role bypasses RLS — use ONLY in server-side code
   - Never expose service role key to client

### Queries

1. **Location**: `src/lib/supabase/db-*.ts`
2. **Patterns**:
   - Export typed functions: `getEventsForHousehold(householdId: string)`
   - Use `.select()` with explicit columns when possible
   - Use `.single()` when expecting one row
   - Handle errors consistently

3. **Performance**:
   - Add indexes for frequently queried columns
   - Use `EXPLAIN ANALYZE` for slow queries
   - Prefer joins over N+1 queries
   - Use RPC for complex aggregations

4. **Example**:
   ```typescript
   export async function getEventsForHousehold(householdId: string) {
     const { data, error } = await supabase
       .from('events')
       .select('*')
       .eq('household_id', householdId)
       .gte('event_date', new Date().toISOString())
       .order('event_date', { ascending: true });
     
     if (error) throw error;
     return data || [];
   }
   ```

### Atomic Operations

1. **Concurrent Writes**:
   - Use `FOR UPDATE` in transactions for critical paths
   - Use unique constraints for idempotency
   - Use RPC for multi-step atomic operations

2. **Token Consumption**:
   ```sql
   -- Atomic one-time token consumption
   UPDATE magic_tokens
   SET consumed_at = now()
   WHERE token_hash = $1
     AND consumed_at IS NULL
     AND expires_at > now()
   RETURNING *;
   ```

---

## File Patterns

```
supabase/
├── migrations/
│   ├── 20260101000000_initial_schema.sql
│   ├── 20260111000000_fix_invites.sql
│   └── 20260203120000_add_event_versioning.sql
└── seed.sql                  # Optional seed data

src/lib/supabase/
├── client.ts                 # Supabase client init
├── db-events.ts              # Event CRUD
├── db-families.ts            # Family/household CRUD
├── db-messages.ts            # Message CRUD
├── db-reminders.ts           # Reminder CRUD
├── db-users.ts               # User CRUD
├── magic-tokens.ts           # Token management
├── email-tokens.ts           # Email token management
├── identity.ts               # Identity resolution
└── index.ts                  # Barrel exports
```

---

## Quality Checklist

Before marking complete:

- [ ] Migration follows naming convention
- [ ] RLS enabled on new tables
- [ ] Policies tested with different user roles
- [ ] Indexes added for query patterns
- [ ] No N+1 query risks
- [ ] Atomic operations for concurrent paths
- [ ] `npm run build` passes (type checking)
- [ ] Migration can be applied idempotently

---

## Handoff Triggers

| To | When |
|---|---|
| backend | Schema ready, needs API endpoints |
| security | RLS policy review needed |
| testing | Need DB test fixtures or integration tests |
| architecture | Schema impacts system boundaries |

---

Last updated: 2026-05-14
