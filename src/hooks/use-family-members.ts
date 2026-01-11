import { useFamilyData } from '@/stores/family-store';

/**
 * Use useFamilyData() instead.
 * This hook is kept for backward compatibility.
 */
export function useFamilyMembers() {
  const { members, loading, refetch } = useFamilyData();
  return { members, loading, refetch };
}
