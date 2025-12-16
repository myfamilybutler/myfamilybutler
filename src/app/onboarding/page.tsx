'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Users, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth-store';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { OnboardingStep } from '@/components/onboarding/onboarding-step';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, setOnboardingCompleted } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/auth/complete-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebaseUid: user.uid }),
      });
      
      if (response.ok) {
        setOnboardingCompleted(true);
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requireOnboarding>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
        {/* Header */}
        <header className="p-6">
          <Link href="/login" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-6 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md"
          >
            <Card className="border-slate-200 shadow-lg">
              <CardHeader className="text-center pb-2">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-emerald-600" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  Add Your Family
                </CardTitle>
                <CardDescription className="text-gray-500">
                  Add family members to get started. You can always add more later.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-6">
                <OnboardingStep />

                {/* Action buttons */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleComplete}
                    disabled={loading}
                    className="flex-1 h-11"
                  >
                    Skip
                  </Button>
                  <Button
                    onClick={handleComplete}
                    disabled={loading}
                    className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
