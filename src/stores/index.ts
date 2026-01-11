/**
 * Stores - Barrel Export
 * 
 * Re-exports all Zustand stores for clean imports.
 */

// Auth Store
export { useAuthStore } from './auth-store';

// Add more stores as they are created:
// export { useUIStore } from './ui-store';
export { useFilterStore } from './filter-store';

// Family Store (unified family data)
export { 
  useFamilyStore, 
  useFamilyData,
  useFamilyMemberNames,
  useMemberColors,
  useMemberColorGetter,
  useHasHousehold,
  useFamilyActions,
  useFamilyDataSync,
  type FamilyMember,
} from './family-store';
