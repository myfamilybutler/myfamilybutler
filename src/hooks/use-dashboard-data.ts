import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { useAuthStore, type DbUser } from '@/stores/auth-store';
import type { CalendarEvent } from '@/types/calendar';
import { log } from '@/lib/utils/logger';
import { useFamilyData } from '@/stores/family-store';

interface DashboardApiResponse {
  success: boolean;
  user?: DbUser;
  events?: CalendarEvent[];
  error?: string;
}

export function useDashboardData() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [googleEvents, setGoogleEvents] = useState<CalendarEvent[]>([]);
  const { members: familyMembers, memberNames: familyMemberNames, memberColors, loading: familyLoading } = useFamilyData();
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

  const loadAllData = useCallback(async () => {
    setLoading(true);
    
    // Step 1: Fetch dashboard data and Google events in parallel
    const [dashboardResponse, gEvents] = await Promise.all([
      fetchEventsData(),
      fetchGoogleEvents(),
    ]);
    
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
    
    if (gEvents) {
      setGoogleEvents(gEvents);
    }
    
    setLoading(false);
  }, [fetchEventsData, fetchGoogleEvents]);

  useEffect(() => {
    const abortController = new AbortController();
    isMounted.current = true;
    
    // Wrap in async IIFE to avoid sync setState warning
    void (async () => {
      // Pass signal to loadAllData if we were to support it, 
      // but for now checking isMounted is enough for state safety.
      // Ideally pass signal to fetch calls.
      if (isMounted.current) {
        await loadAllData(); 
      }
    })();
    
    return () => {
      isMounted.current = false;
      abortController.abort();
    };
  }, [loadAllData]);

  const allEvents = useMemo(() => [...events, ...googleEvents], [events, googleEvents]);

  return {
    events,
    googleEvents,
    allEvents,
    familyMembers,
    familyMemberNames,
    memberColors,
    loading: loading || familyLoading,
    refresh: loadAllData,
    dbUser,
  };
}
