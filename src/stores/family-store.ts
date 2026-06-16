'use client';

/**
 * Family Data Store (Zustand & TanStack Query Bridge)
 * 
 * Unified source of truth for family member data.
 * Replaces the React Context pattern for project compliance.
 * 
 * Usage:
 *   const { members, memberColors, getColor, loading } = useFamilyStore();
 *   const actions = useFamilyActions();
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { useAuthStore } from './auth-store';
import { fetchWithTimeout } from '@/lib/utils/fetch';
import { useEffect, useMemo, useCallback } from 'react';
import { DEFAULT_MEMBER_COLOR, getStableMemberColorHex } from '@/lib/utils/ui-helpers';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface FamilyMember {
  id: string;
  name: string;
  color?: string;
  is_household_admin?: boolean;
  phone_number?: string;
  linked_email?: string;
  display_name?: string;
}

interface FamilyStore {
  /** All family members (merged) */
  members: FamilyMember[];
  /** Users with accounts */
  users: FamilyMember[];
  /** Profile-only family members */
  profileMembers: FamilyMember[];
  /** Whether the current user is the household admin (owner) */
  isHouseholdAdmin: boolean;
  /** Whether the household has a Gemini key configured */
  hasGeminiKey: boolean;
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: Error | null;
  
  // Actions
  actions: {
    reset: () => void;
  };
}

export const useFamilyStore = create<FamilyStore>()(
  immer((set) => ({
    members: [],
    users: [],
    profileMembers: [],
    isHouseholdAdmin: false,
    hasGeminiKey: false,
    loading: true,
    error: null,
    
    actions: {
      reset: () => {
        set((s) => {
          s.members = [];
          s.users = [];
          s.profileMembers = [];
          s.isHouseholdAdmin = false;
          s.hasGeminiKey = false;
          s.loading = true;
          s.error = null;
        });
      },
    },
  }))
);

// ============================================
// Derived Selectors & Hooks
// ============================================

/** Get array of member names for dropdowns (Stable) */
export const useFamilyMemberNames = () => {
  const members = useFamilyStore((state) => state.members);
  // Only re-calc if members array reference changes
  return useMemo(() => members.map(m => m.name), [members]);
};

/** Get map of member names to their HEX colors (Stable) */
export const useMemberColors = () => {
  const members = useFamilyStore((state) => state.members);
  
  return useMemo(() => {
    const colorMap = new Map<string, string>();
    const normalizedDefaultColor = DEFAULT_MEMBER_COLOR.toLowerCase();

    for (const member of members) {
      const normalizedStoredColor = member.color?.trim().toLowerCase();
      const isUnassignedDefault =
        !normalizedStoredColor || normalizedStoredColor === normalizedDefaultColor;

      // Treat default/empty profile colors as "not explicitly assigned" so
      // pre-load and post-load rendering use the same stable member color.
      colorMap.set(
          member.name,
          isUnassignedDefault ? getStableMemberColorHex(member.name) : normalizedStoredColor
      );
    }
    return colorMap;
  }, [members]);
};

/** Get color for a member (Stable) */
export const useMemberColorGetter = () => {
  const memberColors = useMemberColors();
  
  return useCallback((memberName?: string): string | undefined => {
    if (!memberName) return undefined;
    return memberColors.get(memberName);
  }, [memberColors]);
};

/** Check if user has a household */
export const useHasHousehold = () => {
  const householdId = useAuthStore((state) => state.dbUser?.household_id);
  const memberCount = useFamilyStore((state) => state.members.length);
  return !!householdId || memberCount > 0;
};

// ============================================
// TanStack Query Actions Hook
// ============================================

/** Get actions powered by TanStack Query for caching and invalidation */
export function useFamilyActions() {
  const queryClient = useQueryClient();
  const resetStore = useFamilyStore((state) => state.actions.reset);
  
  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['family'] });
  }, [queryClient]);
  
  const reset = useCallback(() => {
    resetStore();
    void queryClient.resetQueries({ queryKey: ['family'] });
  }, [queryClient, resetStore]);

  const fetchFamilyMembers = useCallback(async (householdId: string | null) => {
    if (householdId) {
      void queryClient.invalidateQueries({ queryKey: ['family'] });
    }
  }, [queryClient]);

  return useMemo(() => ({
    invalidate,
    reset,
    fetchFamilyMembers,
  }), [invalidate, reset, fetchFamilyMembers]);
}

