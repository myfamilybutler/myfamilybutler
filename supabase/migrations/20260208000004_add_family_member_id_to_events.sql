-- Phase 2: Stable member linkage on events
-- Add FK-based assignment for profile members while keeping family_member text
-- for backwards compatibility and household-user labels.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS family_member_id UUID
  REFERENCES public.family_members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_family_member_id
  ON public.events(family_member_id)
  WHERE family_member_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_household_family_member_id
  ON public.events(household_id, family_member_id)
  WHERE family_member_id IS NOT NULL;

-- Backfill from existing denormalized labels by normalized name match.
WITH normalized_members AS (
  SELECT
    id,
    household_id,
    lower(regexp_replace(btrim(name), '\s+', ' ', 'g')) AS normalized_name
  FROM public.family_members
),
normalized_events AS (
  SELECT
    id,
    household_id,
    lower(regexp_replace(btrim(family_member), '\s+', ' ', 'g')) AS normalized_member
  FROM public.events
  WHERE family_member IS NOT NULL
    AND btrim(family_member) <> ''
    AND family_member_id IS NULL
)
UPDATE public.events e
SET family_member_id = m.id
FROM normalized_events ne
JOIN normalized_members m
  ON m.household_id = ne.household_id
 AND m.normalized_name = ne.normalized_member
WHERE e.id = ne.id
  AND e.family_member_id IS NULL;

COMMENT ON COLUMN public.events.family_member_id IS
  'Optional FK to family_members for stable member assignment. Null for household users or unlinked labels.';
