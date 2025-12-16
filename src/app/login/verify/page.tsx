'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Shield, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ConfirmationResult } from '@/lib/firebase';

declare global {
  interface Window {
    confirmationResult: ConfirmationResult | undefined;
  }
}

export default function VerifyPage() {
  const router = useRouter();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Get phone number from session storage
    const stored = sessionStorage.getItem('phoneNumber');
    if (stored) {
      setPhoneNumber(stored);
    }

    // Check if we have a confirmation result
    if (!window.confirmationResult) {
      router.replace('/login');
    }
  }, [router]);

  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);
    
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (paste.length === 6) {
      setOtp(paste.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    
    if (code.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const confirmationResult = window.confirmationResult;
      if (!confirmationResult) {
        throw new Error('Session expired. Please try again.');
      }

      await confirmationResult.confirm(code);
      setSuccess(true);

      // Clear session storage
      sessionStorage.removeItem('phoneNumber');
      window.confirmationResult = undefined;

      // Small delay to show success state, then redirect
      setTimeout(() => {
        router.replace('/onboarding');
      }, 1000);
    } catch (err) {
      console.error('Error verifying OTP:', err);
      setError('Invalid code. Please try again.');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = () => {
    // Clear current session and go back to login
    window.confirmationResult = undefined;
    router.replace('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* Header */}
      <header className="p-6">
        <Link href="/login" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Change Number
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
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors ${
                success ? 'bg-emerald-500' : 'bg-blue-100'
              }`}>
                {success ? (
                  <CheckCircle className="w-8 h-8 text-white" />
                ) : (
                  <Shield className="w-8 h-8 text-blue-600" />
                )}
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                {success ? 'Verified!' : 'Enter Code'}
              </CardTitle>
              <CardDescription className="text-gray-500">
                {success 
                  ? 'Redirecting you to the app...' 
                  : `We sent a code to ${phoneNumber}`
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {!success && (
                <form onSubmit={handleVerify} className="space-y-6">
                  {/* OTP Input */}
                  <div className="flex justify-center gap-2">
                    {otp.map((digit, index) => (
                      <Input
                        key={index}
                        ref={(el) => { inputRefs.current[index] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        onPaste={handlePaste}
                        disabled={loading}
                        className="w-12 h-14 text-center text-xl font-semibold"
                      />
                    ))}
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
                    disabled={loading || otp.join('').length !== 6}
                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify'
                    )}
                  </Button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleResendCode}
                      className="text-sm text-emerald-600 hover:underline"
                    >
                      Didn&apos;t receive the code? Try again
                    </button>
                  </div>
                </form>
              )}

              {success && (
                <div className="flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
