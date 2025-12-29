import { useState, useEffect, useCallback } from 'react';
import { log } from '@/lib/utils/logger';

interface FamilyMember {
  id: string;
  name: string;
  color?: string;
}

export function useFamilyMembers() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFamilyMembers = useCallback(async () => {
    try {
      const response = await fetch('/api/family');
      const result = await response.json();

      if (response.ok && result.success && result.data) {
        const allMembers: FamilyMember[] = [];
        
        if (result.data.users) {
          for (const user of result.data.users) {
            const name = user.display_name || user.phone_number;
            if (name) allMembers.push({ id: user.id, name });
          }
        }
        
        if (result.data.familyMembers) {
          for (const member of result.data.familyMembers) {
            allMembers.push({ id: member.id, name: member.name, color: member.color });
          }
        }
        
        setMembers(allMembers);
      } else {
        if (!response.ok) {
          log.warn('Family members fetch failed:', response.status, result.error);
        }
      }
    } catch (error) {
      log.error('Family members fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFamilyMembers();
  }, [fetchFamilyMembers]);

  return { members, loading, refetch: fetchFamilyMembers };
}
