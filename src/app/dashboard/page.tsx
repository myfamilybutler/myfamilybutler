'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { CollapsibleCalendar } from '@/components/calendar/collapsible-calendar';
import { UpcomingEvents } from '@/components/calendar/upcoming-events';
import { DesktopCalendarGrid } from '@/components/calendar/desktop-calendar-grid';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { OnboardingModal } from '@/components/onboarding/onboarding-modal';
import { QuickAddFab } from '@/components/calendar/quick-add-fab';
import { QuickAddSheet } from '@/components/calendar/quick-add-sheet';
import { EditEventDialog } from '@/components/calendar/edit-event-dialog';
import { TodayWidget } from '@/components/dashboard/today-widget';
import { Card, CardContent } from '@/components/ui/card';
import { useDashboardData } from '@/hooks';
import type { CalendarEvent } from '@/types/calendar';

export default function DashboardPage() {
  const { 
    allEvents, 
    refresh, 
    dbUser,
  } = useDashboardData();
  
  const [modalDismissed, setModalDismissed] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Progressive onboarding: only show modal after user has created 3+ events
  // This ensures they've seen value before we ask for profile details
  const hasEnoughEvents = allEvents.length >= 3;
  const showOnboardingModal = dbUser?.onboarding_modal_shown === false && !modalDismissed && hasEnoughEvents;

  const handleEventClick = (event: CalendarEvent) => {
    setEditingEvent(event);
    setEditDialogOpen(true);
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <OnboardingModal
          isOpen={showOnboardingModal}
          onComplete={() => {
            setModalDismissed(true);
            refresh();
          }}
          onSkip={() => setModalDismissed(true)}
        />

        {/* Mobile Layout (Google Calendar style) */}
        <div className="lg:hidden space-y-4">
          {/* Today Widget - Quick glance at today's events */}
          <TodayWidget 
            events={allEvents}
            onEventClick={handleEventClick}
            onAddEvent={() => setQuickAddOpen(true)}
          />
          
          {/* Collapsible Calendar Header */}
          <CollapsibleCalendar
            events={allEvents}
            onEventsChanged={refresh}
          />
          
          {/* Upcoming Events (full width) */}
          <Card className="border-border shadow-sm bg-card">
            <CardContent className="pt-6">
              <UpcomingEvents
                events={allEvents}
                pageSize={10}
                onEventsChanged={refresh}
              />
            </CardContent>
          </Card>
        </div>

        {/* Desktop Layout (full-width Google Calendar style grid) */}
        <div className="hidden lg:block">
          <DesktopCalendarGrid
            events={allEvents}
            onEventsChanged={refresh}
          />
        </div>

        {/* Quick Add FAB (mobile only - desktop uses grid click) */}
        <div className="lg:hidden">
          <QuickAddFab onClick={() => setQuickAddOpen(true)} />
        </div>
        
        {/* Quick Add Bottom Sheet (mobile only) */}
        <QuickAddSheet
          open={quickAddOpen}
          onOpenChange={setQuickAddOpen}
          onEventCreated={refresh}
        />

        {/* Edit Event Dialog (opened from TodayWidget) */}
        <EditEventDialog
          event={editingEvent}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onEventUpdated={refresh}
          onEventDeleted={refresh}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

