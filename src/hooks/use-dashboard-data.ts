import { useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import type { CalendarEvent } from '@/types/calendar';
import { log } from '@/lib/utils/logger';
import { useFamilyData } from '@/stores/family-store';
import { expandRecurringCalendarEvents } from '@/lib/utils/recurring-events';
import { fetchWithTimeout } from '@/lib/utils/fetch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface UseDashboardDataOptions {
  /** Events already provided by SSR; skip the initial fetch on mount. */
  initialEvents?: CalendarEvent[];
}

// Throttle background Google Calendar syncs per user so navigating between
// dashboard tabs does not repeatedly hit the sync endpoint.
const SYNC_COOLDOWN_MS = 60_000;
const lastSyncByUserId = new Map<string, number>();

function shouldSkipSync(userId: string | undefined): userId is undefined {
  if (!userId) return true;
  const last = lastSyncByUserId.get(userId);
  if (!last) return false;
  return Date.now() - last < SYNC_COOLDOWN_MS;
}

export function useDashboardData(options: UseDashboardDataOptions = {}) {
  const { initialEvents } = options;
  const queryClient = useQueryClient();
  const dbUser = useAuthStore((state) => state.dbUser);
  const householdId = dbUser?.household_id;

  const {
    members: familyMembers,
    memberNames: familyMemberNames,
    memberColors,
    loading: familyLoading,
  } = useFamilyData();

  // Query for fetching dashboard events
  const {
    data: rawEventsData,
    isLoading: eventsLoading,
    refetch: refetchEvents,
  } = useQuery({
    queryKey: ['dashboard', householdId],
    queryFn: async () => {
      const response = await fetchWithTimeout('/api/dashboard');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch dashboard data');
      }
      return (result.events || []) as CalendarEvent[];
    },
    enabled: !!dbUser,
    initialData: initialEvents,
  });

  // Mutation for triggering Google Calendar sync in the background
  const syncMutation = useMutation({
    mutationKey: ['sync-calendar', householdId],
    mutationFn: async () => {
      if (!householdId) return false;
      const response = await fetchWithTimeout('/api/calendar/sync', { method: 'POST' });
      if (!response.ok) return false;
      const result = await response.json();

      const hasChanges =
        (result.created || 0) > 0 ||
        (result.updated || 0) > 0 ||
        (result.deleted || 0) > 0 ||
        (result.linked || 0) > 0;

      if (hasChanges) {
        log.info(`[Dashboard] Sync changes: +${result.created} ~${result.updated} -${result.deleted}`);
      }
      return hasChanges;
    },
    onSuccess: (hasChanges) => {
      if (dbUser?.id) {
        lastSyncByUserId.set(dbUser.id, Date.now());
      }
      if (hasChanges) {
        log.debug('[Dashboard] Sync reported changes, refetching dashboard data...');
        void queryClient.invalidateQueries({ queryKey: ['dashboard', householdId] });
      }
    },
  });

  // Automatically trigger sync on mount or when householdId changes
  const syncedRef = useRef<string | null>(null);
  useEffect(() => {
    if (householdId && syncedRef.current !== householdId) {
      syncedRef.current = householdId;
      if (shouldSkipSync(dbUser?.id)) {
        return;
      }
      syncMutation.mutate();
    }
  }, [householdId, dbUser?.id, syncMutation]);

  // Normalize source and expand recurring events
  const events = useMemo(() => {
    const dataList = rawEventsData || [];
    const normalized = dataList.map((e) => ({
      ...e,
      source: e.source || 'app',
    }));
    return expandRecurringCalendarEvents(normalized);
  }, [rawEventsData]);

  // Refresh both DB events and Google sync
  const refresh = useCallback(async () => {
    await refetchEvents();
    if (householdId) {
      syncMutation.mutate();
    }
  }, [refetchEvents, householdId, syncMutation]);

  const allEvents = events;

  return {
    events,
    googleEvents: [], // Deprecated compatibility field
    allEvents,
    familyMembers,
    familyMemberNames,
    memberColors,
    loading: eventsLoading || familyLoading,
    isSyncing: syncMutation.isPending,
    refresh,
    dbUser,
  };
}
