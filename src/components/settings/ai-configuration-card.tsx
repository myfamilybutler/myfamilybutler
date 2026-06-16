'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { 
  Key, 
  Sparkles, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle, 
  Loader2 
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { logError } from '@/lib/utils/logger';

interface AIConfigurationCardProps {
  isHouseholdAdmin: boolean;
  hasGeminiKey: boolean;
  onUpdate: () => Promise<void> | void;
}

export function AIConfigurationCard({
  isHouseholdAdmin,
  hasGeminiKey,
  onUpdate,
}: AIConfigurationCardProps) {
  const { t } = useTranslation();
  const [geminiKey, setGeminiKey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isHouseholdAdmin) return;

    setLoading(true);
    try {
      const res = await fetch('/api/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateGeminiKey',
          geminiApiKey: geminiKey,
        }),
      });

      if (res.ok) {
        toast.success(t('onboarding.geminiKeySuccess'));
        setGeminiKey('');
        await onUpdate();
      } else {
        const data = await res.json();
        toast.error(data.error || t('onboarding.geminiKeyError'));
      }
    } catch (error) {
      logError('Save AI key error:', error);
      toast.error(t('onboarding.networkError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            {t('settings.aiConfigTitle')}
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
            hasGeminiKey 
              ? 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-400' 
              : 'bg-muted text-muted-foreground'
          }`}>
            {hasGeminiKey ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                {t('settings.geminiKeyStatusConfigured')}
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                {t('settings.geminiKeyStatusNotConfigured')}
              </>
            )}
          </span>
        </CardTitle>
        <CardDescription>
          {t('settings.aiConfigDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="geminiApiKey" className="flex items-center gap-1">
              <Key className="w-4 h-4 text-muted-foreground" />
              {t('settings.geminiKey')}
            </Label>
            <Input
              id="geminiApiKey"
              type="password"
              placeholder={
                hasGeminiKey 
                  ? t('settings.geminiKeyPlaceholder') 
                  : t('settings.geminiKeyPlaceholderEmpty')
              }
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              disabled={!isHouseholdAdmin || loading}
              className="font-mono"
            />
            
            <div className="pt-1 flex items-start gap-2 text-xs text-muted-foreground">
              <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                {t('settings.geminiKeyHelp')}{' '}
                <a
                  href="https://aistudio.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  {t('settings.geminiKeyHelpLink')}
                </a>
              </span>
            </div>
          </div>

          {!isHouseholdAdmin && (
            <div className="p-3 bg-amber-500/10 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400 rounded-md text-xs flex items-center gap-2 border border-amber-500/20">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{t('settings.onlyAdminCanEditKey')}</span>
            </div>
          )}

          {isHouseholdAdmin && (
            <Button 
              type="submit" 
              disabled={loading || (!geminiKey.trim() && !hasGeminiKey)} 
              className="w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('settings.savingKey')}
                </>
              ) : (
                t('settings.saveKey')
              )}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
