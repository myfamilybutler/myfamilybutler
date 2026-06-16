import { getAdminClient } from './client';
import { logError } from '@/lib/utils/logger';
import {
  collectAutoCreatableFamilyMemberNames,
  familyMemberNameKey,
  normalizeFamilyMemberName,
} from '@/lib/utils/family-members';

/**
 * Promotes event-level family_member labels into persisted family_members rows.
 * This keeps Settings and Calendar member badges in sync.
 */
export async function ensureAndResolveFamilyMemberIds(
  householdId: string,
  memberNames: Array<string | null | undefined>
): Promise<Map<string, string>> {
  const candidates = collectAutoCreatableFamilyMemberNames(memberNames);
  if (candidates.length === 0) {
    return new Map();
  }

  const admin = getAdminClient();
  const membersResult = await admin
    .from('family_members')
    .select('id, name')
    .eq('household_id', householdId);
  const { data: usersData, error: usersError } = await admin
    .from('users')
    .select('display_name')
    .eq('household_id', householdId)
    .not('display_name', 'is', null);

  const existingFamilyKeys = new Set<string>();
  const existingUserKeys = new Set<string>();

  if (membersResult.error) {
    logError('[FamilyMemberSync] Failed reading family_members:', membersResult.error);
  } else {
    for (const row of membersResult.data ?? []) {
      if (!row.name) continue;
      existingFamilyKeys.add(familyMemberNameKey(row.name));
    }
  }

  if (usersError) {
    logError('[FamilyMemberSync] Failed reading household users:', usersError);
  } else {
    for (const row of usersData ?? []) {
      if (!row.display_name) continue;
      existingUserKeys.add(familyMemberNameKey(row.display_name));
    }
  }

  const missingNames = candidates.filter((name) => {
    const key = familyMemberNameKey(name);
    return !existingFamilyKeys.has(key) && !existingUserKeys.has(key);
  });

  // Batch upsert all missing members. onConflict + ignoreDuplicates skips rows
  // that already exist (e.g., inserted by a concurrent request) and .select()
  // returns only the newly inserted rows, avoiding a second full table read.
  const insertedRows: Array<{ id: string; name: string }> = [];
  if (missingNames.length > 0) {
    const missingRows = missingNames.map((name) => ({
      household_id: householdId,
      name: normalizeFamilyMemberName(name),
    }));

    const { data: insertData, error: insertError } = await admin
      .from('family_members')
      .upsert(missingRows, {
        onConflict: 'household_id,name',
        ignoreDuplicates: true,
      })
      .select('id, name');

    if (insertError && insertError.code !== '23505') {
      logError('[FamilyMemberSync] Failed batch upserting family members:', insertError);
    }

    for (const row of insertData ?? []) {
      insertedRows.push(row as { id: string; name: string });
    }
  }

  // Build the map from the original read plus the rows we just inserted.
  // We intentionally avoid re-reading the entire table again.
  const byNameKey = new Map<string, string>();
  for (const row of (membersResult.data ?? []).concat(insertedRows)) {
    if (!row.name) continue;
    const key = familyMemberNameKey(row.name);
    byNameKey.set(key, row.id);
  }

  return byNameKey;
}

/**
 * Write-only convenience wrapper used in call sites that do not need IDs.
 */
export async function ensureFamilyMembersForNames(
  householdId: string,
  memberNames: Array<string | null | undefined>
): Promise<void> {
  await ensureAndResolveFamilyMemberIds(householdId, memberNames);
}
