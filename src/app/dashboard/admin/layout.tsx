'use client';

import { AdminGuard } from '@/lib/auth/admin-guard';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { AdminNav } from '@/components/admin/admin-nav';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <DashboardLayout>
        <AdminNav />
        {children}
      </DashboardLayout>
    </AdminGuard>
  );
}
