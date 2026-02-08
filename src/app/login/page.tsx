'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, Loader2, ArrowLeft, CheckCircle, AlertCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth-store';
import { APP_LINKS } from '@/lib/config';

// Dev-only password login form component
function DevLoginForm() {
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
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mt-6 border-red-200 bg-red-50/50">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-red-600" />
          <CardTitle className="text-sm font-bold text-red-600">
            DEV ONLY - Password Login
          </CardTitle>
        </div>
        <CardDescription className="text-xs text-red-500">
          This form only works in development mode
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <form onSubmit={handleDevLogin} className="space-y-3">
          <Input
            type="email"
            placeholder="test@myfamilybutler.test"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 text-sm"
            disabled={loading}
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-10 text-sm"
            disabled={loading}
          />
          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}
          <Button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full h-9 bg-red-600 hover:bg-red-700 text-sm"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Dev Login'
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
      const res = await fetch('/api/auth/email-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (data.success) {
        setEmailSent(true);
      } else {
        setError(data.error || 'Failed to send login link');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-6">
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Zurück zur Startseite
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
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-emerald-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">
                Dashboard Login
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Wir senden dir einen Login-Link per Email
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {/* URL Error (from failed magic link) */}
              {urlError && !emailSent && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {urlError === 'invalid_or_expired'
                    ? 'Link ungültig oder abgelaufen. Bitte neuen Link anfordern.'
                    : 'Login fehlgeschlagen. Bitte erneut versuchen.'}
                </div>
              )}

              {emailSent ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-6"
                >
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Email gesendet!
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Prüfe dein Postfach bei <strong>{email}</strong>
                    <br />und klicke auf den Login-Link.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Der Link ist 30 Minuten gültig.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-6"
                    onClick={() => { setEmailSent(false); setEmail(''); }}
                  >
                    Andere Email verwenden
                  </Button>
                </motion.div>
              ) : (
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium text-foreground">
                      Email-Adresse
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="deine@email.com"
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
                      className="text-sm text-red-500 text-center"
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
                        Wird gesendet...
                      </>
                    ) : (
                      <>
                        Login-Link senden
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </form>
              )}

                <div className="mt-6 pt-6 border-t border-border text-center space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p className="mb-2">Noch kein Konto?</p>
                  <div className="flex flex-col gap-2">
                    <p>
                      Starte auf{' '}
                      <a
                        href={APP_LINKS.whatsappLink}
                        className="text-primary hover:underline font-medium"
                      >
                        WhatsApp
                      </a>
                    </p>
                    <span className="text-xs text-muted-foreground">- oder -</span>
                    <Link 
                      href={`/register${searchParams.get('returnUrl') ? `?returnUrl=${searchParams.get('returnUrl')}` : ''}`}
                      className="text-primary hover:underline font-medium"
                    >
                      Mit Email registrieren
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Mit der Anmeldung akzeptierst du unsere{' '}
            <Link href="/terms" className="text-primary hover:underline">
              AGB
            </Link>{' '}
            und{' '}
            <Link href="/privacy" className="text-primary hover:underline">
              Datenschutzerklärung
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
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
