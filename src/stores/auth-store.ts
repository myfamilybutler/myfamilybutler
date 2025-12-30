import { create } from 'zustand';
import { getSupabase } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

// Raw database user (from our users table)
export interface DbUser {
  id: string;
  phone_number?: string | null;
  display_name?: string | null;
  household_id?: string | null;
  linked_email?: string | null;
  email_verified?: boolean | null;
  telegram_chat_id?: string | null;
  whatsapp_verified?: boolean | null;
  onboarding_modal_shown?: boolean;
  onboarding_source?: 'whatsapp' | 'telegram' | 'invite' | 'web';
  is_admin?: boolean;
  created_at?: string;
}

interface AuthStore {
  user: SupabaseUser | null;
  dbUser: DbUser | null;
  loading: boolean;
  setUser: (user: SupabaseUser | null) => void;
  setDbUser: (dbUser: DbUser | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => Promise<void>;
  reset: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  dbUser: null,
  loading: true,

  setUser: (user) => set({ user }),
  setDbUser: (dbUser) => set({ dbUser }),
  setLoading: (loading) => set({ loading }),

  signOut: async () => {
    try {
      await getSupabase().auth.signOut();
      set({ user: null, dbUser: null, loading: false });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  },

  reset: () => set({ user: null, dbUser: null, loading: false }),
}));
