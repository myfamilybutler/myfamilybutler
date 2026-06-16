'use client';

import { useState, useEffect } from 'react';
import {
  Mail,
  Phone,
  MessageCircle,
  Check,
  Loader2,
  Shield,
  User
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { useAuthStore, type DbUser } from '@/stores/auth-store';
import { logError } from '@/lib/utils/logger';

interface AccountSecurityCardProps {
  dbUser: DbUser | null;
  loading?: boolean;
  onUpdate?: () => void;
}

export function AccountSecurityCard({ dbUser, loading: propLoading, onUpdate }: AccountSecurityCardProps) {
  const { t } = useTranslation();
  // Get email from dbUser (linked_email) as primary source, fallback to auth user
  const { user } = useAuthStore();
  const email = dbUser?.linked_email || user?.email || null;
  // Check custom email_verified field (set by our verify-email endpoint)
  const isEmailVerified = !!dbUser?.email_verified;

  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState(dbUser?.display_name || '');
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [resendingVerification, setResendingVerification] = useState(false);

  // Sync displayName with dbUser prop changes
  useEffect(() => {
    setDisplayName(dbUser?.display_name || '');
  }, [dbUser?.display_name]);

  // Dialog states
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  // Handle display name update
  const handleSaveDisplayName = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: newName }),
      });

      if (res.ok) {
        toast.success(t('settings.accountSecurity.toast.nameUpdated'));
        setNameDialogOpen(false);
        setDisplayName(newName);
        onUpdate?.();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || t('settings.accountSecurity.toast.nameUpdateFailed'));
      }
    } catch (error) {
      logError('Update error:', error);
      toast.error(t('settings.accountSecurity.toast.nameUpdateFailed'));
    } finally {
      setSaving(false);
    }
  };


  const handleResendVerification = async () => {
    if (!email) return;
    
    setResendingVerification(true);
    try {
      const res = await fetch('/api/account/update-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({ error: `Request failed (${res.status})` }));

      if (!res.ok) {
        logError('Resend verification failed:', res.status, data);
        throw new Error(data.error || t('settings.accountSecurity.toast.verificationSendFailed'));
      }

      toast.success(t('settings.accountSecurity.toast.verificationSent'));
    } catch (error) {
      logError('Resend verification error:', error);
      toast.error(error instanceof Error ? error.message : t('settings.accountSecurity.toast.verificationSendFailed'));
    } finally {
      setResendingVerification(false);
    }
  };

  // Handle email update
  const handleSaveEmail = async () => {
    if (!newEmail.trim()) {
      toast.error(t('settings.accountSecurity.toast.emailRequired'));
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast.error(t('settings.accountSecurity.toast.emailInvalid'));
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/account/update-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail }),
      });

      if (res.ok) {
        toast.success(t('settings.accountSecurity.toast.verificationSent'));
        setEmailDialogOpen(false);
        setNewEmail('');
        onUpdate?.();
      } else {
        const data = await res.json().catch(() => ({ error: `Request failed (${res.status})` }));
        logError('Update email failed:', res.status, data);
        toast.error(data.error || t('settings.accountSecurity.toast.emailUpdateFailed'));
      }
    } catch (error) {
      logError('Update email error:', error);
      toast.error(error instanceof Error ? error.message : t('settings.accountSecurity.toast.networkRetry'));
    } finally {
      setSaving(false);
    }
  };

  // Handle phone number update
  const handleSavePhone = async () => {
    if (!newPhone.trim()) {
      toast.error(t('settings.accountSecurity.toast.phoneRequired'));
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: newPhone }),
      });

      if (res.ok) {
        toast.success(t('settings.accountSecurity.toast.phoneUpdated'));
        setPhoneDialogOpen(false);
        setNewPhone('');
        onUpdate?.();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || t('settings.accountSecurity.toast.phoneUpdateFailed'));
      }
    } catch (error) {
      logError('Update error:', error);
      toast.error(t('settings.accountSecurity.toast.phoneUpdateFailed'));
    } finally {
      setSaving(false);
    }
  };

  // Mask phone for display
  const maskPhone = (phone: string) => {
    if (phone.length < 8) return phone;
    return phone.slice(0, -4) + ' ****';
  };

  // Show loading skeleton
  if (propLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            {t('settings.accountSecurity.title')}
          </CardTitle>
          <CardDescription>{t('settings.accountSecurity.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded" />
            <div className="h-16 bg-muted rounded" />
            <div className="h-16 bg-muted rounded" />
            <div className="h-16 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            {t('settings.accountSecurity.title')}
          </CardTitle>
          <CardDescription>
            {t('settings.accountSecurity.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Display Name */}
          <div 
            onClick={() => {
              setNewName(displayName);
              setNameDialogOpen(true);
            }}
            className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-muted/50 rounded-lg gap-4 hover:bg-muted transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0 w-10 h-10 bg-muted rounded-full flex items-center justify-center group-hover:bg-muted/80 transition-colors">
                <User className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="min-w-0 overflow-hidden">
                <p className="font-medium text-foreground leading-tight">{t('settings.accountSecurity.fields.displayName')}</p>
                <div className="flex items-center h-5 mt-0.5">
                  <span className="text-sm text-muted-foreground truncate">{displayName || t('settings.accountSecurity.noName')}</span>
                </div>
              </div>
            </div>
            <div className="hidden sm:block w-px h-8" />
          </div>

          {/* Divider removed for uniform flow */}

          {/* Email - from Supabase Auth */}
          <div 
            onClick={() => {
              setNewEmail(email || '');
              setEmailDialogOpen(true);
            }}
            className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-muted/50 rounded-lg gap-4 hover:bg-muted transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-950 rounded-full flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900 transition-colors">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0 overflow-hidden">
                <p className="font-medium text-foreground leading-tight">{t('settings.accountSecurity.fields.email')}</p>
                {email ? (
                  <div className="flex items-center gap-2 h-5 mt-0.5">
                    <span className="text-sm text-muted-foreground truncate">{email}</span>
                    {isEmailVerified ? (
                      <Badge variant="success" size="xs" className="shrink-0">
                        <Check className="w-3 h-3 mr-1" /> {t('settings.accountSecurity.verified')}
                      </Badge>
                    ) : (
                      <Badge variant="warning" size="xs" className="shrink-0">
                        {t('settings.accountSecurity.notVerified')}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center h-5 mt-0.5">
                    <span className="text-sm text-muted-foreground/70">{t('settings.accountSecurity.notSet')}</span>
                  </div>
                )}
              </div>
            </div>
            {!isEmailVerified && email ? (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 py-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleResendVerification();
                }}
                disabled={resendingVerification}
              >
                {resendingVerification ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                {t('settings.accountSecurity.resend')}
              </Button>
            ) : (
              <div className="hidden sm:block w-px h-8" />
            )}
          </div>

          {/* Phone Number */}
          <div 
            onClick={() => {
              setNewPhone(dbUser?.phone_number || '');
              setPhoneDialogOpen(true);
            }}
            className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-muted/50 rounded-lg gap-4 hover:bg-muted transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0 w-10 h-10 bg-emerald-100 dark:bg-emerald-950 rounded-full flex items-center justify-center group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900 transition-colors">
                <Phone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0 overflow-hidden">
                <p className="font-medium text-foreground leading-tight">{t('settings.accountSecurity.fields.phone')}</p>
                {dbUser?.phone_number ? (
                  <div className="flex items-center gap-2 h-5 mt-0.5">
                    <span className="text-sm text-muted-foreground truncate">{maskPhone(dbUser.phone_number)}</span>
                    {/* Phone is verified if whatsapp_verified, phone_verified, or has telegram */}
                    {dbUser?.whatsapp_verified ? (
                      <Badge variant="success" size="xs" className="shrink-0">
                        <Check className="w-3 h-3 mr-1" /> {t('settings.accountSecurity.whatsApp')}
                      </Badge>
                    ) : dbUser?.phone_verified || dbUser?.telegram_chat_id ? (
                      <Badge variant="success" size="xs" className="shrink-0">
                        <Check className="w-3 h-3 mr-1" /> {t('settings.accountSecurity.verified')}
                      </Badge>
                    ) : (
                      <Badge variant="warning" size="xs" className="shrink-0">
                        {t('settings.accountSecurity.pending')}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center h-5 mt-0.5">
                    <span className="text-sm text-muted-foreground/70">{t('settings.accountSecurity.phoneNotSet')}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="hidden sm:block w-px h-8" />
          </div>

          {/* Telegram */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-muted/50 rounded-lg gap-4 hover:bg-muted transition-colors group">
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-950 rounded-full flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900 transition-colors">
                <MessageCircle className="w-5 h-5 text-blue-500 dark:text-blue-400" />
              </div>
              <div className="min-w-0 overflow-hidden">
                <p className="font-medium text-foreground leading-tight">{t('settings.accountSecurity.fields.telegram')}</p>
                {dbUser?.telegram_chat_id ? (
                  <div className="flex items-center gap-2 h-5 mt-0.5">
                    <span className="text-sm text-muted-foreground">{t('settings.accountSecurity.connected')}</span>
                    <Badge variant="success" size="xs" className="shrink-0">
                      <Check className="w-3 h-3 mr-1" /> {t('settings.accountSecurity.fields.telegram')}
                    </Badge>
                  </div>
                ) : (
                  <div className="flex items-center h-5 mt-0.5">
                    <span className="text-sm text-muted-foreground/60 truncate">{t('settings.accountSecurity.telegramHint')}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="hidden sm:block w-px h-8" />
          </div>
        </CardContent>
      </Card>

      {/* Change Phone Dialog */}
      <Dialog open={phoneDialogOpen} onOpenChange={setPhoneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              {dbUser?.phone_number ? t('settings.accountSecurity.dialog.changePhone') : t('settings.accountSecurity.dialog.addPhone')}
            </DialogTitle>
            <DialogDescription>
              {t('settings.accountSecurity.dialog.phoneDescription')}
              {!dbUser?.phone_verified && (
                <span className="block mt-1 text-amber-600 dark:text-amber-500">
                  {t('settings.accountSecurity.dialog.phoneVerifyHint')}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="phone">{t('settings.accountSecurity.fields.phone')}</Label>
              <Input
                id="phone"
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder={t('settings.accountSecurity.dialog.phonePlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPhoneDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSavePhone} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              {email ? t('settings.accountSecurity.dialog.changeEmail') : t('settings.accountSecurity.dialog.addEmail')}
            </DialogTitle>
            <DialogDescription>
              {email 
                ? t('settings.accountSecurity.dialog.emailChangeDescription')
                : t('settings.accountSecurity.dialog.emailAddDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('settings.accountSecurity.dialog.emailLabel')}</Label>
              <Input
                id="email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder={t('settings.accountSecurity.dialog.emailPlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveEmail} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t('settings.accountSecurity.dialog.sendVerification')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Display Name Dialog */}
      <Dialog open={nameDialogOpen} onOpenChange={setNameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-muted-foreground" />
              {t('settings.accountSecurity.dialog.changeDisplayName')}
            </DialogTitle>
            <DialogDescription>
              {t('settings.accountSecurity.dialog.displayNameDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('settings.accountSecurity.fields.displayName')}</Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t('settings.accountSecurity.dialog.displayNamePlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNameDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveDisplayName} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
