'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOnboarding?: boolean; // If true, redirects to dashboard if onboarding is complete
}

export function ProtectedRoute({ children, requireOnboarding = false }: ProtectedRouteProps) {
  const router = useRouter();
  const { user, loading, onboardingCompleted } = useAuthStore();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      // Not authenticated, redirect to login
      router.replace('/login');
      return;
    }

    if (requireOnboarding && onboardingCompleted) {
      // User is on onboarding page but already completed, redirect to dashboard
      router.replace('/dashboard');
      return;
    }

    if (!requireOnboarding && !onboardingCompleted) {
      // User is on dashboard but hasn't completed onboarding, redirect to onboarding
      router.replace('/onboarding');
      return;
    }
  }, [user, loading, onboardingCompleted, requireOnboarding, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Additional checks for proper routing
  if (requireOnboarding && onboardingCompleted) {
    return null;
  }

  if (!requireOnboarding && !onboardingCompleted) {
    return null;
  }

  return <>{children}</>;
}
