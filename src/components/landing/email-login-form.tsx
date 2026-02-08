'use client';

import { useState } from 'react';
import { Mail, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { requestEmailLoginLink } from '@/lib/auth/email-login';

export function EmailLoginForm() {
    const { t } = useTranslation();
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
            const data = await requestEmailLoginLink(email);
            if (data.success) {
                setEmailSent(true);
            } else {
                const message = data.status === 429
                    ? t('auth.login.rateLimited')
                    : t('auth.login.sendLinkFailed');
                setEmailError(message);
            }
        } catch {
            setEmailError(t('auth.login.networkErrorRetry'));
        } finally {
            setEmailLoading(false);
        }
    };

    if (emailSent) {
        return (
            <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 max-w-md mx-auto">
                <p className="text-primary font-medium">
                    {`✓ ${t('auth.login.emailSentBanner')}`}
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
                        placeholder={t('auth.login.emailPlaceholder')}
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
                            {t('auth.login.sendLink')}
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
