'use client';

import type { User as SupabaseUser } from '@supabase/supabase-js';
import { useAuthStore, type DbUser } from '@/stores/auth-store';
import { useFamilyStore, type FamilyMember } from '@/stores/family-store';

export interface InitialFamilyPayload {
  members: FamilyMember[];
  users: FamilyMember[];
  profileMembers: FamilyMember[];
  isHouseholdAdmin: boolean;
  hasGeminiKey: boolean;
}

/**
 * Seed the auth and family Zustand stores synchronously from server-fetched
 * data. Call this inside a component's first render so child components see
 * populated state immediately and hydration matches the server output.
 */
export function seedAuthFamilyStores(
  authUser: SupabaseUser,
  dbUser: DbUser,
  initialFamily: InitialFamilyPayload
) {
  useAuthStore.setState({
    user: authUser,
    dbUser,
    loading: false,
    dbUserLoading: false,
  });

  useFamilyStore.setState({
    members: initialFamily.members,
    users: initialFamily.users,
    profileMembers: initialFamily.profileMembers,
    isHouseholdAdmin: initialFamily.isHouseholdAdmin,
    hasGeminiKey: initialFamily.hasGeminiKey,
    loading: false,
    error: null,
  });
}
