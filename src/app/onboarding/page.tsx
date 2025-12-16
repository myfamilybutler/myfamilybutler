'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useWizardStore } from '@/stores/wizard-store';
import { useAuthStore } from '@/stores/auth-store';
import { StepHousehold } from '@/components/onboarding/step-household';
import { StepFamily } from '@/components/onboarding/step-family';
import { StepHandshake } from '@/components/onboarding/step-handshake';
import { ProtectedRoute } from '@/components/auth/protected-route';

const steps = [
  { id: 1, title: 'About You', component: StepHousehold },
  { id: 2, title: 'Your Family', component: StepFamily },
  { id: 3, title: 'Get Started', component: StepHandshake },
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
  }),
};

export default function OnboardingPage() {
  const { currentStep, nextStep, prevStep, formData } = useWizardStore();
  const { user, setOnboardingCompleted } = useAuthStore();
  const progress = (currentStep / steps.length) * 100;


  const CurrentStepComponent = steps[currentStep - 1].component;

  const canProceed = () => {
    if (currentStep === 1) {
      return formData.headOfHousehold.name && formData.headOfHousehold.role;
    }
    return true;
  };

  // Handle completion when reaching step 3
  useEffect(() => {
    const completeOnboarding = async () => {
      if (currentStep === 3 && user) {
        try {
          const response = await fetch('/api/auth/complete-onboarding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firebaseUid: user.uid }),
          });
          
          if (response.ok) {
            setOnboardingCompleted(true);
          }
        } catch (error) {
          console.error('Error completing onboarding:', error);
        }
      }
    };

    completeOnboarding();
  }, [currentStep, user, setOnboardingCompleted]);

  return (
    <ProtectedRoute requireOnboarding>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
          <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-gray-900">FamilyButler</span>
            </div>
            <span className="text-sm text-gray-500">
              Step {currentStep} of {steps.length}
            </span>
          </div>
        </header>

        {/* Progress bar */}
        <div className="fixed top-16 left-0 right-0 z-40">
          <Progress value={progress} className="h-1 rounded-none" />
        </div>

        {/* Step indicators */}
        <div className="pt-24 pb-6">
          <div className="max-w-2xl mx-auto px-6">
            <div className="flex items-center justify-center gap-3">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`
                      flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors
                      ${currentStep > step.id 
                        ? 'bg-emerald-600 text-white' 
                        : currentStep === step.id 
                          ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-600' 
                          : 'bg-slate-100 text-gray-400'
                      }
                    `}
                  >
                    {currentStep > step.id ? '✓' : step.id}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`
                        w-12 h-0.5 mx-2
                        ${currentStep > step.id ? 'bg-emerald-600' : 'bg-slate-200'}
                      `}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Step content */}
        <main className="max-w-2xl mx-auto px-6 pb-32">
          <AnimatePresence mode="wait" custom={currentStep}>
            <motion.div
              key={currentStep}
              custom={currentStep}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <CurrentStepComponent />
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Navigation buttons */}
        {currentStep < 3 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200">
            <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>
              <Button
                onClick={nextStep}
                disabled={!canProceed()}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
