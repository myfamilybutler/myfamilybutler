'use client';

import { useEffect } from 'react';
import { getSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { useFamilyDataSync, useFamilyStore } from '@/stores/family-store';
import { fetchWithTimeout } from '@/lib/utils/fetch';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { logError } from '@/lib/utils/logger';

interface AuthProviderProps {
  children: React.ReactNode;
}

async function fetchDbUser(token?: string): Promise<import('@/stores/auth-store').DbUser | null> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetchWithTimeout('/api/user/me', {
      method: 'POST',
      headers,
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
    const initialSessionHandledRef = { current: false };

    async function handleSession(session: Session | null, { isInitial = false }: { isInitial?: boolean } = {}) {
      if (!isMounted) return;

      if (session?.user) {
        // If SSR / another tab already seeded the store for this exact user,
        // avoid a redundant /api/user/me round-trip on the initial load.
        const current = useAuthStore.getState();
        if (
          isInitial &&
          current.user?.id === session.user.id &&
          current.dbUser?.id === session.user.id &&
          !current.loading &&
          !current.dbUserLoading
        ) {
          return;
        }

        setAuthState({ user: session.user, dbUserLoading: true, loading: true });
        const dbUser = await fetchDbUser(session.access_token);
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
      initialSessionHandledRef.current = !!session?.user;
      handleSession(session, { isInitial: true });
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
          initialSessionHandledRef.current = false;
          setAuthState({
            user: null,
            dbUser: null,
            dbUserLoading: false,
            loading: false,
          });
          resetFamily();
        } else if (event === 'INITIAL_SESSION') {
          // Supabase emits INITIAL_SESSION after subscribing. If getSession()
          // already handled this session, do not fetch the DB user again.
          if (initialSessionHandledRef.current) return;
          initialSessionHandledRef.current = !!session?.user;
          await handleSession(session, { isInitial: true });
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
