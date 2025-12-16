'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Phone, ArrowRight, MessageCircle, Loader2, ArrowLeft } from 'lucide-react';
import { auth, RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth-store';

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier | undefined;
    confirmationResult: ConfirmationResult | undefined;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthStore();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recaptchaReady, setRecaptchaReady] = useState(false);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const recaptchaInitialized = useRef(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  // Setup reCAPTCHA verifier - use visible for debugging
  const setupRecaptcha = useCallback(() => {
    // Clear any existing verifier first
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch {
        // Ignore clear errors
      }
      window.recaptchaVerifier = undefined;
      setRecaptchaReady(false);
    }

    // Create a new container element to avoid stale element issues
    const container = recaptchaContainerRef.current;
    if (!container) return null;

    // Clear existing children
    container.innerHTML = '';
    
    // Create a fresh div for reCAPTCHA
    const recaptchaDiv = document.createElement('div');
    recaptchaDiv.id = 'recaptcha-widget';
    container.appendChild(recaptchaDiv);

    try {
      // Use device language for better compatibility
      auth.useDeviceLanguage();
      
      // Use 'normal' (visible) reCAPTCHA for debugging - change to 'invisible' later
      const verifier = new RecaptchaVerifier(auth, recaptchaDiv, {
        size: 'normal', // Changed from 'invisible' for debugging
        callback: () => {
          // reCAPTCHA solved - now we can send OTP
          console.log('reCAPTCHA verified successfully');
          setRecaptchaReady(true);
        },
        'expired-callback': () => {
          setError('reCAPTCHA expired. Please try again.');
          setRecaptchaReady(false);
          recaptchaInitialized.current = false;
        },
      });
      
      window.recaptchaVerifier = verifier;
      recaptchaInitialized.current = true;
      
      // Render the reCAPTCHA widget immediately
      verifier.render().then((widgetId) => {
        console.log('reCAPTCHA widget rendered with ID:', widgetId);
      });
      
      return verifier;
    } catch (err) {
      console.error('Error setting up reCAPTCHA:', err);
      return null;
    }
  }, []);

  // Setup reCAPTCHA on mount
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      setupRecaptcha();
    }, 500);

    return () => {
      clearTimeout(timer);
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch {
          // Ignore
        }
        window.recaptchaVerifier = undefined;
      }
    };
  }, [setupRecaptcha]);

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters except +
    return value.replace(/[^\d+]/g, '');
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneNumber(formatPhoneNumber(e.target.value));
    setError('');
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Check if reCAPTCHA is solved
      if (!recaptchaReady) {
        throw new Error('Please complete the reCAPTCHA verification first');
      }

      // Validate phone number
      let formattedPhone = phoneNumber;
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+43' + formattedPhone; // Default to Austria
      }

      if (formattedPhone.length < 10) {
        throw new Error('Please enter a valid phone number');
      }

      // Use the existing verified reCAPTCHA
      const verifier = window.recaptchaVerifier;
      if (!verifier) {
        throw new Error('reCAPTCHA not initialized. Please refresh the page.');
      }

      const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      window.confirmationResult = confirmationResult;
      
      // Store phone number and redirect to verify page
      sessionStorage.setItem('phoneNumber', formattedPhone);
      router.push('/login/verify');
    } catch (err) {
      console.error('Error sending OTP:', err);
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to send OTP. Please try again.';
      if (err instanceof Error) {
        if (err.message.includes('too-many-requests')) {
          errorMessage = 'Too many attempts. Please try again later.';
        } else if (err.message.includes('invalid-phone-number')) {
          errorMessage = 'Invalid phone number format.';
        } else if (err.message.includes('captcha-check-failed')) {
          errorMessage = 'reCAPTCHA verification failed. Please try again.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      recaptchaInitialized.current = false;
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
          Back to Home
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
                <MessageCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Welcome Back
              </CardTitle>
              <CardDescription className="text-gray-500">
                Enter your phone number to sign in
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="phone" className="text-sm font-medium text-gray-700">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+43 660 1234567"
                      value={phoneNumber}
                      onChange={handlePhoneChange}
                      className="pl-11 h-12"
                      disabled={loading}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    We&apos;ll send you a verification code via SMS
                  </p>
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
                  disabled={loading || !phoneNumber}
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Code
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>

              {/* reCAPTCHA container */}
              <div ref={recaptchaContainerRef} id="recaptcha-container" />
            </CardContent>
          </Card>

          <p className="text-center text-sm text-gray-500 mt-6">
            By continuing, you agree to our{' '}
            <Link href="/terms" className="text-emerald-600 hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-emerald-600 hover:underline">
              Privacy Policy
            </Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
}
