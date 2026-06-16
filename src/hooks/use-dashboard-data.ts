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

interface UseDashboardDataOptions {
  /** Events already provided by SSR; skip the initial fetch on mount. */
  initialEvents?: CalendarEvent[];
}

export function useDashboardData(options: UseDashboardDataOptions = {}) {
  const { initialEvents } = options;
  const hasInitialEvents = useRef(initialEvents && initialEvents.length > 0).current;

  const [rawEvents, setRawEvents] = useState<CalendarEvent[]>(initialEvents ?? []);
  const {
    members: familyMembers,
    memberNames: familyMemberNames,
    memberColors,
    loading: familyLoading,
  } = useFamilyData();
  const [loading, setLoading] = useState(!hasInitialEvents);
  const [isSyncing, setIsSyncing] = useState(false);
  const dbUser = useAuthStore((state) => state.dbUser);

  // Use refs to avoid stale closures and callback recreation
  const isMounted = useRef(true);
  const requestIdRef = useRef(0);

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

      const hasChanges =
        (result.created || 0) > 0 ||
        (result.updated || 0) > 0 ||
        (result.deleted || 0) > 0 ||
        (result.linked || 0) > 0;

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

  // Normalize source only; recurrence expansion is memoized below.
  const normalizeSource = useCallback((items: CalendarEvent[]) => {
    return items.map((e) => ({
      ...e,
      source: e.source || 'app',
    }));
  }, []);

  // Memoize recurring-event expansion so identical raw event arrays reuse the
  // same expanded result across renders.
  const events = useMemo(() => expandRecurringCalendarEvents(rawEvents), [rawEvents]);

  const loadAllData = useCallback(
    async (signal?: AbortSignal, { skipFetch = false }: { skipFetch?: boolean } = {}) => {
      const requestId = ++requestIdRef.current;

      const isCurrent = () => requestId === requestIdRef.current && isMounted.current;

      if (!skipFetch) {
        setLoading(true);
      }
      setIsSyncing(true);

      try {
        // Step 1: Initial load from Database (Fast)
        let dashboardResponse: DashboardApiResponse | null = null;
        if (!skipFetch) {
          dashboardResponse = await fetchEventsData(signal);
          if (isCurrent() && dashboardResponse?.events) {
            setRawEvents(normalizeSource(dashboardResponse.events));
          }
          if (isCurrent()) {
            setLoading(false);
          }
        }

        const hasHousehold = skipFetch
          ? !!useAuthStore.getState().dbUser?.household_id
          : !!dashboardResponse?.user?.household_id;

        // Step 2: Trigger Sync in background (only if user has a household)
        if (!hasHousehold) {
          if (isCurrent()) setIsSyncing(false);
          return;
        }

        const hasChanges = await triggerGoogleSync(signal);

        if (hasChanges && isCurrent()) {
          log.debug('[Dashboard] Sync reported changes, refreshing data...');
          const updatedResponse = await fetchEventsData(signal);

          if (updatedResponse?.events && isCurrent()) {
            setRawEvents(normalizeSource(updatedResponse.events));
          }
        }
      } finally {
        if (isCurrent()) {
          if (!skipFetch) setLoading(false);
          setIsSyncing(false);
        }
      }
    },
    [fetchEventsData, normalizeSource, triggerGoogleSync]
  );

  useEffect(() => {
    const abortController = new AbortController();
    isMounted.current = true;

    void (async () => {
      if (isMounted.current) {
        if (hasInitialEvents) {
          await loadAllData(abortController.signal, { skipFetch: true });
        } else {
          await loadAllData(abortController.signal);
        }
      }
    })();

    return () => {
      isMounted.current = false;
      abortController.abort();
    };
  }, [loadAllData, hasInitialEvents]);

  // Memoized to prevent unnecessary re-renders downstream
  const allEvents = useMemo(() => events, [events]);

  return {
    events,
    googleEvents: [], // Deprecated: google events are now in 'events'
    allEvents,
    familyMembers,
    familyMemberNames,
    memberColors,
    loading: loading || familyLoading,
    isSyncing,
    refresh: loadAllData,
    dbUser,
  };
}
