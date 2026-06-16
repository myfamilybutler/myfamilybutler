import { useState, useEffect, useCallback, useRef } from 'react';
import { UserPlus } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { logError } from '@/lib/utils/logger';
import { useFamilyActions } from '@/stores/family-store';

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddMemberDialog({ 
  open, 
  onOpenChange, 
  onSuccess
}: AddMemberDialogProps) {
  const { t } = useTranslation();
  const { invalidate: invalidateFamily } = useFamilyActions();
  const [loading, setLoading] = useState(false);
  const [invitePhone, setInvitePhone] = useState('');
  const [memberName, setMemberName] = useState('');
  const [qrToken, setQrToken] = useState<string | null>(null);
  const qrPromiseRef = useRef<Promise<void> | null>(null);

  const fetchQrToken = useCallback(async () => {
    if (qrToken) return;
    if (qrPromiseRef.current) return qrPromiseRef.current;

    qrPromiseRef.current = (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/family/qr', { method: 'POST' });
        const data = await res.json();

        if (res.ok && data.token) {
          setQrToken(data.token);
        } else {
          toast.error(t('settings.addMemberDialog.toast.qrFailed'));
        }
      } catch (error) {
        logError('QR Fetch error:', error);
        toast.error(t('common.networkError'));
      } finally {
        setLoading(false);
      }
    })();

    try {
      await qrPromiseRef.current;
    } finally {
      qrPromiseRef.current = null;
    }
  }, [qrToken, t]);

  useEffect(() => {
    if (!open) {
      setQrToken(null);
      qrPromiseRef.current = null;
      return;
    }

    void fetchQrToken();
  }, [open, fetchQrToken]);

  const [email, setEmail] = useState('');

  const handleAction = async (type: 'invite' | 'inviteEmail' | 'add') => {
    setLoading(true);
    try {
        const payload: { action: string; phoneNumber?: string; email?: string; name?: string } = { action: type };
        
        if (type === 'invite') {
            payload.phoneNumber = invitePhone;
        } else if (type === 'inviteEmail') {
            payload.email = email;
        } else {
            payload.name = memberName;
        }
        
      const res = await fetch('/api/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        if (type === 'invite') toast.success(data.message || t('settings.addMemberDialog.toast.inviteCreated'));
        else if (type === 'inviteEmail') toast.success(data.message || t('settings.addMemberDialog.toast.emailInviteSent'));
        else toast.success(t('settings.addMemberDialog.toast.memberAdded'));

        setInvitePhone('');
        setMemberName('');
        setEmail('');
        onOpenChange(false);
        invalidateFamily();
        if (onSuccess) onSuccess();
      } else {
        toast.error(data.error || t('settings.addMemberDialog.toast.addFailed'));
      }
    } catch (error) {
      logError('Add member error:', error);
      toast.error(t('settings.addMemberDialog.toast.addRetry'));
    } finally {
      setLoading(false);
    }
  };

  const getJoinLink = () => {
    if (!qrToken) return '';
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/invite/join?token=${qrToken}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('settings.addMemberDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('settings.addMemberDialog.description')}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="scan" className="w-full" onValueChange={(val) => {
          if (val === 'scan') fetchQrToken();
        }}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="scan">{t('settings.addMemberDialog.tabs.qr')}</TabsTrigger>
            <TabsTrigger value="add">{t('settings.addMemberDialog.tabs.name')}</TabsTrigger>
            <TabsTrigger value="invite">{t('settings.addMemberDialog.tabs.phone')}</TabsTrigger>
            <TabsTrigger value="email">{t('settings.addMemberDialog.tabs.email')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="scan" className="space-y-4 pt-4 flex flex-col items-center">
             {loading && !qrToken ? (
               <div className="h-48 flex items-center justify-center">{t('settings.addMemberDialog.loadingQr')}</div>
             ) : qrToken ? (
               <>
                 <div className="p-4 bg-card rounded-lg border shadow-sm">
                   <QRCodeSVG value={getJoinLink()} size={180} />
                 </div>
                 <p className="text-center text-sm text-muted-foreground mt-2">
                   {t('settings.addMemberDialog.scanHelp')}
                 </p>
                 <div className="w-full pt-2">
                   <Label className="text-xs">{t('settings.addMemberDialog.shareLink')}</Label>
                   <div className="flex gap-2 mt-1">
                     <Input readOnly value={getJoinLink()} className="h-8 text-xs font-mono" />
                     <Button 
                       size="sm" 
                       variant="outline"
                       className="h-8"
                       onClick={() => {
                         navigator.clipboard.writeText(getJoinLink());
                         toast.success(t('settings.addMemberDialog.toast.linkCopied'));
                       }}
                     >
                       {t('settings.addMemberDialog.copy')}
                     </Button>
                   </div>
                 </div>
               </>
             ) : (
               <div className="text-destructive">{t('settings.addMemberDialog.qrLoadFailed')}</div>
             )}
          </TabsContent>

          <TabsContent value="invite" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>{t('settings.addMemberDialog.phoneLabel')}</Label>
              <Input 
                value={invitePhone}
                onChange={(e) => setInvitePhone(e.target.value)}
                placeholder={t('settings.addMemberDialog.phonePlaceholder')}
              />
              <p className="text-xs text-muted-foreground">
                {t('settings.addMemberDialog.phoneHelp')}
              </p>
            </div>
            <Button 
              className="w-full" 
              onClick={() => handleAction('invite')}
              disabled={!invitePhone || loading}
            >
              {loading ? t('common.sending') : t('settings.addMemberDialog.sendPhoneInvite')}
            </Button>
          </TabsContent>

          <TabsContent value="email" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>{t('settings.addMemberDialog.emailLabel')}</Label>
              <Input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('settings.addMemberDialog.emailPlaceholder')}
              />
              <p className="text-xs text-muted-foreground">
                {t('settings.addMemberDialog.emailHelp')}
              </p>
            </div>
            <Button 
              className="w-full" 
              onClick={() => handleAction('inviteEmail')}
              disabled={!email || loading}
            >
              {loading ? t('common.sending') : t('settings.addMemberDialog.sendEmailInvite')}
            </Button>
          </TabsContent>
          
          <TabsContent value="add" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>{t('settings.addMemberDialog.nameLabel')}</Label>
              <Input 
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                placeholder={t('settings.addMemberDialog.namePlaceholder')}
              />
              <p className="text-xs text-muted-foreground">
                {t('settings.addMemberDialog.nameHelp')}
              </p>
            </div>
            <Button 
              className="w-full" 
              onClick={() => handleAction('add')}
              disabled={!memberName || loading}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {loading ? t('common.adding') : t('settings.addMemberDialog.addMember')}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
