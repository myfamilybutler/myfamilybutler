'use client';

import { useEffect, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { setUser, setLoading, setOnboardingCompleted, setSupabaseUserId } = useAuthStore();

  const checkAuthStatus = useCallback(async (supabaseUserIdParam: string, email: string | undefined) => {
    try {
      const response = await fetch('/api/auth/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          supabaseUserId: supabaseUserIdParam,
          email: email || '' 
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setOnboardingCompleted(data.onboardingCompleted);
        setSupabaseUserId(data.userId);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setLoading(false);
    }
  }, [setOnboardingCompleted, setSupabaseUserId, setLoading]);

  useEffect(() => {
    const supabase = getSupabase();
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      const user = session?.user ?? null;
      setUser(user);
      
      if (user) {
        // Check onboarding status from API
        checkAuthStatus(user.id, user.email);
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
          setSupabaseUserId(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [setUser, setLoading, setOnboardingCompleted, setSupabaseUserId, checkAuthStatus]);

  return <>{children}</>;
}

