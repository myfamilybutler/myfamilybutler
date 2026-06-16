'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { logWarn } from '@/lib/utils/logger';


export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { dbUser, user, loading } = useAuthStore();


  useEffect(() => {
    // 1. If auth loading is done, but we have no session -> Redirect
    if (!loading && !user && !dbUser) {
        logWarn('AdminGuard: No user found, redirecting');
        router.replace('/dashboard'); // or login
        return;
    }

    // 2. If Auth User exists but DB User is missing -> 
    // NOW HANDLED BY AuthProvider/StatusAPI. We just wait.
    
    // 3. If we HAVE dbUser, check Admin Status
    if (!loading && dbUser && !dbUser.is_admin) {
      logWarn('Unauthorized access attempt to Admin Dashboard');
      router.replace('/dashboard');
    }
  }, [dbUser, user, loading, router]);

  if (loading || (user && !dbUser)) {
    // Standard Loading State - No Spinner (Rule: No custom animations)
    return null; 
  }
  
  // If dbUser loaded but not admin -> Return null (effect will redirect)
  if (dbUser && !dbUser.is_admin) return null;

  return <>{children}</>;
}
