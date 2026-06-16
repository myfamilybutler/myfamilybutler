'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchWithTimeout } from '@/lib/utils/fetch';
import { X, User, Users, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface OnboardingModalProps {
    isOpen: boolean;
    onComplete: () => void;
    onSkip: () => void;
}

export function OnboardingModal({ isOpen, onComplete, onSkip }: OnboardingModalProps) {
    const [step, setStep] = useState(1);
    const [displayName, setDisplayName] = useState('');
    const [familyMembers, setFamilyMembers] = useState<string[]>([]);
    const [newMember, setNewMember] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleAddMember = () => {
        if (newMember.trim() && !familyMembers.includes(newMember.trim())) {
            setFamilyMembers([...familyMembers, newMember.trim()]);
            setNewMember('');
        }
    };

    const handleRemoveMember = (name: string) => {
        setFamilyMembers(familyMembers.filter(m => m !== name));
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError('');

        try {
            const res = await fetchWithTimeout('/api/auth/complete-onboarding-modal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    displayName: displayName.trim() || undefined,
                    familyMembers: familyMembers.map(name => ({ name })),
                    // Email removed - user can add in Settings later
                }),
            });

            if (res.ok) {
                onComplete();
            } else {
                const data = await res.json();
                setError(data.error || 'Something went wrong');
            }
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = async () => {
        // Mark modal as shown even when skipping
        try {
            await fetchWithTimeout('/api/auth/complete-onboarding-modal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ skipped: true }),
            });
        } catch {
            // Ignore error on skip
        }
        onSkip();
    };

    return (
        <Dialog open={isOpen} onOpenChange={() => { }}>
            <DialogContent className="sm:max-w-md" showCloseButton={false}>
                <DialogHeader>
                    <DialogTitle className="text-center text-xl">
                        {step === 1 && '👋 Willkommen!'}
                        {step === 2 && '👨‍👩‍👧‍👦 Deine Familie'}
                    </DialogTitle>
                </DialogHeader>

                <AnimatePresence mode="wait">
                    {/* Step 1: Name */}
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4 py-4"
                        >
                            <p className="text-muted-foreground text-center">
                                Wie möchtest du genannt werden?
                            </p>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                <Input
                                    placeholder="Dein Name"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    className="pl-11 h-12"
                                />
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    variant="ghost"
                                    className="flex-1"
                                    onClick={() => setStep(2)}
                                >
                                    Überspringen
                                </Button>
                                <Button
                                    variant="brand"
                                    className="flex-1"
                                    onClick={() => setStep(2)}
                                >
                                    Weiter <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 2: Family Members */}
                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4 py-4"
                        >
                            <p className="text-muted-foreground text-center">
                                Wer gehört noch zur Familie? (optional)
                            </p>

                            {/* Member list */}
                            {familyMembers.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {familyMembers.map((name) => (
                                        <Badge
                                            key={name}
                                            variant="success"
                                            size="sm"
                                            className="inline-flex items-center gap-1"
                                        >
                                            {name}
                                            <button
                                                onClick={() => handleRemoveMember(name)}
                                                className="ml-1 hover:text-emerald-600 dark:hover:text-emerald-300"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            )}

                            {/* Add member input */}
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                    <Input
                                        placeholder="Name hinzufügen"
                                        value={newMember}
                                        onChange={(e) => setNewMember(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
                                        className="pl-11"
                                    />
                                </div>
                                <Button variant="outline" onClick={handleAddMember}>
                                    +
                                </Button>
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    variant="ghost"
                                    className="flex-1"
                                    onClick={handleSkip}
                                    disabled={loading}
                                >
                                    Überspringen
                                </Button>
                                <Button
                                    variant="brand"
                                    className="flex-1"
                                    onClick={handleSubmit}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            Fertig <CheckCircle className="w-4 h-4 ml-2" />
                                        </>
                                    )}
                                </Button>
                            </div>

                            {error && (
                                <p className="text-sm text-destructive text-center">{error}</p>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </DialogContent>
        </Dialog>
    );
}
