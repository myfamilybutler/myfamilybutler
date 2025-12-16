import { create } from 'zustand';
import type { User as FirebaseUser } from 'firebase/auth';

interface AuthStore {
  user: FirebaseUser | null;
  loading: boolean;
  onboardingCompleted: boolean;
  supabaseUserId: string | null;
  setUser: (user: FirebaseUser | null) => void;
  setLoading: (loading: boolean) => void;
  setOnboardingCompleted: (completed: boolean) => void;
  setSupabaseUserId: (id: string | null) => void;
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
  
  reset: () => set({
    user: null,
    loading: false,
    onboardingCompleted: false,
    supabaseUserId: null,
  }),
}));
