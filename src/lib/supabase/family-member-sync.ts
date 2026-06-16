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
  let membersResult = await admin
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

  for (const name of missingNames) {
    const normalized = normalizeFamilyMemberName(name);
    const { error } = await admin
      .from('family_members')
      .insert({
        household_id: householdId,
        name: normalized,
      });

    // Unique violations are expected in race windows and can be ignored.
    if (error && error.code !== '23505') {
      logError('[FamilyMemberSync] Failed inserting family member:', error);
    }
  }

  // Refresh profile members after any insert attempts so callers can resolve IDs.
  membersResult = await admin
    .from('family_members')
    .select('id, name')
    .eq('household_id', householdId);

  if (membersResult.error) {
    logError('[FamilyMemberSync] Failed reading family_members after sync:', membersResult.error);
    return new Map();
  }

  const byNameKey = new Map<string, string>();
  for (const row of membersResult.data ?? []) {
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
