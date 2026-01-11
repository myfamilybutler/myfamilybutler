/**
 * Custom Hooks - Barrel Export
 * 
 * Re-exports all custom hooks for clean imports.
 */

// PWA Install Hook
export { usePwaInstall } from './use-pwa-install';

// Dashboard Data Hook
export { useDashboardData } from './use-dashboard-data';

// Family Data Hook (re-exported from stores for backward compatibility)
export { 
  useFamilyData, 
  useFamilyMemberNames, 
  useMemberColorGetter,
  type FamilyMember,
} from '@/stores/family-store';
