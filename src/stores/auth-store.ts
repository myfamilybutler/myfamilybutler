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
  dbUser: DbUser | null;
  loading: boolean;
  onboardingCompleted: boolean;
  // Removed supabaseUserId - use user?.id instead (single source of truth)
  setUser: (user: SupabaseUser | null) => void;
  setDbUser: (dbUser: DbUser | null) => void;
  setLoading: (loading: boolean) => void;
  setOnboardingCompleted: (completed: boolean) => void;
  signOut: () => Promise<void>;
  reset: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  dbUser: null,
  loading: true,
  onboardingCompleted: false,

  setUser: (user) => set({ user }),
  setDbUser: (dbUser) => set({ dbUser }),
  setLoading: (loading) => set({ loading }),
  setOnboardingCompleted: (completed) => set({ onboardingCompleted: completed }),
  
  signOut: async () => {
    try {
      await getSupabase().auth.signOut();
      set({
        user: null,
        dbUser: null,
        loading: false,
        onboardingCompleted: false,
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
  }),
}));

// Convenience selector for getting supabase user ID
export const useSupabaseUserId = () => useAuthStore((state) => state.user?.id ?? null);


