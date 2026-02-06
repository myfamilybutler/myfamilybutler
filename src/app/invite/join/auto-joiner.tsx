'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface AutoJoinerProps {
    token?: string;
    inviteId?: string;
    isLoggedIn?: boolean;
}

export function AutoJoiner({ token, inviteId, isLoggedIn }: AutoJoinerProps) {
    const router = useRouter();
    const [error, setError] = useState('');

    useEffect(() => {
        const controller = new AbortController();
        let cancelled = false;

        const attemptJoin = async () => {
            // Use token or fallback to inviteId if it acts as token
            const effectiveToken = token || inviteId;

            if (!effectiveToken) {
                router.push('/login?error=missing_token');
                return;
            }

            try {
                // Determine which API to call based on auth status
                const endpoint = isLoggedIn ? '/api/auth/invite-claim' : '/api/auth/invite-login';
                
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: effectiveToken }),
                    signal: controller.signal,
                });

                const data = await res.json();

                if (data.success) {
                    if (cancelled) return;
                    // Success! Redirect to dashboard
                    router.refresh(); 
                    router.push('/dashboard?joined=true');
                } else if (data.requiresAuth && !isLoggedIn) {
                    if (cancelled) return;
                    // Open Invite requires login -> Redirect to Login Page
                    // We send them to Login, and set returnUrl back to THIS page
                    // so after login, they come back here (as isLoggedIn=true) and we claim it.
                    const queryParam = token ? `token=${token}` : `id=${inviteId}`;
                    const returnUrl = encodeURIComponent(`/invite/join?${queryParam}`);
                    router.push(`/login?returnUrl=${returnUrl}&message=Please log in to accept the invitation`);
                } else {
                    if (cancelled) return;
                    // Generic failure
                    setError(data.error || 'Failed to join family');
                    // Optional: Redirect to login if not logged in
                    if (!isLoggedIn) {
                         const queryParam = token ? `token=${token}` : `id=${inviteId}`;
                         const returnUrl = encodeURIComponent(`/invite/join?${queryParam}`);
                         router.push(`/login?returnUrl=${returnUrl}`);
                    }
                }
            } catch (err) {
                if (cancelled) return;
                if (err instanceof Error && err.name === 'AbortError') {
                    return;
                }
                console.error(err);
                // Fallback on error
                const queryParam = token ? `token=${token}` : `id=${inviteId}`;
                const returnUrl = encodeURIComponent(`/invite/join?${queryParam}`);
                router.push(`/login?returnUrl=${returnUrl}`);
            }
        };

        attemptJoin();

        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [token, inviteId, router, isLoggedIn]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Joining Family...</h2>
            <p className="text-muted-foreground">Please wait while we set up your access.</p>
            {error && <p className="text-red-500 mt-4 text-sm">{error}</p>}
        </div>
    );
}
