import { useState, useEffect, useCallback } from 'react';
import { UserPlus } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
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
  const [loading, setLoading] = useState(false);
  const [invitePhone, setInvitePhone] = useState('');
  const [memberName, setMemberName] = useState('');
  const [qrToken, setQrToken] = useState<string | null>(null);

  const fetchQrToken = useCallback(async () => {
    if (qrToken) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/family/qr', { method: 'POST' });
      const data = await res.json();
      
      if (res.ok && data.token) {
        setQrToken(data.token);
      } else {
        toast.error('Failed to generate QR code');
      }
    } catch (error) {
      console.error('QR Fetch error:', error);
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  }, [qrToken]);

  useEffect(() => {
    if (!open) {
      setQrToken(null);
    } else {
      // Fetch token immediately if opening to default tab
      fetchQrToken();
    }
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
        if (type === 'invite') toast.success('Invite sent!');
        else if (type === 'inviteEmail') toast.success(data.message || 'Email invite sent!');
        else toast.success('Member added!');

        setInvitePhone('');
        setMemberName('');
        setEmail('');
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        toast.error(data.error || 'Failed to add member');
      }
    } catch (error) {
      console.error('Add member error:', error);
      toast.error('Failed to add member. Please try again.');
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
          <DialogTitle>Add Family Member</DialogTitle>
          <DialogDescription>
            Invite via WhatsApp, Email, scan QR code, or add a member manually.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="scan" className="w-full" onValueChange={(val) => {
          if (val === 'scan') fetchQrToken();
        }}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="scan">QR</TabsTrigger>
            <TabsTrigger value="add">Name</TabsTrigger>
            <TabsTrigger value="invite">WhatsApp</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
          </TabsList>
          
          <TabsContent value="scan" className="space-y-4 pt-4 flex flex-col items-center">
             {loading && !qrToken ? (
               <div className="h-48 flex items-center justify-center">Loading QR...</div>
             ) : qrToken ? (
               <>
                 <div className="p-4 bg-white rounded-lg border shadow-sm">
                   <QRCodeSVG value={getJoinLink()} size={180} />
                 </div>
                 <p className="text-center text-sm text-muted-foreground mt-2">
                   Ask family member to scan this code with their camera to join instantly.
                 </p>
                 <div className="w-full pt-2">
                   <Label className="text-xs">Or share this link:</Label>
                   <div className="flex gap-2 mt-1">
                     <Input readOnly value={getJoinLink()} className="h-8 text-xs font-mono" />
                     <Button 
                       size="sm" 
                       variant="outline"
                       className="h-8"
                       onClick={() => {
                         navigator.clipboard.writeText(getJoinLink());
                         toast.success('Link copied');
                       }}
                     >
                       Copy
                     </Button>
                   </div>
                 </div>
               </>
             ) : (
               <div className="text-red-500">Failed to load QR code</div>
             )}
          </TabsContent>

          <TabsContent value="invite" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Phone Number (WhatsApp)</Label>
              <Input 
                value={invitePhone}
                onChange={(e) => setInvitePhone(e.target.value)}
                placeholder="+43 660 1234567" 
              />
              <p className="text-xs text-gray-500">
                They will receive an invite when they message our WhatsApp bot.
              </p>
            </div>
            <Button 
              className="w-full" 
              onClick={() => handleAction('invite')}
              disabled={!invitePhone || loading}
            >
              {loading ? 'Sending...' : 'Send WhatsApp Invite'}
            </Button>
          </TabsContent>

          <TabsContent value="email" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="grandma@example.com" 
              />
              <p className="text-xs text-gray-500">
                We will send them a magic link to join the family.
              </p>
            </div>
            <Button 
              className="w-full" 
              onClick={() => handleAction('inviteEmail')}
              disabled={!email || loading}
            >
              {loading ? 'Sending...' : 'Send Email Invite'}
            </Button>
          </TabsContent>
          
          <TabsContent value="add" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input 
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                placeholder="e.g. Grandma, Kids" 
              />
              <p className="text-xs text-gray-500">
                For members who don&apos;t use the app but participate in tasks/events.
              </p>
            </div>
            <Button 
              className="w-full" 
              onClick={() => handleAction('add')}
              disabled={!memberName || loading}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {loading ? 'Adding...' : 'Add Member'}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
