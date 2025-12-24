'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { CalendarWidget } from '@/components/calendar/calendar-widget';
import { UpcomingEvents } from '@/components/calendar/upcoming-events';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { OnboardingModal } from '@/components/onboarding/onboarding-modal';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent } from '@/components/ui/card';

import type { CalendarEvent } from '@/components/calendar/calendar-widget';

interface FamilyMember {
  id: string;
  name: string;
}

export default function DashboardPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [googleEvents, setGoogleEvents] = useState<CalendarEvent[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
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
      const now = new Date();
      const start = startOfMonth(addMonths(now, -1)).toISOString();
      const end = endOfMonth(addMonths(now, 2)).toISOString();

      const response = await fetch(`/api/calendar/google-events?start=${start}&end=${end}`);
      const result = await response.json();

      if (!response.ok || !result.events) {
        return [];
      }

      return result.events.map((e: CalendarEvent) => ({
        ...e,
        source: 'google' as const,
      }));
    } catch (error) {
      console.error('Failed to fetch Google events:', error);
      return [];
    }
  }, []);

  // Fetch all family members from API (users with accounts + family_members without accounts)
  const fetchFamilyMembers = useCallback(async () => {
    try {
      const response = await fetch('/api/family');
      const result = await response.json();

      if (response.ok && result.success && result.data) {
        const allMembers: FamilyMember[] = [];
        
        // Add users with accounts (use display_name or phone_number)
        if (result.data.users) {
          for (const user of result.data.users) {
            const name = user.display_name || user.phone_number;
            if (name) {
              allMembers.push({ id: user.id, name });
            }
          }
        }
        
        // Add family members without accounts
        if (result.data.familyMembers) {
          for (const member of result.data.familyMembers) {
            allMembers.push({ id: member.id, name: member.name });
          }
        }
        
        return allMembers;
      }
      return [];
    } catch {
      return [];
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    const loadAllData = async () => {
      const [appEvents, gEvents, members] = await Promise.all([
        fetchEventsData(),
        fetchGoogleEvents(),
        fetchFamilyMembers(),
      ]);

      if (appEvents) {
        const markedAppEvents = appEvents.map((e: CalendarEvent) => ({
          ...e,
          source: 'app' as const,
        }));
        setEvents(markedAppEvents);
      }

      setGoogleEvents(gEvents);
      setFamilyMembers(members);
    };

    loadAllData();
  }, [fetchEventsData, fetchGoogleEvents, fetchFamilyMembers]);

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

  // Merge all events
  const allEvents = useMemo(() => {
    return [...events, ...googleEvents];
  }, [events, googleEvents]);

  // Extract family member names for filtering
  const familyMemberNames = useMemo(() => {
    return familyMembers.map(m => m.name);
  }, [familyMembers]);


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
                  familyMembers={familyMemberNames}
                  pageSize={5}
                  onEventsChanged={handleEventsChanged}
                />
              </CardContent>
            </Card>
          </aside>

          <main className="order-1 lg:order-2 flex-1">
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
