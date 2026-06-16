'use client';

import { useState } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { CollapsibleCalendar } from '@/components/calendar/collapsible-calendar';
import { UpcomingEvents } from '@/components/calendar/upcoming-events';
import { DesktopCalendarGrid } from '@/components/calendar/desktop-calendar-grid';
import { OnboardingModal } from '@/components/onboarding/onboarding-modal';
import { QuickAddFab } from '@/components/calendar/quick-add-fab';
import { QuickAddSheet } from '@/components/calendar/quick-add-sheet';
import { EditEventDialog } from '@/components/calendar/edit-event-dialog';
import { EventDetailDialog } from '@/components/calendar/event-detail-dialog';
import { TodayWidget } from '@/components/dashboard/today-widget';
import { Card, CardContent } from '@/components/ui/card';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { useAuthStore, type DbUser } from '@/stores/auth-store';
import { useFamilyStore, type FamilyMember } from '@/stores/family-store';
import type { CalendarEvent } from '@/types/calendar';

interface DashboardClientProps {
  authUser: SupabaseUser;
  dbUser: DbUser;
  initialEvents: CalendarEvent[];
  initialFamily: {
    members: FamilyMember[];
    users: FamilyMember[];
    profileMembers: FamilyMember[];
    isHouseholdAdmin: boolean;
    hasGeminiKey: boolean;
  };
}

function seedStores(
  authUser: SupabaseUser,
  dbUser: DbUser,
  initialFamily: DashboardClientProps['initialFamily']
) {
  useAuthStore.setState({
    user: authUser,
    dbUser,
    loading: false,
    dbUserLoading: false,
  });

  useFamilyStore.setState({
    members: initialFamily.members,
    users: initialFamily.users,
    profileMembers: initialFamily.profileMembers,
    isHouseholdAdmin: initialFamily.isHouseholdAdmin,
    hasGeminiKey: initialFamily.hasGeminiKey,
    loading: false,
    error: null,
    lastFetchTime: Date.now(),
    isFetching: false,
  });
}

export function DashboardClient({
  authUser,
  dbUser,
  initialEvents,
  initialFamily,
}: DashboardClientProps) {
  // Seed Zustand stores synchronously on the first render so that child
  // components see the server-fetched auth/family state immediately and the
  // hydrated DOM matches the server-rendered HTML.
  useState(() => {
    seedStores(authUser, dbUser, initialFamily);
    return true;
  });

  const { allEvents, refresh, dbUser: storeDbUser, isSyncing } = useDashboardData({
    initialEvents,
  });

  const [modalDismissed, setModalDismissed] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventDetailOpen, setEventDetailOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const effectiveDbUser = storeDbUser ?? dbUser;
  const hasEnoughEvents = allEvents.length >= 3;
  const showOnboardingModal =
    effectiveDbUser?.onboarding_modal_shown === false && !modalDismissed && hasEnoughEvents;

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setEventDetailOpen(true);
  };

  return (
    <DashboardLayout>
        <OnboardingModal
          isOpen={showOnboardingModal}
          onComplete={() => {
            setModalDismissed(true);
            refresh();
          }}
          onSkip={() => setModalDismissed(true)}
        />

        {isSyncing && (
          <div className="fixed top-16 right-4 z-50">
            <div className="bg-background/90 backdrop-blur border rounded-full px-3 py-1 text-xs text-muted-foreground shadow-sm animate-pulse">
              Syncing calendar…
            </div>
          </div>
        )}

        {/* Mobile Layout */}
        <div className="lg:hidden space-y-4">
          <TodayWidget
            events={allEvents}
            onEventClick={handleEventClick}
            onAddEvent={() => setQuickAddOpen(true)}
          />

          <CollapsibleCalendar events={allEvents} onEventsChanged={refresh} />

          <Card className="border-border shadow-sm bg-card">
            <CardContent className="pt-6">
              <UpcomingEvents
                events={allEvents}
                pageSize={10}
                excludeTodayAndTomorrow
                onEventsChanged={refresh}
              />
            </CardContent>
          </Card>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:block">
          <DesktopCalendarGrid events={allEvents} onEventsChanged={refresh} />
        </div>

        {/* Quick Add FAB (mobile only) */}
        <div className="lg:hidden">
          <QuickAddFab onClick={() => setQuickAddOpen(true)} />
        </div>

        <QuickAddSheet
          open={quickAddOpen}
          onOpenChange={setQuickAddOpen}
          onEventCreated={refresh}
        />

        <EventDetailDialog
          event={selectedEvent}
          open={eventDetailOpen}
          onOpenChange={setEventDetailOpen}
          onEdit={(event) => {
            setEventDetailOpen(false);
            setEditingEvent(event);
            setEditDialogOpen(true);
          }}
        />

        <EditEventDialog
          event={editingEvent}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onEventUpdated={refresh}
          onEventDeleted={refresh}
        />
    </DashboardLayout>
  );
}
