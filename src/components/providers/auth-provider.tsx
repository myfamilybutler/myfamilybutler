'use client';

import { useEffect, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { setUser, setLoading, setOnboardingCompleted } = useAuthStore();

  const checkAuthStatus = useCallback(async (
    supabaseUserIdParam: string, 
    email: string | undefined,
    signal?: AbortSignal
  ) => {
    try {
      const response = await fetch('/api/auth/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          supabaseUserId: supabaseUserIdParam,
          email: email || '' 
        }),
        signal,
      });
      
      if (response.ok) {
        const data = await response.json();
        setOnboardingCompleted(data.onboardingCompleted);
        // Note: userId is now derived from user?.id in the store
      }
    } catch (error) {
      // Ignore aborted requests
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error('Error checking auth status:', error);
    } finally {
      setLoading(false);
    }
  }, [setOnboardingCompleted, setLoading]);

  useEffect(() => {
    const supabase = getSupabase();
    const abortController = new AbortController();
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      const user = session?.user ?? null;
      setUser(user);
      
      if (user) {
        // Check onboarding status from API
        checkAuthStatus(user.id, user.email, abortController.signal);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        const user = session?.user ?? null;
        setUser(user);

        if (user) {
          await checkAuthStatus(user.id, user.email);
        } else {
          setOnboardingCompleted(false);
          setLoading(false);
        }
      }
    );

    return () => {
      abortController.abort();
      subscription.unsubscribe();
    };
  }, [setUser, setLoading, setOnboardingCompleted, checkAuthStatus]);

  return <>{children}</>;
}
