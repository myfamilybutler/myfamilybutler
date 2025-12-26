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
  
  // Use refs to avoid stale closures and callback recreation
  const isMounted = useRef(true);
  const setDbUserRef = useRef(setDbUser);
  
  // Keep setDbUser ref up to date without adding to dependencies
  useEffect(() => {
    setDbUserRef.current = setDbUser;
  }, [setDbUser]);

  const fetchEventsData = useCallback(async (): Promise<DashboardApiResponse | null> => {
    try {
      const response = await fetch('/api/dashboard');
      const result: DashboardApiResponse = await response.json();

      if (!response.ok || !result.success) {
        log.error('Dashboard fetch failed:', result.error);
        return null;
      }

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
      
      // Log non-success responses for debugging
      if (!response.ok) {
        log.warn('Family members fetch failed:', response.status, result.error);
      }
      return [];
    } catch (error) {
      log.error('Family members fetch error:', error);
      return [];
    }
  }, []);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    
    // Step 1: Fetch dashboard data first to get user (required for family members)
    const dashboardResponse = await fetchEventsData();
    
    if (!isMounted.current) return;
    
    // Update user state immediately using ref (avoids callback recreation)
    if (dashboardResponse?.user) {
      setDbUserRef.current(dashboardResponse.user);
    }
    
    if (dashboardResponse?.events) {
      setEvents(dashboardResponse.events.map((e: CalendarEvent) => ({ 
        ...e, 
        source: 'app' as const 
      })));
    }
    
    // Step 2: Check if user has household_id before fetching family members
    // This prevents 404 errors when user doesn't have a household yet
    const hasHousehold = dashboardResponse?.user?.household_id;
    
    // Fetch Google events and family members in parallel (if applicable)
    const [gEvents, members] = await Promise.all([
      fetchGoogleEvents(),
      hasHousehold ? fetchFamilyMembers() : Promise.resolve([]),
    ]);

    if (!isMounted.current) return;
    
    setGoogleEvents(gEvents);
    setFamilyMembers(members);
    setLoading(false);
  }, [fetchEventsData, fetchGoogleEvents, fetchFamilyMembers]); // Note: setDbUser removed from dependencies

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
