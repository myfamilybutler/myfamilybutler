-- Family Member Cleanup SQL Script
-- Purpose: Clean up orphaned family_member values that don't match family_members table
-- Date: 2024-12-23
-- ================================

-- STEP 1: PREVIEW - See what will be affected
-- Run this first to understand the impact before making changes

-- Preview orphaned family_member values (events with family_member not in family_members table)
SELECT 
    e.household_id,
    e.family_member as orphaned_name,
    COUNT(*) as event_count,
    STRING_AGG(DISTINCT e.title, ', ' ORDER BY e.title) as sample_events
FROM events e
LEFT JOIN family_members fm 
    ON LOWER(TRIM(e.family_member)) = LOWER(TRIM(fm.name))
    AND e.household_id = fm.household_id
WHERE e.family_member IS NOT NULL
  AND fm.id IS NULL
GROUP BY e.household_id, e.family_member
ORDER BY event_count DESC;

-- See total count of affected events
SELECT 
    COUNT(*) as total_orphaned_events,
    COUNT(DISTINCT e.family_member) as unique_orphan_names,
    COUNT(DISTINCT e.household_id) as affected_households
FROM events e
LEFT JOIN family_members fm 
    ON LOWER(TRIM(e.family_member)) = LOWER(TRIM(fm.name))
    AND e.household_id = fm.household_id
WHERE e.family_member IS NOT NULL
  AND fm.id IS NULL;


-- ================================
-- STEP 2: CLEANUP - Set orphaned family_member to NULL
-- Only run this after reviewing the PREVIEW results above

-- Option A: Clear all orphaned family_member values
/*
UPDATE events e
SET family_member = NULL
WHERE family_member IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM family_members fm
    WHERE LOWER(TRIM(e.family_member)) = LOWER(TRIM(fm.name))
      AND e.household_id = fm.household_id
  );
*/

-- Option B: Clear for specific household only
-- Replace 'YOUR_HOUSEHOLD_ID' with actual ID
/*
UPDATE events e
SET family_member = NULL
WHERE family_member IS NOT NULL
  AND household_id = 'YOUR_HOUSEHOLD_ID'
  AND NOT EXISTS (
    SELECT 1 FROM family_members fm
    WHERE LOWER(TRIM(e.family_member)) = LOWER(TRIM(fm.name))
      AND e.household_id = fm.household_id
  );
*/


-- ================================
-- STEP 3: VERIFICATION
-- Run this after cleanup to confirm it worked

-- Should return 0 rows if cleanup was successful
SELECT COUNT(*) as remaining_orphans
FROM events e
LEFT JOIN family_members fm 
    ON LOWER(TRIM(e.family_member)) = LOWER(TRIM(fm.name))
    AND e.household_id = fm.household_id
WHERE e.family_member IS NOT NULL
  AND fm.id IS NULL;

-- View all valid family member assignments
SELECT 
    e.household_id,
    e.family_member,
    COUNT(*) as event_count
FROM events e
INNER JOIN family_members fm 
    ON LOWER(TRIM(e.family_member)) = LOWER(TRIM(fm.name))
    AND e.household_id = fm.household_id
WHERE e.family_member IS NOT NULL
GROUP BY e.household_id, e.family_member
ORDER BY e.household_id, event_count DESC;
