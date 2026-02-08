'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, Loader2, ArrowLeft, CheckCircle, AlertCircle, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth-store';
import { APP_LINKS } from '@/lib/config';
import { requestEmailLoginLink } from '@/lib/auth/email-login';

// Dev-only password login form component
function DevLoginForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.success) {
        // Store user in auth store
        useAuthStore.getState().setDbUser(data.user);
        router.push('/dashboard');
      } else {
        setError(data.error || t('auth.devLogin.failed'));
      }
    } catch {
      setError(t('common.networkError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mt-6 border-destructive/25 bg-destructive/10">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-destructive" />
          <CardTitle className="text-sm font-bold text-destructive">
            {t('auth.devLogin.title')}
          </CardTitle>
        </div>
        <CardDescription className="text-xs text-destructive/90">
          {t('auth.devLogin.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <form onSubmit={handleDevLogin} className="space-y-3">
          <Input
            type="email"
            placeholder={t('auth.devLogin.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 text-sm"
            disabled={loading}
          />
          <Input
            type="password"
            placeholder={t('auth.devLogin.passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-10 text-sm"
            disabled={loading}
          />
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
          <Button
            type="submit"
            variant="destructive"
            disabled={loading || !email || !password}
            className="w-full h-9 text-sm"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              t('auth.devLogin.submit')
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// Separate component for content that uses searchParams
function LoginContent() {
  const router = useRouter();
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');

  // Check for error from magic link
  const urlError = searchParams.get('error');

  // Redirect if already logged in
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
      const data = await requestEmailLoginLink(email);
      if (data.success) {
        setEmailSent(true);
      } else {
        const message = data.status === 429
          ? t('auth.login.rateLimited')
          : t('auth.login.sendLinkFailed');
        setError(message);
      }
    } catch {
      setError(t('auth.login.networkErrorRetry'));
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
      {/* Header */}
      <header className="p-6">
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          {t('auth.login.backToHome')}
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
            <CardContent className="pt-4">
              {/* URL Error (from failed magic link) */}
              {urlError && !emailSent && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/25 rounded-lg flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {urlError === 'invalid_or_expired'
                    ? t('auth.login.invalidOrExpired')
                    : t('auth.login.loginFailed')}
                </div>
              )}

              {emailSent ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-6"
                >
                  <div className="w-16 h-16 bg-primary/15 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {t('auth.login.emailSentTitle')}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {t('auth.login.emailSentMessage', { email })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('auth.login.emailSentValidity')}
                  </p>
                  <Button
                    variant="outline"
                    className="mt-6"
                    onClick={() => { setEmailSent(false); setEmail(''); }}
                  >
                    {t('auth.login.useAnotherEmail')}
                  </Button>
                </motion.div>
              ) : (
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
                    disabled={loading || !email}
                    className="w-full h-12 gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t('auth.login.sendingLink')}
                      </>
                    ) : (
                      <>
                        {t('auth.login.sendLink')}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </form>
              )}

                <div className="mt-6 pt-6 border-t border-border text-center space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p className="mb-2">{t('auth.login.noAccount')}</p>
                  <div className="flex flex-col gap-2">
                    <p>
                      {t('auth.login.startOnWhatsApp')}{' '}
                      <a
                        href={APP_LINKS.whatsappLink}
                        className="text-primary hover:underline font-medium"
                      >
                        WhatsApp
                      </a>
                    </p>
                    <span className="text-xs text-muted-foreground">{t('auth.login.or')}</span>
                    <Link 
                      href={`/register${searchParams.get('returnUrl') ? `?returnUrl=${searchParams.get('returnUrl')}` : ''}`}
                      className="text-primary hover:underline font-medium"
                    >
                      {t('auth.login.registerWithEmail')}
                    </Link>
                  </div>
                </div>
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

          {/* Dev-only password login */}
          {process.env.NODE_ENV === 'development' && (
            <DevLoginForm />
          )}
        </motion.div>
      </main>
    </div>
  );
}

// Default export with Suspense boundary for useSearchParams
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