// ============================================
// Auto-fetch Hook (Bridge between TanStack Query and Zustand)
// ============================================

/**
 * Hook that auto-fetches family data when household changes.
 */
export function useFamilyDataSync() {
  const householdId = useAuthStore((state) => state.dbUser?.household_id);

  const { data, error, isLoading } = useQuery({
    queryKey: ['family', householdId],
    queryFn: async () => {
      const response = await fetchWithTimeout('/api/family');
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to fetch family members');
      }
      const result = await response.json();
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch family members');
      }
      return result.data;
    },
    enabled: !!householdId,
    staleTime: 5000,
  });

  useEffect(() => {
    if (!householdId) {
      useFamilyStore.setState({
        members: [],
        users: [],
        profileMembers: [],
        isHouseholdAdmin: false,
        hasGeminiKey: false,
        loading: false,
        error: null,
      });
      return;
    }

    if (error) {
      useFamilyStore.setState({
        error: error instanceof Error ? error : new Error('Failed to fetch family members'),
        loading: false,
      });
      return;
    }

    if (data) {
      const fetchedUsers: FamilyMember[] = [];
      const fetchedProfiles: FamilyMember[] = [];
      
      if (data.users) {
        for (const user of data.users) {
          const name = user.display_name || user.phone_number;
          if (name) fetchedUsers.push({ 
            id: user.id, 
            name,
            display_name: user.display_name,
            phone_number: user.phone_number,
            linked_email: user.linked_email,
            is_household_admin: user.is_household_admin
          });
        }
      }
      
      if (data.familyMembers) {
        for (const member of data.familyMembers) {
          fetchedProfiles.push({ id: member.id, name: member.name, color: member.color });
        }
      }
      
      useFamilyStore.setState({
        users: fetchedUsers,
        profileMembers: fetchedProfiles,
        members: [...fetchedUsers, ...fetchedProfiles],
        isHouseholdAdmin: data.isHouseholdAdmin || false,
        hasGeminiKey: data.hasGeminiKey || false,
        loading: isLoading,
        error: null,
      });
    } else {
      // Avoid flashing the family loading skeleton when the store was already
      // seeded from SSR while the background query refreshes.
      const hasExistingMembers = useFamilyStore.getState().members.length > 0;
      useFamilyStore.setState({
        loading: isLoading && !hasExistingMembers,
      });
    }
  }, [data, error, isLoading, householdId]);
}

// ============================================
// Compatibility Layer
// ============================================

/**
 * @deprecated Use individual selectors instead for better performance.
 */
export function useFamilyData() {
  const queryClient = useQueryClient();
  const members = useFamilyStore((state) => state.members);
  const users = useFamilyStore((state) => state.users);
  const profileMembers = useFamilyStore((state) => state.profileMembers);
  const isHouseholdAdmin = useFamilyStore((state) => state.isHouseholdAdmin);
  const hasGeminiKey = useFamilyStore((state) => state.hasGeminiKey);
  const loading = useFamilyStore((state) => state.loading);
  const error = useFamilyStore((state) => state.error);
  
  // Derived state (these use useMemo internally now)
  const hasHousehold = useHasHousehold();
  const memberColors = useMemberColors();
  const memberNames = useFamilyMemberNames();
  
  // Stable callback
  const getColor = useCallback((memberName?: string): string | undefined => {
    if (!memberName) return undefined;
    return memberColors.get(memberName);
  }, [memberColors]);

  // Stable refetch function - forces a fresh fetch regardless of debounce.
  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['family'] });
  }, [queryClient]);

  // Stable return object
  return useMemo(() => ({
    members,
    users,
    profileMembers,
    memberNames,
    memberColors,
    getColor,
    hasHousehold,
    isHouseholdAdmin,
    hasGeminiKey,
    loading,
    error,
    refetch,
  }), [
    members, users, profileMembers, memberNames, memberColors, 
    getColor, hasHousehold, isHouseholdAdmin, hasGeminiKey, loading, error, refetch
  ]);
}
