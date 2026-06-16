'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function EmailLoginForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    const params = new URLSearchParams({ email });
    router.push(`/login?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
      <div className="relative flex-1">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type="email"
          placeholder={t('auth.login.emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="pl-11 h-12"
          disabled={loading}
          required
        />
      </div>
      <Button
        type="submit"
        className="h-12 px-6"
        disabled={loading || !email}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <Mail className="w-4 h-4 mr-2" />
            {t('auth.login.getStarted')}
          </>
        )}
      </Button>
    </form>
  );
}
