import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { useAuthStore, type DbUser } from '@/stores/auth-store';
import type { CalendarEvent } from '@/types/calendar';
import { log } from '@/lib/utils/logger';

interface FamilyMember {
  id: string;
  name: string;
}

interface DashboardApiResponse {
  success: boolean;
  user?: DbUser;
  events?: CalendarEvent[];
  error?: string;
}

export function useDashboardData() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [googleEvents, setGoogleEvents] = useState<CalendarEvent[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const dbUser = useAuthStore((state) => state.dbUser);
  const setDbUser = useAuthStore((state) => state.setDbUser);
  
  // Use ref to track if component is mounted (avoids stale closure issues)
  const isMounted = useRef(true);

  const fetchEventsData = useCallback(async (): Promise<DashboardApiResponse | null> => {
    try {
      const response = await fetch('/api/dashboard');
      const result: DashboardApiResponse = await response.json();

      if (!response.ok || !result.success) {
        log.error('Dashboard fetch failed:', result.error);
        return null;
      }

      // Return the data - let the caller handle side effects
      return result;
    } catch (error) {
      log.error('Dashboard fetch error:', error);
      return null;
    }
  }, []);

  const fetchGoogleEvents = useCallback(async (): Promise<CalendarEvent[]> => {
    try {
      const now = new Date();
      const start = startOfMonth(addMonths(now, -1)).toISOString();
      const end = endOfMonth(addMonths(now, 2)).toISOString();

      const response = await fetch(`/api/calendar/google-events?start=${start}&end=${end}`);
      const result = await response.json();

      if (!response.ok || !result.events) {
        return [];
      }

      return result.events.map((e: CalendarEvent) => ({
        ...e,
        source: 'google' as const,
      }));
    } catch (error) {
      log.error('Failed to fetch Google events:', error);
      return [];
    }
  }, []);

  const fetchFamilyMembers = useCallback(async (): Promise<FamilyMember[]> => {
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
            allMembers.push({ id: member.id, name: member.name });
          }
        }
        
        return allMembers;
      }
      return [];
    } catch {
      // Silent fail - return empty array
      return [];
    }
  }, []);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    
    const [dashboardResponse, gEvents, members] = await Promise.all([
      fetchEventsData(),
      fetchGoogleEvents(),
      fetchFamilyMembers(),
    ]);

    // Only update state if still mounted
    if (!isMounted.current) return;

    // Handle dashboard response - state updates here, not in fetcher
    if (dashboardResponse) {
      if (dashboardResponse.user) {
        setDbUser(dashboardResponse.user);
      }
      if (dashboardResponse.events) {
        setEvents(dashboardResponse.events.map((e: CalendarEvent) => ({ 
          ...e, 
          source: 'app' as const 
        })));
      }
    }
    
    setGoogleEvents(gEvents);
    setFamilyMembers(members);
    setLoading(false);
  }, [fetchEventsData, fetchGoogleEvents, fetchFamilyMembers, setDbUser]);

  useEffect(() => {
    isMounted.current = true;
    
    // Wrap in async IIFE to avoid sync setState warning
    void (async () => {
      await loadAllData();
    })();
    
    return () => {
      isMounted.current = false;
    };
  }, [loadAllData]);

  const allEvents = useMemo(() => [...events, ...googleEvents], [events, googleEvents]);
  const familyMemberNames = useMemo(() => familyMembers.map(m => m.name), [familyMembers]);

  return {
    events,
    googleEvents,
    allEvents,
    familyMembers,
    familyMemberNames,
    loading,
    refresh: loadAllData,
    dbUser,
  };
}
