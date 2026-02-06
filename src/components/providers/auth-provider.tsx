'use client';

import { useEffect } from 'react';
import { getSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { useFamilyDataSync } from '@/stores/family-store';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * AuthProvider - Handles Supabase Auth state for web-registered users
 * 
 * Note: Most users come through WhatsApp/email magic links and use cookie-based auth.
 * This provider is primarily for backward compatibility with any legacy web registrations.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  // Select actions individually to prevent re-rendering on state changes
  const setUser = useAuthStore((s) => s.setUser);
  const setDbUser = useAuthStore((s) => s.setDbUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  
  // Sync family data when auth state changes
  useFamilyDataSync();

  useEffect(() => {
    const supabase = getSupabase();
    let isMounted = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;

      if (session?.user) {
        setUser(session.user);
        setLoading(false);
      } else {
        // Fallback: Check for custom cookie session (HttpOnly) via API
        fetch('/api/auth/status')
          .then(res => res.json())
          .then(data => {
            if (!isMounted) return;

            if (data.authenticated && data.userId) {
              // Create a stub user so hooks know we are logged in
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              setUser({ id: data.userId, aud: 'authenticated', role: 'authenticated' } as any);
              
              // Hydrate DB User directly (avoiding extra fetch in AdminGuard)
              if (data.user) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setDbUser(data.user as any);
              }
            } else {
              setUser(null);
            }
          })
          .catch(err => console.error('AuthProvider: Status check failed', err))
          .finally(() => {
             if (!isMounted) return;
             setLoading(false);
          });
      }
    }).catch((err) => {
      if (!isMounted) return;
      console.error('AuthProvider: session check failed', err);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (!isMounted) return;

        // Warning: onAuthStateChange fires INITIAL_SESSION with null if no Supabase session exists.
        // We must NOT wipe our custom session in that case.
        
        if (session?.user) {
           setUser(session.user);
           setLoading(false);
        } else if (event === 'SIGNED_OUT') {
           setUser(null);
           setLoading(false);
        } else {
           // Do nothing - let the initial fetch logic handle the "No Supabase Session" case
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
