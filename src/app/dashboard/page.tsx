'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { FamilyWidget } from '@/components/dashboard/family-widget';
import { CalendarWidget } from '@/components/calendar/calendar-widget';
import { UpcomingEvents } from '@/components/calendar/upcoming-events';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { OnboardingModal } from '@/components/onboarding/onboarding-modal';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent } from '@/components/ui/card';

import type { CalendarEvent } from '@/components/calendar/calendar-widget';

export default function DashboardPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [googleEvents, setGoogleEvents] = useState<CalendarEvent[]>([]);
  const [modalDismissed, setModalDismissed] = useState(false);
  const dbUser = useAuthStore((state) => state.dbUser);

  // Derive modal visibility directly
  const showOnboardingModal = dbUser?.onboarding_modal_shown === false && !modalDismissed;

  // Fetch app events from API
  const fetchEventsData = useCallback(async () => {
    const response = await fetch('/api/dashboard');
    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error('Dashboard fetch failed:', result.error);
      return null;
    }

    useAuthStore.getState().setDbUser(result.user);
    return result.events || [];
  }, []);

  // Fetch Google Calendar events
  const fetchGoogleEvents = useCallback(async () => {
    try {
      // Fetch events for current month +/- 1 month
      const now = new Date();
      const start = startOfMonth(addMonths(now, -1)).toISOString();
      const end = endOfMonth(addMonths(now, 2)).toISOString();

      const response = await fetch(`/api/calendar/google-events?start=${start}&end=${end}`);
      const result = await response.json();

      if (!response.ok || !result.events) {
        return [];
      }

      // Add source marker to Google events
      return result.events.map((e: CalendarEvent) => ({
        ...e,
        source: 'google' as const,
      }));
    } catch (error) {
      console.error('Failed to fetch Google events:', error);
      return [];
    }
  }, []);

  // Initial fetch - simple pattern
  useEffect(() => {
    const loadAllEvents = async () => {
      const [appEvents, gEvents] = await Promise.all([
        fetchEventsData(),
        fetchGoogleEvents(),
      ]);

      if (appEvents) {
        // Mark app events with source
        const markedAppEvents = appEvents.map((e: CalendarEvent) => ({
          ...e,
          source: 'app' as const,
        }));
        setEvents(markedAppEvents);
      }

      setGoogleEvents(gEvents);
    };

    loadAllEvents();
  }, [fetchEventsData, fetchGoogleEvents]);

  // Refresh data after changes
  const handleEventsChanged = useCallback(async () => {
    const [appEvents, gEvents] = await Promise.all([
      fetchEventsData(),
      fetchGoogleEvents(),
    ]);
    if (appEvents) {
      const markedAppEvents = appEvents.map((e: CalendarEvent) => ({
        ...e,
        source: 'app' as const,
      }));
      setEvents(markedAppEvents);
    }
    setGoogleEvents(gEvents);
  }, [fetchEventsData, fetchGoogleEvents]);

  // Merge all events (filtering now handled by UpcomingEvents internally)
  const allEvents = useMemo(() => {
    return [...events, ...googleEvents];
  }, [events, googleEvents]);

  const todayFormatted = format(new Date(), 'EEEE, MMMM d');

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <OnboardingModal
          isOpen={showOnboardingModal}
          onComplete={() => {
            setModalDismissed(true);
            fetchEventsData();
          }}
          onSkip={() => setModalDismissed(true)}
        />

        <div className="space-y-4 lg:space-y-0 lg:flex lg:gap-6">
          <aside className="order-2 lg:order-1 lg:w-80 lg:flex-shrink-0 space-y-4">
            <Card className="border-gray-200 shadow-sm bg-white">
              <CardContent className="p-4">
                <UpcomingEvents
                  events={allEvents}
                  pageSize={5}
                  onEventsChanged={handleEventsChanged}
                />
              </CardContent>
            </Card>

            <FamilyWidget />
          </aside>

          <main className="order-1 lg:order-2 flex-1">
            <div className="mb-4">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Family Calendar
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">{todayFormatted}</p>
            </div>

            <CalendarWidget
              events={allEvents}
              onEventsChanged={handleEventsChanged}
            />
          </main>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
