import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface AuthStore {
  user: SupabaseUser | null;
  loading: boolean;
  onboardingCompleted: boolean;
  supabaseUserId: string | null;
  setUser: (user: SupabaseUser | null) => void;
  setLoading: (loading: boolean) => void;
  setOnboardingCompleted: (completed: boolean) => void;
  setSupabaseUserId: (id: string | null) => void;
  signOut: () => Promise<void>;
  reset: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: true,
  onboardingCompleted: false,
  supabaseUserId: null,

  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setOnboardingCompleted: (completed) => set({ onboardingCompleted: completed }),
  setSupabaseUserId: (id) => set({ supabaseUserId: id }),
  
  signOut: async () => {
    try {
      await supabase.auth.signOut();
      set({
        user: null,
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
    loading: false,
    onboardingCompleted: false,
    supabaseUserId: null,
  }),
}));
