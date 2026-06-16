'use client';

import { useEffect } from 'react';
import { getSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { useFamilyDataSync } from '@/stores/family-store';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { logError } from '@/lib/utils/logger';

interface AuthProviderProps {
  children: React.ReactNode;
}

async function fetchDbUser(userId: string) {
  try {
    const { data, error } = await getSupabase()
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      logError('AuthProvider: Failed to fetch db user', error);
      return null;
    }

    return data as import('@/stores/auth-store').DbUser | null;
  } catch (error) {
    logError('AuthProvider: Unexpected error fetching db user', error);
    return null;
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const setUser = useAuthStore((s) => s.setUser);
  const setDbUser = useAuthStore((s) => s.setDbUser);
  const setLoading = useAuthStore((s) => s.setLoading);

  useFamilyDataSync();

  useEffect(() => {
    const supabase = getSupabase();
    let isMounted = true;

    async function handleSession(session: Session | null) {
      if (!isMounted) return;

      if (session?.user) {
        setUser(session.user);
        const dbUser = await fetchDbUser(session.user.id);
        if (isMounted) {
          setDbUser(dbUser);
          setLoading(false);
        }
      } else {
        setUser(null);
        setDbUser(null);
        setLoading(false);
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    }).catch((err) => {
      if (!isMounted) return;
      logError('AuthProvider: session check failed', err);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!isMounted) return;

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setDbUser(null);
          setLoading(false);
        } else {
          await handleSession(session);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [setUser, setLoading, setDbUser]);

  return <>{children}</>;
}
