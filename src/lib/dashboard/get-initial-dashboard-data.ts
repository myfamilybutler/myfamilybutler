/**
 * Server-only helper that loads the exact same dashboard payload as
 * `GET /api/dashboard`, but without an extra HTTP round-trip.
 */

import { getAdminClient } from '@/lib/supabase/client';
import { getDashboardUser } from '@/lib/supabase/db-users';
import { getEventsForHousehold } from '@/lib/supabase/db-events';
import { getFamilyMembers } from '@/lib/supabase/db-families';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { CalendarEvent } from '@/types/calendar';
import type { FamilyMember } from '@/stores/family-store';
import type { DbUser } from '@/stores/auth-store';

export interface InitialDashboardData {
  user: DbUser;
  events: CalendarEvent[];
  family: {
    members: FamilyMember[];
    users: FamilyMember[];
    profileMembers: FamilyMember[];
    isHouseholdAdmin: boolean;
    hasGeminiKey: boolean;
  };
}

export async function getInitialDashboardData(
  authUser: SupabaseUser
): Promise<InitialDashboardData | null> {
  const user = await getDashboardUser(authUser.id, authUser);
  if (!user) {
    return null;
  }

  const householdId = user.household_id as string | null | undefined;

  // Load family data first so the member list can be reused for event hydration.
  const family = await getInitialFamilyData(authUser.id, householdId);

  let events: CalendarEvent[] = [];
  if (householdId) {
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth() - 3, 1)
      .toISOString()
      .split('T')[0];
    const endDate = new Date(today.getFullYear(), today.getMonth() + 6, 0)
      .toISOString()
      .split('T')[0];

    events = (await getEventsForHousehold(householdId, startDate, endDate)) as CalendarEvent[];
  }

  return { user: user as DbUser, events, family };
}

async function getInitialFamilyData(userId: string, householdId: string | null | undefined) {
  const defaultFamily = {
    members: [] as FamilyMember[],
    users: [] as FamilyMember[],
    profileMembers: [] as FamilyMember[],
    isHouseholdAdmin: false,
    hasGeminiKey: false,
  };

  if (!householdId) {
    return defaultFamily;
  }

  const admin = getAdminClient();

  const [members, householdResult] = await Promise.all([
    getFamilyMembers(householdId),
    admin.from('households').select('gemini_api_key').eq('id', householdId).maybeSingle(),
  ]);

  const users: FamilyMember[] = [];
  const profileMembers: FamilyMember[] = [];

  for (const user of members.users) {
    const name = user.display_name || user.phone_number;
    if (name) {
      users.push({
        id: user.id,
        name,
        display_name: user.display_name,
        phone_number: user.phone_number,
        linked_email: user.linked_email,
        is_household_admin: user.is_household_admin,
      });
    }
  }

  for (const member of members.familyMembers) {
    profileMembers.push({ id: member.id, name: member.name, color: member.color });
  }

  return {
    members: [...users, ...profileMembers],
    users,
    profileMembers,
    isHouseholdAdmin: users.some((u) => u.id === userId && u.is_household_admin),
    hasGeminiKey: !!householdResult?.data?.gemini_api_key,
  };
}
