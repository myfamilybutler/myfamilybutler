'use client';

import { Navbar } from './navbar';
import { ActiveFiltersBar } from './active-filters-bar';
import { InstallPrompt } from '@/components/pwa/install-prompt';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <ActiveFiltersBar />
      <main>
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
      <InstallPrompt />
    </div>
  );
}
