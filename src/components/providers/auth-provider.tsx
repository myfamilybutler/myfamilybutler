'use client';

import { useEffect } from 'react';
import { getSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { useFamilyDataSync, useFamilyStore } from '@/stores/family-store';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { logError } from '@/lib/utils/logger';

interface AuthProviderProps {
  children: React.ReactNode;
}

async function fetchDbUser(): Promise<import('@/stores/auth-store').DbUser | null> {
  try {
    const response = await fetch('/api/user/me', {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      logError('AuthProvider: /api/user/me failed', await response.text());
      return null;
    }

    const result = await response.json();
    return result.user as import('@/stores/auth-store').DbUser | null;
  } catch (error) {
    logError('AuthProvider: Unexpected error fetching db user', error);
    return null;
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const setAuthState = useAuthStore((s) => s.setAuthState);
  const resetFamily = useFamilyStore((s) => s.actions.reset);

  useFamilyDataSync();

  useEffect(() => {
    const supabase = getSupabase();
    let isMounted = true;

    async function handleSession(session: Session | null) {
      if (!isMounted) return;

      if (session?.user) {
        setAuthState({ user: session.user, dbUserLoading: true, loading: true });
        const dbUser = await fetchDbUser();
        if (!isMounted) return;

        if (!dbUser) {
          // Treat a missing/broken DB user as an authentication failure so
          // consumers never see an authenticated user without a valid DB row.
          logError('AuthProvider: dbUser missing for authenticated session; signing out client state');
          setAuthState({
            user: null,
            dbUser: null,
            dbUserLoading: false,
            loading: false,
          });
          resetFamily();
          return;
        }

        setAuthState({
          user: session.user,
          dbUser,
          dbUserLoading: false,
          loading: false,
        });
      } else {
        setAuthState({
          user: null,
          dbUser: null,
          dbUserLoading: false,
          loading: false,
        });
        resetFamily();
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    }).catch((err) => {
      if (!isMounted) return;
      logError('AuthProvider: session check failed', err);
      setAuthState({
        user: null,
        dbUser: null,
        dbUserLoading: false,
        loading: false,
      });
      resetFamily();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!isMounted) return;

        if (event === 'SIGNED_OUT') {
          setAuthState({
            user: null,
            dbUser: null,
            dbUserLoading: false,
            loading: false,
          });
          resetFamily();
        } else {
          await handleSession(session);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [setAuthState, resetFamily]);

  return <>{children}</>;
}
