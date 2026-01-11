'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Users, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export default function OnboardingPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const { dbUser } = useAuthStore();
  const router = useRouter();

  // Redirect if user already has a family
  useEffect(() => {
    if (dbUser?.household_id) {
      router.push('/dashboard');
    }
  }, [dbUser, router]);

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'create',
          name: familyName || 'My Family'
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(t('onboarding.familyCreated', 'Family created successfully!'));
        // Force refresh to update user state
        window.location.href = '/dashboard';
      } else {
        // If user already has a family (race condition or pre-assigned), redirect
        if (data.error === 'User already has a family') {
          toast.success(t('onboarding.familyExists', 'You already have a family. Redirecting...'));
          window.location.href = '/dashboard';
          return;
        }
        toast.error(data.error || 'Failed to create family');
      }
    } catch (error) {
      console.error('Create family error:', error);
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Create Your Family</CardTitle>
          <CardDescription>
            Set up your household to start managing tasks and events together.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateFamily} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="familyName">Family Name</Label>
              <Input
                id="familyName"
                placeholder="e.g. The Smiths"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                required
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
