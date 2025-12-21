'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { FamilyWidget } from '@/components/dashboard/family-widget';
import { CalendarWidget } from '@/components/calendar/calendar-widget';
import { UpcomingEvents } from '@/components/calendar/upcoming-events';
import { CalendarFilter } from '@/components/calendar/calendar-filter';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { OnboardingModal } from '@/components/onboarding/onboarding-modal';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent } from '@/components/ui/card';

import type { CalendarEvent } from '@/components/calendar/calendar-widget';

export default function DashboardPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [modalDismissed, setModalDismissed] = useState(false);
  const dbUser = useAuthStore((state) => state.dbUser);

  // Derive modal visibility directly
  const showOnboardingModal = dbUser?.onboarding_modal_shown === false && !modalDismissed;

  // Fetch events from API
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

  // Initial fetch - simple pattern
  useEffect(() => {
    fetchEventsData().then(loaded => {
      if (loaded) {
        setEvents(loaded);
        // Initialize filters with all members selected
        const members = [...new Set(loaded.map((e: CalendarEvent) => e.family_member).filter(Boolean))];
        setSelectedMembers(members as string[]);
      }
    });
  }, [fetchEventsData]);

  // Refresh data after changes
  const handleEventsChanged = useCallback(async () => {
    const loaded = await fetchEventsData();
    if (loaded) setEvents(loaded);
  }, [fetchEventsData]);

  // Filtered events (memoized for child components)
  const filteredEvents = useMemo(() => {
    if (selectedMembers.length === 0) return events;
    return events.filter(e => !e.family_member || selectedMembers.includes(e.family_member));
  }, [events, selectedMembers]);

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
                  events={filteredEvents}
                  maxItems={5}
                  onEventsChanged={handleEventsChanged}
                />
              </CardContent>
            </Card>

            {events.some((e) => e.family_member) && (
              <Card className="border-gray-200 shadow-sm bg-white">
                <CardContent className="p-4">
                  <CalendarFilter
                    events={events}
                    selectedMembers={selectedMembers}
                    onSelectionChange={setSelectedMembers}
                  />
                </CardContent>
              </Card>
            )}

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
              events={filteredEvents}
              onEventsChanged={handleEventsChanged}
            />
          </main>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
