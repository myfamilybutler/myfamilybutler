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
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useDashboardData } from '@/hooks';

export default function DashboardPage() {
  const { 
    allEvents, 
    refresh, 
    dbUser,
    memberColors,
  } = useDashboardData();
  
  const [modalDismissed, setModalDismissed] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  // Progressive onboarding: only show modal after user has created 3+ events
  // This ensures they've seen value before we ask for profile details
  const hasEnoughEvents = allEvents.length >= 3;
  const showOnboardingModal = dbUser?.onboarding_modal_shown === false && !modalDismissed && hasEnoughEvents;

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
          {/* Collapsible Calendar Header */}
          <CollapsibleCalendar
            events={allEvents}
            onEventsChanged={refresh}
            memberColors={memberColors}
          />
          
          {/* Upcoming Events (full width) */}
          <Card className="border-gray-200 shadow-sm bg-white">
            <CardHeader>
              <h3 className="text-sm font-semibold text-gray-900">Upcoming Events</h3>
            </CardHeader>
            <CardContent>
              <UpcomingEvents
                events={allEvents}
                pageSize={10}
                onEventsChanged={refresh}
                hideHeader
                memberColors={memberColors}
              />
            </CardContent>
          </Card>
        </div>

        {/* Desktop Layout (full-width Google Calendar style grid) */}
        <div className="hidden lg:block">
          <DesktopCalendarGrid
            events={allEvents}
            onEventsChanged={refresh}
            memberColors={memberColors}
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
      </DashboardLayout>
    </ProtectedRoute>
  );
}
