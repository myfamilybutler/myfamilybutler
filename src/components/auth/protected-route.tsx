'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Custom hook to check session status (cookie-based auth for WhatsApp/email magic link users)
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

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const { user, loading } = useAuthStore();
  const customSession = useSessionStatus();

  // Determine authentication status
  const isAuthenticated = user || customSession.valid;
  const isLoading = loading || (!user && !customSession.checked);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-muted-foreground">Laedt...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
