'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Loader2, ArrowLeft, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getSupabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth-store';

export default function RegisterPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, loading: authLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError(t('auth.register.passwordsDoNotMatch'));
      return;
    }

    // Validate password strength
    if (password.length < 6) {
      setError(t('auth.register.passwordMinLength'));
      return;
    }

    setLoading(true);

    try {
      const { data, error: signUpError } = await getSupabase().auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/onboarding`,
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      // Try to get the DB user ID to set in session cookie (may not exist for new users)
      let userId = null;
      if (data.user) {
        try {
          const userRes = await fetch(`/api/user/me?supabaseUserId=${data.user.id}`);
          const userData = await userRes.json();
          userId = userData.user?.id;
        } catch {
          // New users may not have DB record yet
        }
      }
      
      // Set server-side session cookie
      await fetch('/api/auth/session', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      
      setSuccess(true);
      
      // Redirect to onboarding after short delay
      // Redirect to onboarding or returnUrl
      setTimeout(() => {
        const returnUrl = new URLSearchParams(window.location.search).get('returnUrl');
        if (returnUrl) {
           router.push(returnUrl);
        } else {
           router.push('/onboarding');
        }
      }, 1500);
    } catch (err) {
      console.error('Error signing up:', err);
      
      let errorMessage = t('auth.register.createFailed');
      if (err instanceof Error) {
        if (err.message.includes('already registered')) {
          errorMessage = t('auth.register.alreadyRegistered');
        } else if (err.message.includes('weak_password')) {
          errorMessage = t('auth.register.weakPassword');
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50 flex flex-col">
      {/* Header */}
      <header className="p-6">
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          {t('auth.register.backToHome')}
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
          <Card className="border-border shadow-lg">
            <CardHeader className="text-center pb-2">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors ${
                success ? 'bg-primary' : 'bg-primary/15'
              }`}>
                {success ? (
                  <UserPlus className="w-8 h-8 text-primary-foreground" />
                ) : (
                  <UserPlus className="w-8 h-8 text-primary" />
                )}
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">
                {success ? t('auth.register.successTitle') : t('auth.register.title')}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {success 
                  ? t('auth.register.successDescription')
                  : t('auth.register.description')
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {!success ? (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium text-foreground">
                      {t('auth.register.emailLabel')}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder={t('auth.register.emailPlaceholder')}
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(''); }}
                        className="pl-11 h-12"
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-medium text-foreground">
                      {t('auth.register.passwordLabel')}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder={t('auth.register.passwordPlaceholder')}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(''); }}
                        className="pl-11 h-12"
                        disabled={loading}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                      {t('auth.register.confirmPasswordLabel')}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder={t('auth.register.confirmPasswordPlaceholder')}
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                        className="pl-11 h-12"
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sm text-destructive text-center"
                    >
                      {error}
                    </motion.p>
                  )}

                  <Button
                    type="submit"
                    variant="brand"
                    disabled={loading || !email || !password || !confirmPassword}
                    className="w-full h-12 gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t('auth.register.submitting')}
                      </>
                    ) : (
                      <>
                        {t('auth.register.submit')}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </form>
              ) : (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}

              {!success && (
                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    {t('auth.register.alreadyHaveAccount')}{' '}
                    <Link href="/login" className="text-primary hover:underline font-medium">
                      {t('auth.register.signIn')}
                    </Link>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {t('auth.register.continuePrefix')}{' '}
            <Link href="/terms" className="text-primary hover:underline">
              {t('auth.register.terms')}
            </Link>{' '}
            {t('auth.register.continueAnd')}{' '}
            <Link href="/privacy" className="text-primary hover:underline">
              {t('auth.register.privacy')}
            </Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
}
