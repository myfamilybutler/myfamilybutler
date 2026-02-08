-- Keep family member badges stable between calendar events and Settings.
-- 1) Normalize existing names
-- 2) Remove case/whitespace duplicates
-- 3) Enforce case-insensitive uniqueness per household
-- 4) Backfill profile members from existing event family_member labels

-- Normalize whitespace in existing member names
UPDATE public.family_members
SET name = regexp_replace(btrim(name), '\s+', ' ', 'g')
WHERE name IS NOT NULL
  AND name <> regexp_replace(btrim(name), '\s+', ' ', 'g');

-- Remove empty member names
DELETE FROM public.family_members
WHERE name IS NULL
  OR btrim(name) = '';

-- Remove duplicates (keep oldest row per household + normalized-name key)
WITH ranked_members AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY household_id, lower(regexp_replace(btrim(name), '\s+', ' ', 'g'))
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.family_members
)
DELETE FROM public.family_members fm
USING ranked_members rm
WHERE fm.id = rm.id
  AND rm.rn > 1;

-- Enforce uniqueness for normalized names within household
CREATE UNIQUE INDEX IF NOT EXISTS idx_family_members_household_name_ci
  ON public.family_members (
    household_id,
    lower(regexp_replace(btrim(name), '\s+', ' ', 'g'))
  );

-- Backfill missing family members from event labels (skip obvious multi-name strings)
WITH candidate_members AS (
  SELECT
    e.household_id,
    regexp_replace(btrim(e.family_member), '\s+', ' ', 'g') AS name
  FROM public.events e
  WHERE e.family_member IS NOT NULL
    AND btrim(e.family_member) <> ''
    AND btrim(e.family_member) !~* '(,|;|/|&|\+|(^|[[:space:]])(und|and)([[:space:]]|$))'
  GROUP BY
    e.household_id,
    regexp_replace(btrim(e.family_member), '\s+', ' ', 'g')
)
INSERT INTO public.family_members (household_id, name)
SELECT cm.household_id, cm.name
FROM candidate_members cm
WHERE NOT EXISTS (
  SELECT 1
  FROM public.family_members fm
  WHERE fm.household_id = cm.household_id
    AND lower(regexp_replace(btrim(fm.name), '\s+', ' ', 'g')) = lower(cm.name)
)
AND NOT EXISTS (
  SELECT 1
  FROM public.users u
  WHERE u.household_id = cm.household_id
    AND u.display_name IS NOT NULL
    AND lower(regexp_replace(btrim(u.display_name), '\s+', ' ', 'g')) = lower(cm.name)
)
ON CONFLICT DO NOTHING;
