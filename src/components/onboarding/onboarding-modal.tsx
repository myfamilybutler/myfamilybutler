'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Users, Mail, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    const [email, setEmail] = useState('');
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
            const res = await fetch('/api/auth/complete-onboarding-modal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    displayName: displayName.trim() || undefined,
                    familyMembers: familyMembers.map(name => ({ name })),
                    linkedEmail: email.trim() || undefined,
                }),
            });

            if (res.ok) {
                onComplete();
            } else {
                const data = await res.json();
                setError(data.error || 'Something went wrong');
            }
        } catch (_err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = async () => {
        // Mark modal as shown even when skipping
        try {
            await fetch('/api/auth/complete-onboarding-modal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ skipped: true }),
            });
        } catch (_err) {
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
                        {step === 3 && '📧 Email für Desktop'}
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
                            <p className="text-gray-600 text-center">
                                Wie möchtest du genannt werden?
                            </p>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
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
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
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
                            <p className="text-gray-600 text-center">
                                Wer gehört noch zur Familie? (optional)
                            </p>

                            {/* Member list */}
                            {familyMembers.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {familyMembers.map((name) => (
                                        <span
                                            key={name}
                                            className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm"
                                        >
                                            {name}
                                            <button
                                                onClick={() => handleRemoveMember(name)}
                                                className="ml-1 hover:text-emerald-600"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Add member input */}
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
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
                                    onClick={() => setStep(3)}
                                >
                                    Überspringen
                                </Button>
                                <Button
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                                    onClick={() => setStep(3)}
                                >
                                    Weiter <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 3: Email */}
                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4 py-4"
                        >
                            <p className="text-gray-600 text-center">
                                Füge deine Email hinzu, um dich auf anderen Geräten anzumelden.
                            </p>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <Input
                                    type="email"
                                    placeholder="deine@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-11 h-12"
                                />
                            </div>
                            <p className="text-xs text-gray-500 text-center">
                                Optional – du kannst das auch später in den Einstellungen machen.
                            </p>

                            {error && (
                                <p className="text-sm text-red-500 text-center">{error}</p>
                            )}

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
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
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
                        </motion.div>
                    )}
                </AnimatePresence>
            </DialogContent>
        </Dialog>
    );
}
