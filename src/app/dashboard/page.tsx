'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ScheduleWidget } from '@/components/dashboard/schedule-widget';
import { FamilyWidget } from '@/components/dashboard/family-widget';
import { CalendarWidget } from '@/components/calendar/calendar-widget';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuthStore } from '@/stores/auth-store';

import type { CalendarEvent } from '@/components/calendar/calendar-widget';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    async function fetchEvents() {
      if (!user?.uid) {
        console.log('Dashboard: No Firebase UID available');
        return;
      }

      console.log('Dashboard: Fetching profile for UID:', user.uid);

      console.log('Dashboard: Fetching profile from /api/user/me...');

      // Use API route to bypass RLS and handle auto-linking
      const response = await fetch('/api/user/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebaseUid: user.uid,
          phoneNumber: user.phoneNumber,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success || !result.user) {
        console.error('Error fetching user profile:', result.error);
        return;
      }

      const userProfile = result.user;
      console.log('Dashboard: Found household_id:', userProfile.household_id);

      // Fetch events via API to bypass RLS
      const eventsParams = new URLSearchParams({ firebaseUid: user.uid });
      const eventsRes = await fetch(`/api/events?${eventsParams.toString()}`);
      const eventsData = await eventsRes.json();

      if (!eventsRes.ok || !eventsData.success) {
        console.error('Error fetching events:', eventsData.error);
        return;
      }

      const fetchedEvents: CalendarEvent[] = eventsData.data || [];
      console.log('Dashboard: Fetched events:', fetchedEvents.length);
      
      setEvents(fetchedEvents);
    }

    fetchEvents();
  }, [user?.uid, user?.phoneNumber]);

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Page Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 mt-1">Your family&apos;s schedule at a glance</p>
          </div>

          {/* Simple grid layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Today's Events */}
            <div className="lg:col-span-2">
              <ScheduleWidget events={events.filter(e => {
                const today = format(new Date(), 'yyyy-MM-dd');
                const isMatch = e.event_date === today;
                console.log(`Checking event: ${e.title}, Date: ${e.event_date}, Today: ${today}, Match: ${isMatch}`);
                return isMatch;
              })} />
            </div>

            {/* Family Members */}
            <div>
              <FamilyWidget />
            </div>
          </div>

          {/* Calendar */}
          <div>
            <CalendarWidget events={events} />
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
