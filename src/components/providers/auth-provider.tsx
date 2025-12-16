'use client';

import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuthStore } from '@/stores/auth-store';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { setUser, setLoading, setOnboardingCompleted, setSupabaseUserId } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Check onboarding status from API
        try {
          const response = await fetch('/api/auth/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              firebaseUid: firebaseUser.uid,
              phoneNumber: firebaseUser.phoneNumber 
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            setOnboardingCompleted(data.onboardingCompleted);
            setSupabaseUserId(data.userId);
          }
        } catch (error) {
          console.error('Error checking auth status:', error);
        }
      } else {
        setOnboardingCompleted(false);
        setSupabaseUserId(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setLoading, setOnboardingCompleted, setSupabaseUserId]);

  return <>{children}</>;
}
