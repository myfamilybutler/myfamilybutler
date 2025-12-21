'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, Loader2, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth-store';

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
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* Header */}
      <header className="p-6">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
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
          <Card className="border-slate-200 shadow-lg">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-emerald-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Dashboard Login
              </CardTitle>
              <CardDescription className="text-gray-500">
                Wir senden dir einen Login-Link per Email
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {/* URL Error (from failed magic link) */}
              {urlError && !emailSent && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
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
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Email gesendet!
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Prüfe dein Postfach bei <strong>{email}</strong>
                    <br />und klicke auf den Login-Link.
                  </p>
                  <p className="text-sm text-gray-500">
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
                    <label htmlFor="email" className="text-sm font-medium text-gray-700">
                      Email-Adresse
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
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
                    disabled={loading || !email}
                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 gap-2"
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

              <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                <p className="text-sm text-gray-500 mb-3">
                  Noch kein Konto?
                </p>
                <p className="text-sm text-gray-600">
                  Starte einfach auf{' '}
                  <a
                    href="https://wa.me/436601234567?text=Start"
                    className="text-emerald-600 hover:underline font-medium"
                  >
                    WhatsApp
                  </a>
                  {' '}– dein Konto wird automatisch erstellt.
                </p>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-gray-500 mt-6">
            Mit der Anmeldung akzeptierst du unsere{' '}
            <Link href="/terms" className="text-emerald-600 hover:underline">
              AGB
            </Link>{' '}
            und{' '}
            <Link href="/privacy" className="text-emerald-600 hover:underline">
              Datenschutzerklärung
            </Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
}

// Default export with Suspense boundary for useSearchParams
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
