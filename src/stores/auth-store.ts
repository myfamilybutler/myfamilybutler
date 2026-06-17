import { create } from 'zustand';
import { getSupabase } from '@/lib/supabase';
import { fetchWithTimeout } from '@/lib/utils/fetch';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { logError } from '@/lib/utils/logger';

// Raw database user (from our users table)
export interface DbUser {
  id: string;
  phone_number?: string | null;
  display_name?: string | null;
  household_id?: string | null;
  linked_email?: string | null;
  email_verified?: boolean | null;
  phone_verified?: boolean | null;
  telegram_chat_id?: string | null;
  whatsapp_verified?: boolean | null;
  onboarding_modal_shown?: boolean;
  onboarding_source?: 'whatsapp' | 'telegram' | 'invite' | 'email_invite' | 'web';
  is_admin?: boolean;
  is_household_admin?: boolean;
  identity_linked_at?: string | null;
  language?: 'de' | 'en' | null;
  created_at?: string;
}

interface AuthStore {
  user: SupabaseUser | null;
  dbUser: DbUser | null;
  loading: boolean;
  dbUserLoading: boolean;
  setUser: (user: SupabaseUser | null) => void;
  setDbUser: (dbUser: DbUser | null) => void;
  setLoading: (loading: boolean) => void;
  setDbUserLoading: (loading: boolean) => void;
  /**
   * Atomic setter: updates user, dbUser, and loading flags in a single store tick.
   * Use this whenever the full auth state is known to prevent torn reads.
   */
  setAuthState: (state: {
    user?: SupabaseUser | null;
    dbUser?: DbUser | null;
    loading?: boolean;
    dbUserLoading?: boolean;
  }) => void;
  /** Refresh dbUser from the server. */
  refreshDbUser: () => Promise<void>;
  signOut: () => Promise<void>;
  reset: () => void;
}

let refreshDbUserPromise: Promise<void> | null = null;

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  dbUser: null,
  loading: true,
  dbUserLoading: false,

  setUser: (user) => set({ user }),
  setDbUser: (dbUser) => set({ dbUser }),
  setLoading: (loading) => set({ loading }),
  setDbUserLoading: (loading) => set({ dbUserLoading: loading }),

  setAuthState: (state) => set((current) => ({ ...current, ...state })),

  refreshDbUser: async () => {
    if (refreshDbUserPromise) {
      return refreshDbUserPromise;
    }

    refreshDbUserPromise = (async () => {
      set({ dbUserLoading: true });
      try {
        const { data: { session } } = await getSupabase().auth.getSession();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        const response = await fetchWithTimeout('/api/user/me', {
          method: 'POST',
          headers,
          credentials: 'include',
        });
        if (!response.ok) {
          logError('[AuthStore] refreshDbUser failed:', await response.text());
          set({ dbUserLoading: false });
          return;
        }
        const result = await response.json();
        set({ dbUser: result.user as DbUser | null, dbUserLoading: false });
      } catch (error) {
        logError('[AuthStore] refreshDbUser error:', error);
        set({ dbUserLoading: false });
      } finally {
        refreshDbUserPromise = null;
      }
    })();

    return refreshDbUserPromise;
  },

  signOut: async () => {
    try {
      await getSupabase().auth.signOut({ scope: 'global' });
    } catch (error) {
      logError('Error signing out:', error);
    } finally {
      set({ user: null, dbUser: null, loading: false, dbUserLoading: false });
      // Also clear cached family data so a subsequent login does not flash
      // the previous user's household.
      try {
        const { useFamilyStore } = await import('./family-store');
        useFamilyStore.getState().actions.reset();
      } catch {
        // family store not available; ignore
      }
    }
  },

  reset: () => set({ user: null, dbUser: null, loading: false, dbUserLoading: false }),
}));
