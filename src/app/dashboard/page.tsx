'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ScheduleWidget } from '@/components/dashboard/schedule-widget';
import { FamilyWidget } from '@/components/dashboard/family-widget';
import { CalendarWidget } from '@/components/calendar/calendar-widget';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuthStore } from '@/stores/auth-store';

import type { CalendarEvent } from '@/components/calendar/calendar-widget';

export default function DashboardPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    async function fetchDashboard() {
      if (hasFetchedRef.current) return;

      const response = await fetch('/api/dashboard');
      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('Dashboard fetch failed:', result.error);
        return;
      }

      // Store raw DB user (clean - no fake object manufacturing)
      useAuthStore.getState().setDbUser(result.user);
      setEvents(result.events || []);
      hasFetchedRef.current = true;
    }

    fetchDashboard();
  }, []);

  // Memoized today's events (no console.log spam in render)
  const todayEvents = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return events.filter(e => e.event_date === today);
  }, [events]);

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 mt-1">Your family&apos;s schedule at a glance</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ScheduleWidget events={todayEvents} />
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
