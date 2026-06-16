import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAuthStore, type DbUser } from '@/stores/auth-store';
import type { CalendarEvent } from '@/types/calendar';
import { log } from '@/lib/utils/logger';
import { useFamilyData } from '@/stores/family-store';
import { expandRecurringCalendarEvents } from '@/lib/utils/recurring-events';

interface DashboardApiResponse {
  success: boolean;
  user?: DbUser;
  events?: CalendarEvent[];
  error?: string;
}

interface SyncResponse {
  success: boolean;
  created?: number;
  updated?: number;
  deleted?: number;
  linked?: number;
  errors?: string[];
}

export function useDashboardData() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
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

  const fetchEventsData = useCallback(async (signal?: AbortSignal): Promise<DashboardApiResponse | null> => {
    try {
      const response = await fetch('/api/dashboard', { signal });
      const result: DashboardApiResponse = await response.json();

      if (!response.ok || !result.success) {
        log.error('Dashboard fetch failed:', result.error);
        return null;
      }

      return result;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return null;
      }
      log.error('Dashboard fetch error:', error);
      return null;
    }
  }, []);

  const triggerGoogleSync = useCallback(async (signal?: AbortSignal): Promise<boolean> => {
    try {
      const response = await fetch('/api/calendar/sync', { method: 'POST', signal });
      const result: SyncResponse = await response.json();
      
      if (!response.ok) return false;
      
      // Return true if any changes happened
      const hasChanges = (
        (result.created || 0) > 0 || 
        (result.updated || 0) > 0 || 
        (result.deleted || 0) > 0 || 
        (result.linked || 0) > 0
      );
      
      if (hasChanges) {
        log.info(`[Dashboard] Sync changes: +${result.created} ~${result.updated} -${result.deleted}`);
      }
      
      return hasChanges;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return false;
      }
      log.error('[Dashboard] Sync trigger failed:', error);
      return false;
    }
  }, []);

  const normalizeEvents = useCallback((items: CalendarEvent[]) => {
    const withSource = items.map((e) => ({
      ...e,
      source: e.source || 'app',
    }));
    return expandRecurringCalendarEvents(withSource);
  }, []);

  const loadAllData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    
    // Step 1: Initial load from Database (Fast)
    const dashboardResponse = await fetchEventsData(signal);
    
    if (!isMounted.current) return;
    
    if (dashboardResponse?.user) {
      setDbUserRef.current(dashboardResponse.user);
    }
    
    if (dashboardResponse?.events) {
      setEvents(normalizeEvents(dashboardResponse.events));
    }

    setLoading(false); // Show data immediately

    // Step 2: Trigger Sync in background (only if user has a household)
    // New web users without a household skip this to avoid unnecessary requests.
    if (!dashboardResponse?.user?.household_id) {
      return;
    }

    const hasChanges = await triggerGoogleSync(signal);
    
    if (hasChanges && isMounted.current) {
      log.debug('[Dashboard] Sync reported changes, refreshing data...');
      const updatedResponse = await fetchEventsData(signal);
      
      if (updatedResponse?.events && isMounted.current) {
        setEvents(normalizeEvents(updatedResponse.events));
      }
    }
  }, [fetchEventsData, normalizeEvents, triggerGoogleSync]);

  useEffect(() => {
    const abortController = new AbortController();
    isMounted.current = true;
    
    void (async () => {
      if (isMounted.current) {
        await loadAllData(abortController.signal); 
      }
    })();
    
    return () => {
      isMounted.current = false;
      abortController.abort();
    };
  }, [loadAllData]);
  
  // Memoized to prevent unnecessary re-renders downstream
  // Since we merged googleEvents into events via DB sync, we just use events
  const allEvents = useMemo(() => events, [events]);

  return {
    events,
    googleEvents: [], // Deprecated: google events are now in 'events'
    allEvents,
    familyMembers,
    familyMemberNames,
    memberColors,
    loading: loading || familyLoading,
    refresh: loadAllData,
    dbUser,
  };
}
