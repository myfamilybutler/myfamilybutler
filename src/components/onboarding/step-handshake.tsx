'use client';

import Link from 'next/link';
import { PartyPopper, MessageCircle, ArrowRight, QrCode } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useWizardStore } from '@/stores/wizard-store';

export function StepHandshake() {
  const { formData } = useWizardStore();
  const { headOfHousehold, familyMembers } = formData;

  // WhatsApp deep link - would be configured in real app
  const WHATSAPP_NUMBER = '436601234567';
  const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=Hi! I'm ${headOfHousehold.name} and I just set up my FamilyButler!`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200"
        >
          <PartyPopper className="w-10 h-10 text-white" />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-bold text-gray-900"
        >
          You&apos;re All Set! 🎉
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-gray-500 max-w-md mx-auto"
        >
          Welcome to FamilyButler, {headOfHousehold.name}! Connect with WhatsApp to start managing your family&apos;s schedule.
        </motion.p>
      </div>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="max-w-sm mx-auto"
      >
        <Card className="p-4 border-slate-200 bg-slate-50/50">
          <p className="text-sm text-gray-600 text-center">
            <span className="font-semibold text-gray-900">Your household:</span>
            <br />
            {headOfHousehold.name} ({headOfHousehold.role})
            {familyMembers.length > 0 && (
              <>
                <br />
                + {familyMembers.length} family member{familyMembers.length > 1 ? 's' : ''}
              </>
            )}
          </p>
        </Card>
      </motion.div>

      {/* QR Code placeholder */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6 }}
        className="max-w-xs mx-auto"
      >
        <Card className="p-6 border-slate-200 text-center">
          <div className="w-48 h-48 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-slate-300">
            <QrCode className="w-24 h-24 text-slate-300" />
          </div>
          <p className="text-sm text-gray-500">
            Scan this QR code with your phone to connect on WhatsApp
          </p>
        </Card>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="flex flex-col items-center gap-3 max-w-xs mx-auto"
      >
        <a
          href={WHATSAPP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full"
        >
          <Button className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
            <MessageCircle className="w-5 h-5" />
            Start WhatsApp Bot
          </Button>
        </a>
        <Link href="/dashboard" className="w-full">
          <Button variant="outline" className="w-full h-12 gap-2">
            Go to Dashboard
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
