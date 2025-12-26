'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { CalendarWidget } from '@/components/calendar/calendar-widget';
import { CollapsibleCalendar } from '@/components/calendar/collapsible-calendar';
import { UpcomingEvents } from '@/components/calendar/upcoming-events';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { OnboardingModal } from '@/components/onboarding/onboarding-modal';
import { QuickAddFab } from '@/components/calendar/quick-add-fab';
import { QuickAddSheet } from '@/components/calendar/quick-add-sheet';
import { Card, CardContent } from '@/components/ui/card';
import { useDashboardData } from '@/hooks';

export default function DashboardPage() {
  const { 
    allEvents, 
    refresh, 
    dbUser 
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
          />
          
          {/* Upcoming Events (full width) */}
          <Card className="border-gray-200 shadow-sm bg-white">
            <CardContent>
              <UpcomingEvents
                events={allEvents}
                pageSize={10}
                onEventsChanged={refresh}
              />
            </CardContent>
          </Card>
        </div>

        {/* Desktop Layout (side by side) */}
        <div className="hidden lg:flex lg:gap-6">
          <aside className="lg:w-80 lg:flex-shrink-0 space-y-4">
            <Card className="border-gray-200 shadow-sm bg-white">
              <CardContent>
                <UpcomingEvents
                  events={allEvents}
                  pageSize={5}
                  onEventsChanged={refresh}
                />
              </CardContent>
            </Card>
          </aside>

          <main className="flex-1">
            <CalendarWidget
              events={allEvents}
              onEventsChanged={refresh}
            />
          </main>
        </div>

        {/* Quick Add FAB (mobile-friendly) */}
        <QuickAddFab onClick={() => setQuickAddOpen(true)} />
        
        {/* Quick Add Bottom Sheet */}
        <QuickAddSheet
          open={quickAddOpen}
          onOpenChange={setQuickAddOpen}
          onEventCreated={refresh}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
