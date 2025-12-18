'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOnboarding?: boolean; // If true, redirects to dashboard if onboarding is complete
}

// Custom hook to check session status
function useSessionStatus() {
  const [status, setStatus] = useState<{
    checked: boolean;
    valid: boolean;
    userId?: string;
  }>({ checked: false, valid: false });

  useEffect(() => {
    let cancelled = false;
    
    async function check() {
      try {
        const res = await fetch('/api/auth/status');
        const data = await res.json();
        
        if (!cancelled) {
          if (data.authenticated && data.userId) {
            setStatus({ checked: true, valid: true, userId: data.userId });
          } else {
            setStatus({ checked: true, valid: false });
          }
        }
      } catch {
        if (!cancelled) {
          setStatus({ checked: true, valid: false });
        }
      }
    }

    check();

    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}

export function ProtectedRoute({ children, requireOnboarding = false }: ProtectedRouteProps) {
  const router = useRouter();
  const { user, loading, onboardingCompleted, setSupabaseUserId } = useAuthStore();
  const customSession = useSessionStatus();

  // Determine authentication status
  const isAuthenticated = user || customSession.valid;
  // For Supabase users, we don't need to wait for custom session check
  const isLoading = loading || (!user && !customSession.checked);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      // Not authenticated, redirect to login
      router.replace('/login');
      return;
    }

    // For custom session users, skip onboarding checks and hydrate store
    if (customSession.valid && customSession.userId) {
      // Only store the userId - let DashboardPage fetch and set the full profile
      // This prevents race conditions where fake data overwrites real data
      if (!user) {
        console.log('[ProtectedRoute] Custom session valid, userId:', customSession.userId);
        setSupabaseUserId(customSession.userId);
        // NOTE: We do NOT call setUser() here anymore.
        // DashboardPage will fetch the real profile and hydrate properly.
      }
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
  }, [isAuthenticated, isLoading, onboardingCompleted, requireOnboarding, router, customSession, user, setSupabaseUserId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
