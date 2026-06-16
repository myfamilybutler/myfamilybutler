'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const { user, dbUser, loading, dbUserLoading } = useAuthStore();

  useEffect(() => {
    if (!loading && !dbUserLoading && user) {
      if (!dbUser?.household_id) {
        router.replace('/onboarding');
      }
    } else if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, dbUser, loading, dbUserLoading, router]);

  if (loading || dbUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-muted-foreground">Laedt...</p>
        </div>
      </div>
    );
  }

  if (!user || !dbUser?.household_id) {
    // Keep showing the loader while the redirect happens so the user never
    // sees a blank flash.
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-muted-foreground">Laedt...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
