'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ScheduleWidget } from '@/components/dashboard/schedule-widget';
import { FamilyWidget } from '@/components/dashboard/family-widget';
import { QuickActionsWidget } from '@/components/dashboard/quick-actions-widget';
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
          <p className="text-gray-500 mt-1">Welcome back! Here&apos;s what&apos;s happening with your family.</p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Schedule Widget - spans 2 columns */}
          <div className="lg:col-span-2 lg:row-span-2">
            <ScheduleWidget />
          </div>

          {/* Family Members Widget */}
          <div>
            <FamilyWidget />
          </div>

          {/* Quick Actions Widget */}
          <div>
            <QuickActionsWidget />
          </div>
        </div>

        {/* Calendar Widget - Full width */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <CalendarWidget />
          </div>
          
          {/* Placeholder for additional widget */}
          <div className="hidden lg:block">
            <div className="h-full min-h-[300px] rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center">
              <p className="text-gray-400 text-sm">More widgets coming soon</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
    </ProtectedRoute>
  );
}
