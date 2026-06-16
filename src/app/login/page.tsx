'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getSupabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth-store';

function OAuthButtons({ disabled }: { disabled?: boolean }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const { error } = await getSupabase().auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch {
      // Error is surfaced via URL or toast; user remains on page
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled || loading}
      onClick={handleGoogle}
      className="h-11 w-full"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {t('auth.login.google')}
        </>
      )}
    </Button>
  );
}

function LoginContent() {
  const router = useRouter();
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuthStore();
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const urlError = searchParams.get('error');

  const getUrlErrorMessage = (code: string) => {
    switch (code) {
      case 'pkce_error':
        return t('auth.login.pkceError');
      case 'verification_failed':
        return t('auth.login.verificationFailed');
      case 'invalid_or_expired':
      default:
        return t('auth.login.invalidOrExpired');
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      const returnUrl = searchParams.get('returnUrl');
      if (returnUrl) {
        router.replace(decodeURIComponent(returnUrl));
      } else {
        router.replace('/dashboard');
      }
    }
  }, [user, authLoading, router, searchParams]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: signInError } = await getSupabase().auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.login.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-6">
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          {t('auth.login.backToHome')}
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <Card className="border-border shadow-lg">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 bg-primary/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">
                {t('auth.login.title')}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {t('auth.login.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {urlError && (
                <div className="p-3 bg-destructive/10 border border-destructive/25 rounded-lg flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {getUrlErrorMessage(urlError)}
                </div>
              )}

              <OAuthButtons disabled={loading} />

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    {t('auth.login.or')}
                  </span>
                </div>
              </div>

              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-foreground">
                    {t('auth.login.emailLabel')}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder={t('auth.login.emailPlaceholder')}
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
                    {t('auth.login.passwordLabel')}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder={t('auth.login.passwordPlaceholder')}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(''); }}
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
                  disabled={loading || !email || !password}
                  className="w-full h-12 gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t('auth.login.signingIn')}
                    </>
                  ) : (
                    <>
                      {t('auth.login.signIn')}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  {t('auth.login.noAccount')}{' '}
                  <Link
                    href={`/register${searchParams.get('returnUrl') ? `?returnUrl=${searchParams.get('returnUrl')}` : ''}`}
                    className="text-primary hover:underline font-medium"
                  >
                    {t('auth.login.registerWithEmail')}
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {t('auth.login.acceptTermsPrefix')}{' '}
            <Link href="/terms" className="text-primary hover:underline">
              {t('auth.login.terms')}
            </Link>{' '}
            {t('auth.login.acceptTermsAnd')}{' '}
            <Link href="/privacy" className="text-primary hover:underline">
              {t('auth.login.privacy')}
            </Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
