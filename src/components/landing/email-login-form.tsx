'use client';

import { useState } from 'react';
import { Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function EmailLoginForm() {
    const [email, setEmail] = useState('');
    const [emailSent, setEmailSent] = useState(false);
    const [emailLoading, setEmailLoading] = useState(false);
    const [emailError, setEmailError] = useState('');

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setEmailLoading(true);
        setEmailError('');

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
                setEmailError(data.error || 'Failed to send login link');
            }
        } catch {
            setEmailError('Network error. Please try again.');
        } finally {
            setEmailLoading(false);
        }
    };

    if (emailSent) {
        return (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 max-w-md mx-auto dark:bg-emerald-500/10 dark:border-emerald-500/30">
                <p className="text-emerald-700 dark:text-emerald-300 font-medium">
                    ✓ Login-Link gesendet! Prüfe dein Email-Postfach.
                </p>
            </div>
        );
    }

    return (
        <>
            <form onSubmit={handleEmailLogin} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                        type="email"
                        placeholder="deine@email.com"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                        className="pl-11 h-12"
                        disabled={emailLoading}
                    />
                </div>
                <Button
                    type="submit"
                    className="h-12 px-6"
                    disabled={emailLoading || !email}
                >
                    {emailLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <>
                            <Mail className="w-4 h-4 mr-2" />
                            Login-Link senden
                        </>
                    )}
                </Button>
            </form>
            {emailError && (
                <p className="text-destructive text-sm mt-2 text-center">{emailError}</p>
            )}
        </>
    );
}
