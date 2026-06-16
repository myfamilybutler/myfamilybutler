/**
 * Server-only helper that loads the exact same dashboard payload as
 * `GET /api/dashboard`, but without an extra HTTP round-trip.
 */

import { getAdminClient } from '@/lib/supabase/client';
import { ensureUserFromAuth } from '@/lib/supabase/db-users';
import {
  getEventsForHousehold,
  hydrateEventsWithFamilyMembers,
} from '@/lib/supabase/db-events';
import { getFamilyMembers } from '@/lib/supabase/db-families';
import { log } from '@/lib/utils/logger';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { CalendarEvent } from '@/types/calendar';
import type { FamilyMember } from '@/stores/family-store';
import type { DbUser } from '@/stores/auth-store';

export const DASHBOARD_USER_COLUMNS =
  'id, display_name, phone_number, household_id, is_household_admin, onboarding_completed, onboarding_modal_shown, identity_linked_at, linked_email, email_verified, phone_verified, telegram_chat_id, whatsapp_verified, is_admin';

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
  const supabase = getAdminClient();

  let { data: user } = await supabase
    .from('users')
    .select(DASHBOARD_USER_COLUMNS)
    .eq('id', authUser.id)
    .single();

  if (!user) {
    log.warn('[Dashboard SSR] User row missing, creating from auth session:', authUser.id);
    const created = await ensureUserFromAuth(authUser);
    if (!created) {
      log.error('[Dashboard SSR] Failed to create missing user row:', authUser.id);
      return null;
    }

    const { data: refetched } = await supabase
      .from('users')
      .select(DASHBOARD_USER_COLUMNS)
      .eq('id', authUser.id)
      .single();

    if (!refetched) {
      log.error('[Dashboard SSR] Failed to refetch created user row:', authUser.id);
      return null;
    }
    user = refetched;
  }

  let events: CalendarEvent[] = [];
  const householdId = user.household_id as string | null | undefined;

  if (householdId) {
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth() - 3, 1)
      .toISOString()
      .split('T')[0];
    const endDate = new Date(today.getFullYear(), today.getMonth() + 6, 0)
      .toISOString()
      .split('T')[0];

    const rawEvents = await getEventsForHousehold(householdId, startDate, endDate);
    events = (await hydrateEventsWithFamilyMembers(rawEvents, householdId)) as CalendarEvent[];
  }

  const family = await getInitialFamilyData(authUser.id, householdId);

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
