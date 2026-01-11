'use client';

/**
 * Family Data Store (Zustand)
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
import { log } from '@/lib/utils/logger';
import { useAuthStore } from './auth-store';
import { useEffect, useMemo, useCallback, useRef } from 'react';

export interface FamilyMember {
  id: string;
  name: string;
  color?: string;
  is_household_admin?: boolean;
  phone_number?: string;
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
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: Error | null;
  /** Last fetch timestamp for debouncing */
  lastFetchTime: number;
  /** Whether a fetch is in progress */
  isFetching: boolean;
  
  // Actions
  actions: {
    fetchFamilyMembers: (householdId: string | null) => Promise<void>;
    reset: () => void;
  };
}

const STALE_TIME_MS = 5000; // 5 seconds before allowing refetch

export const useFamilyStore = create<FamilyStore>()(
  immer((set, get) => ({
    members: [],
    users: [],
    profileMembers: [],
    isHouseholdAdmin: false,
    loading: true,
    error: null,
    lastFetchTime: 0,
    isFetching: false,
    
    actions: {
      fetchFamilyMembers: async (householdId: string | null) => {
        const state = get();
        const now = Date.now();
        
        // Debounce: skip if fetched recently
        if (now - state.lastFetchTime < STALE_TIME_MS) {
          return;
        }
        
        // Skip if already fetching
        if (state.isFetching) {
          return;
        }
        
        // Skip if no household
        if (!householdId) {
          set((s) => {
            s.members = [];
            s.users = [];
            s.profileMembers = [];
            s.isHouseholdAdmin = false;
            s.loading = false;
          });
          return;
        }
        
        set((s) => {
          s.isFetching = true;
          s.loading = true;
        });
        
        try {
          const response = await fetch('/api/family');
          const result = await response.json();
          
          if (response.ok && result.success && result.data) {
            const fetchedUsers: FamilyMember[] = [];
            const fetchedProfiles: FamilyMember[] = [];
            
            if (result.data.users) {
              for (const user of result.data.users) {
                const name = user.display_name || user.phone_number;
                if (name) fetchedUsers.push({ 
                  id: user.id, 
                  name,
                  display_name: user.display_name,
                  phone_number: user.phone_number,
                  is_household_admin: user.is_household_admin
                });
              }
            }
            
            if (result.data.familyMembers) {
              for (const member of result.data.familyMembers) {
                fetchedProfiles.push({ id: member.id, name: member.name, color: member.color });
              }
            }
            
            set((s) => {
              s.users = fetchedUsers;
              s.profileMembers = fetchedProfiles;
              s.members = [...fetchedUsers, ...fetchedProfiles];
              s.isHouseholdAdmin = result.data.isHouseholdAdmin || false;
              s.error = null;
              s.lastFetchTime = Date.now();
              s.loading = false;
              s.isFetching = false;
            });
          } else {
            if (!response.ok) {
              log.warn('Family members fetch failed:', response.status, result.error);
            }
            set((s) => {
              s.error = new Error(result.error || 'Failed to fetch family members');
              s.loading = false;
              s.isFetching = false;
            });
          }
        } catch (err) {
          log.error('Family members fetch error:', err);
          set((s) => {
            s.error = err instanceof Error ? err : new Error('Failed to fetch family members');
            s.loading = false;
            s.isFetching = false;
          });
        }
      },
      
      reset: () => {
        set((s) => {
          s.members = [];
          s.users = [];
          s.profileMembers = [];
          s.isHouseholdAdmin = false;
          s.loading = true;
          s.error = null;
          s.lastFetchTime = 0;
          s.isFetching = false;
        });
      },
    },
  }))
);

// ============================================
// Derived Selectors
// ============================================

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
    for (const member of members) {
      if (member.color) {
        colorMap.set(member.name, member.color);
      }
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

/** Get actions separately for stable reference */
export const useFamilyActions = () => useFamilyStore((state) => state.actions);

// ============================================
// Auto-fetch Hook
// ============================================

/**
 * Hook that auto-fetches family data when household changes.
 */
export function useFamilyDataSync() {
  // Select ONLY household_id to prevent re-runs on other auth changes
  const householdId = useAuthStore((state) => state.dbUser?.household_id);
  const { fetchFamilyMembers } = useFamilyActions();
  
  // Use a ref to track if we've already fetched for this ID
  // This prevents double-fetching on mount if strict mode is on
  const fetchedIdRef = useRef<string | null | undefined>(undefined);
  
  useEffect(() => {
    // Only fetch if ID changed
    if (fetchedIdRef.current !== householdId) {
      fetchedIdRef.current = householdId;
      fetchFamilyMembers(householdId ?? null);
    }
  }, [householdId, fetchFamilyMembers]);
}

// ============================================
// Compatibility Layer
// ============================================

/**
 * @deprecated Use individual selectors instead for better performance.
 */
export function useFamilyData() {
  const members = useFamilyStore((state) => state.members);
  const users = useFamilyStore((state) => state.users);
  const profileMembers = useFamilyStore((state) => state.profileMembers);
  const isHouseholdAdmin = useFamilyStore((state) => state.isHouseholdAdmin);
  const loading = useFamilyStore((state) => state.loading);
  const error = useFamilyStore((state) => state.error);
  const { fetchFamilyMembers } = useFamilyActions();
  
  // Derived state (these use useMemo internally now)
  const hasHousehold = useHasHousehold();
  const memberColors = useMemberColors();
  const memberNames = useFamilyMemberNames();
  
  // Stable callback
  const getColor = useCallback((memberName?: string): string | undefined => {
    if (!memberName) return undefined;
    return memberColors.get(memberName);
  }, [memberColors]);

  // Stable refetch function
  const refetch = useCallback(() => {
    const dbUser = useAuthStore.getState().dbUser;
    return fetchFamilyMembers(dbUser?.household_id ?? null);
  }, [fetchFamilyMembers]);

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
    loading,
    error,
    refetch,
  }), [
    members, users, profileMembers, memberNames, memberColors, 
    getColor, hasHousehold, isHouseholdAdmin, loading, error, refetch
  ]);
}
