'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Users, ArrowRight, Loader2, Sparkles, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { logError } from '@/lib/utils/logger';

export default function OnboardingPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [familyName, setFamilyName] = useState('');
  
  // Two-step wizard: 'family' | 'aiKey'
  const [step, setStep] = useState<'family' | 'aiKey'>('family');
  const [geminiKey, setGeminiKey] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  
  const { dbUser, setDbUser } = useAuthStore();
  const router = useRouter();

  const refetchUser = async () => {
    try {
      const res = await fetch('/api/user/me', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setDbUser(data.user);
        }
      }
    } catch (error) {
      logError('Failed to refetch user:', error);
    }
  };

  // Redirect if user already has a family AND they are not in the key step
  useEffect(() => {
    if (dbUser?.household_id && step === 'family') {
      // If they already have a household, skip to dashboard or check key
      router.push('/dashboard');
    }
  }, [dbUser, step, router]);

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'create',
          name: familyName || t('onboarding.defaultFamilyName')
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(t('onboarding.familyCreated'));
        // Refresh local store user data
        await refetchUser();
        // Go to Step 2
        setStep('aiKey');
      } else {
        if (data.error === 'User already has a family') {
          toast.success(t('onboarding.familyExists'));
          router.push('/dashboard');
          return;
        }
        toast.error(data.error || t('onboarding.createError'));
      }
    } catch (error) {
      logError('Create family error:', error);
      toast.error(t('onboarding.networkError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAIKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingKey(true);

    try {
      const res = await fetch('/api/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateGeminiKey',
          geminiApiKey: geminiKey
        })
      });

      if (res.ok) {
        toast.success(t('onboarding.geminiKeySuccess'));
        window.location.href = '/dashboard';
      } else {
        const data = await res.json();
        toast.error(data.error || t('onboarding.geminiKeyError'));
      }
    } catch (error) {
      logError('Save AI key error:', error);
      toast.error(t('onboarding.networkError'));
    } finally {
      setSavingKey(false);
    }
  };

  const handleSkipKey = () => {
    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        {step === 'family' ? (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">{t('onboarding.createTitle')}</CardTitle>
              <CardDescription>
                {t('onboarding.createDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateFamily} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="familyName">{t('onboarding.familyName')}</Label>
                  <Input
                    id="familyName"
                    placeholder={t('onboarding.familyNamePlaceholder')}
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    required
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('onboarding.creating')}
                    </>
                  ) : (
                    <>
                      {t('onboarding.submit')}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-emerald-600" />
              </div>
              <CardTitle className="text-2xl">{t('onboarding.aiKeyTitle')}</CardTitle>
              <CardDescription>
                {t('onboarding.aiKeyDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveAIKey} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="geminiKey">{t('onboarding.geminiKey')}</Label>
                  <Input
                    id="geminiKey"
                    type="password"
                    placeholder={t('onboarding.geminiKeyPlaceholder')}
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    required
                  />
                  <div className="pt-2 flex items-start gap-2 text-xs text-muted-foreground">
                    <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      {t('onboarding.geminiKeyHelp')}{' '}
                      <a
                        href="https://aistudio.google.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-medium"
                      >
                        Google AI Studio
                      </a>
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <Button type="submit" className="w-full" disabled={savingKey}>
                    {savingKey ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('onboarding.creating')}
                      </>
                    ) : (
                      <>
                        {t('onboarding.submit')}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="w-full text-muted-foreground"
                    onClick={handleSkipKey}
                    disabled={savingKey}
                  >
                    {t('onboarding.skip')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
