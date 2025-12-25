'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { CalendarWidget } from '@/components/calendar/calendar-widget';
import { UpcomingEvents } from '@/components/calendar/upcoming-events';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { OnboardingModal } from '@/components/onboarding/onboarding-modal';
import { Card, CardContent } from '@/components/ui/card';
import { useDashboardData } from '@/hooks';

export default function DashboardPage() {
  const { 
    allEvents, 
    familyMemberNames, 
    refresh, 
    dbUser 
  } = useDashboardData();
  
  const [modalDismissed, setModalDismissed] = useState(false);

  // Derive modal visibility directly
  const showOnboardingModal = dbUser?.onboarding_modal_shown === false && !modalDismissed;

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

        <div className="space-y-4 lg:space-y-0 lg:flex lg:gap-6">
          <aside className="order-2 lg:order-1 lg:w-80 lg:flex-shrink-0 space-y-4">
            <Card className="border-gray-200 shadow-sm bg-white">
              <CardContent className="p-4">
                <UpcomingEvents
                  events={allEvents}
                  familyMembers={familyMemberNames}
                  pageSize={5}
                  onEventsChanged={refresh}
                />
              </CardContent>
            </Card>
          </aside>

          <main className="order-1 lg:order-2 flex-1">
            <CalendarWidget
              events={allEvents}
              onEventsChanged={refresh}
            />
          </main>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
