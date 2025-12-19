import { create } from 'zustand';
import { getSupabase } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

// Raw database user (from our users table)
export interface DbUser {
  id: string;
  email?: string | null;
  phone_number?: string | null;
  display_name?: string | null;
  household_id?: string | null;
  supabase_user_id?: string | null;
  onboarding_completed?: boolean;
  created_at?: string;
}

interface AuthStore {
  user: SupabaseUser | null;
  dbUser: DbUser | null; // Raw DB user - preferred for display
  loading: boolean;
  onboardingCompleted: boolean;
  supabaseUserId: string | null;
  setUser: (user: SupabaseUser | null) => void;
  setDbUser: (dbUser: DbUser | null) => void;
  setLoading: (loading: boolean) => void;
  setOnboardingCompleted: (completed: boolean) => void;
  setSupabaseUserId: (id: string | null) => void;
  signOut: () => Promise<void>;
  reset: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  dbUser: null,
  loading: true,
  onboardingCompleted: false,
  supabaseUserId: null,

  setUser: (user) => set({ user }),
  setDbUser: (dbUser) => set({ dbUser }),
  setLoading: (loading) => set({ loading }),
  setOnboardingCompleted: (completed) => set({ onboardingCompleted: completed }),
  setSupabaseUserId: (id) => set({ supabaseUserId: id }),
  
  signOut: async () => {
    try {
      await getSupabase().auth.signOut();
      set({
        user: null,
        dbUser: null,
        loading: false,
        onboardingCompleted: false,
        supabaseUserId: null,
      });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  },

  reset: () => set({
    user: null,
    dbUser: null,
    loading: false,
    onboardingCompleted: false,
    supabaseUserId: null,
  }),
}));

