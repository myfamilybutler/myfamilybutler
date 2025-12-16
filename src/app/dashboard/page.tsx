'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ScheduleWidget } from '@/components/dashboard/schedule-widget';
import { FamilyWidget } from '@/components/dashboard/family-widget';
import { CalendarWidget } from '@/components/calendar/calendar-widget';
import { ProtectedRoute } from '@/components/auth/protected-route';

export default function DashboardPage() {
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
              <ScheduleWidget />
            </div>

            {/* Family Members */}
            <div>
              <FamilyWidget />
            </div>
          </div>

          {/* Calendar */}
          <div className="max-w-md">
            <CalendarWidget />
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
