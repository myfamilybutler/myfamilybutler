'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AutoJoinerProps {
    token?: string;
    inviteId?: string;
    isLoggedIn?: boolean;
}

interface InviteResolvePayload {
    success: boolean;
    invite: {
        inviteId: string;
        status: 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired';
        householdId: string;
        householdName: string;
        inviterName: string;
        channel: 'email' | 'phone' | 'open';
        isOpenInvite: boolean;
        expiresAt: string | null;
        target: {
            emailMasked: string | null;
            phoneMasked: string | null;
        };
    };
    auth: {
        isLoggedIn: boolean;
        canAutoLogin: boolean;
    };
    eligibility: {
        canRespond: boolean;
        isTargetMatch: boolean;
    };
}

export function AutoJoiner({ token, inviteId, isLoggedIn }: AutoJoinerProps) {
    const router = useRouter();
    const effectiveToken = token || inviteId;
    const returnUrl = useMemo(
        () => encodeURIComponent(`/invite/join?token=${effectiveToken ?? ''}`),
        [effectiveToken]
    );
    const loginUrl = `/login?returnUrl=${returnUrl}`;
    const registerUrl = `/register?returnUrl=${returnUrl}`;

    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<'accept' | 'decline' | 'autologin' | null>(null);
    const [resolveData, setResolveData] = useState<InviteResolvePayload | null>(null);
    const [error, setError] = useState('');
    const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);

    useEffect(() => {
        if (!effectiveToken) {
            setError('Missing invite token.');
            setLoading(false);
            return;
        }

        const loadInvite = async () => {
            setLoading(true);
            setError('');
            setResolveData(null);
            setShowSwitchConfirm(false);
            try {
                const res = await fetch(`/api/invite/resolve?token=${encodeURIComponent(effectiveToken)}`);
                const data = await res.json();

                if (!res.ok || !data.success) {
                    setError(data.error || 'Invalid or expired invite link.');
                    setLoading(false);
                    return;
                }

                setResolveData(data as InviteResolvePayload);

                // Email-targeted invite can auto-authenticate before explicit accept/decline.
                if (!isLoggedIn && data.auth?.canAutoLogin) {
                    setProcessing('autologin');
                    const loginRes = await fetch('/api/auth/invite-login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token: effectiveToken }),
                    });
                    const loginData = await loginRes.json();
                    if (loginRes.ok && loginData.success) {
                        window.location.href = `/invite/join?token=${encodeURIComponent(effectiveToken)}`;
                        return;
                    }
                    setError(loginData.error || 'Unable to sign in from this invite. Please log in manually.');
                }
            } catch (err) {
                console.error('Invite resolve error:', err);
                setError('Could not load invite details.');
            } finally {
                setLoading(false);
                setProcessing(null);
            }
        };

        void loadInvite();
    }, [effectiveToken, isLoggedIn]);

    const handleAccept = async (forceSwitch: boolean = false) => {
        if (!effectiveToken) return;
        setProcessing('accept');
        setError('');
        try {
            const res = await fetch('/api/auth/invite-claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: effectiveToken, forceSwitch }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                router.push('/dashboard?joined=true');
                return;
            }
            if (res.status === 409 && data.requiresConfirm) {
                setShowSwitchConfirm(true);
                return;
            }
            setError(data.error || 'Failed to accept invite.');
        } catch (err) {
            console.error('Invite accept error:', err);
            setError('Failed to accept invite.');
        } finally {
            setProcessing(null);
        }
    };

    const handleDecline = async () => {
        if (!effectiveToken) return;
        setProcessing('decline');
        setError('');
        try {
            const res = await fetch('/api/auth/invite-decline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: effectiveToken }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                router.push('/dashboard?invite=declined');
                return;
            }
            setError(data.error || 'Failed to decline invite.');
        } catch (err) {
            console.error('Invite decline error:', err);
            setError('Failed to decline invite.');
        } finally {
            setProcessing(null);
        }
    };

    const statusCopy: Record<string, string> = {
        accepted: 'This invite has already been accepted.',
        declined: 'This invite was declined.',
        revoked: 'This invite was revoked by the family admin.',
        expired: 'This invite has expired.',
        pending: '',
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mb-4" />
                <h2 className="text-xl font-semibold mb-2">Loading invite...</h2>
            </div>
        );
    }

    if (processing === 'autologin') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mb-4" />
                <h2 className="text-xl font-semibold mb-2">Signing you in...</h2>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle>Family Invite</CardTitle>
                    <CardDescription>
                        {resolveData?.invite
                            ? `${resolveData.invite.inviterName} invited you to join ${resolveData.invite.householdName}.`
                            : 'Review this invite before joining.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {resolveData?.invite && (
                        <div className="text-sm text-muted-foreground space-y-1">
                            <p><strong>Target:</strong> {resolveData.invite.target.emailMasked || resolveData.invite.target.phoneMasked || 'Open invite'}</p>
                            <p><strong>Status:</strong> {resolveData.invite.status}</p>
                        </div>
                    )}

                    {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}

                    {resolveData?.invite && resolveData.invite.status !== 'pending' && (
                        <p className="text-sm">{statusCopy[resolveData.invite.status] || 'Invite is no longer active.'}</p>
                    )}

                    {resolveData?.invite?.status === 'pending' && !isLoggedIn && (
                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">Please sign in to approve or decline this invite.</p>
                            <div className="flex gap-2">
                                <Button className="flex-1" onClick={() => router.push(loginUrl)}>
                                    Log in
                                </Button>
                                <Button className="flex-1" variant="outline" onClick={() => router.push(registerUrl)}>
                                    Register
                                </Button>
                            </div>
                        </div>
                    )}

                    {resolveData?.invite?.status === 'pending' && isLoggedIn && !resolveData.eligibility.canRespond && (
                        <p className="text-sm text-destructive">
                            This invite is linked to a different account.
                        </p>
                    )}

                    {resolveData?.invite?.status === 'pending' && isLoggedIn && resolveData.eligibility.canRespond && (
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <Button
                                    className="flex-1"
                                    onClick={() => handleAccept(false)}
                                    disabled={processing === 'accept' || processing === 'decline'}
                                >
                                    {processing === 'accept' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Approve & Join'}
                                </Button>
                                <Button
                                    className="flex-1"
                                    variant="outline"
                                    onClick={handleDecline}
                                    disabled={processing === 'accept' || processing === 'decline'}
                                >
                                    {processing === 'decline' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Decline'}
                                </Button>
                            </div>

                            {showSwitchConfirm && (
                                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
                                    <p className="mb-2 text-amber-900 dark:text-amber-200">
                                        You are already in another family. Joining this one will switch your membership.
                                    </p>
                                    <Button
                                        variant="destructive"
                                        onClick={() => handleAccept(true)}
                                        disabled={processing === 'accept'}
                                    >
                                        Confirm Switch & Join
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
