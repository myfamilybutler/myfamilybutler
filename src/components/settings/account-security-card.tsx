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
import { useAuthStore, type DbUser } from '@/stores/auth-store';

interface AccountSecurityCardProps {
  dbUser: DbUser | null;
  loading?: boolean;
  onUpdate?: () => void;
}

export function AccountSecurityCard({ dbUser, loading: propLoading, onUpdate }: AccountSecurityCardProps) {
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
        toast.success('Name updated successfully');
        setNameDialogOpen(false);
        setDisplayName(newName);
        onUpdate?.();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Failed to update name');
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update name');
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
        console.error('Resend verification failed:', res.status, data);
        throw new Error(data.error || 'Failed to send');
      }

      toast.success('Verification email sent. Please check your inbox.');
    } catch (error) {
      console.error('Resend verification error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send verification email');
    } finally {
      setResendingVerification(false);
    }
  };

  // Handle email update
  const handleSaveEmail = async () => {
    if (!newEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast.error('Please enter a valid email address');
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
        toast.success('Verification email sent. Please check your inbox.');
        setEmailDialogOpen(false);
        setNewEmail('');
        onUpdate?.();
      } else {
        const data = await res.json().catch(() => ({ error: `Request failed (${res.status})` }));
        console.error('Update email failed:', res.status, data);
        toast.error(data.error || `Failed to update email (${res.status})`);
      }
    } catch (error) {
      console.error('Update email error:', error);
      toast.error(error instanceof Error ? error.message : 'Network error - please try again');
    } finally {
      setSaving(false);
    }
  };

  // Handle phone number update
  const handleSavePhone = async () => {
    if (!newPhone.trim()) {
      toast.error('Please enter a phone number');
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
        toast.success('Phone number updated');
        setPhoneDialogOpen(false);
        setNewPhone('');
        onUpdate?.();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Failed to update phone number');
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update phone number');
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
            <Shield className="w-5 h-5 text-emerald-600" />
            Account & Security
          </CardTitle>
          <CardDescription>Manage your profile and login methods</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-slate-100 rounded" />
            <div className="h-16 bg-slate-100 rounded" />
            <div className="h-16 bg-slate-100 rounded" />
            <div className="h-16 bg-slate-100 rounded" />
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
            <Shield className="w-5 h-5 text-emerald-600" />
            Account & Security
          </CardTitle>
          <CardDescription>
            Manage your profile and login methods
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
              <div className="shrink-0 w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors">
                <User className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div className="min-w-0 overflow-hidden">
                <p className="font-medium text-foreground leading-tight">Display Name</p>
                <div className="flex items-center h-5 mt-0.5">
                  <span className="text-sm text-muted-foreground truncate">{displayName || 'No name set'}</span>
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
                <p className="font-medium text-foreground leading-tight">Email</p>
                {email ? (
                  <div className="flex items-center gap-2 h-5 mt-0.5">
                    <span className="text-sm text-muted-foreground truncate">{email}</span>
                    {isEmailVerified ? (
                      <Badge variant="success" className="shrink-0 py-0 h-4 flex items-center">
                        <Check className="w-3 h-3 mr-1" /> Verified
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="shrink-0 py-0 h-4 flex items-center">
                        Not Verified
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center h-5 mt-0.5">
                    <span className="text-sm text-gray-400">Not set</span>
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
                Resend
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
                <p className="font-medium text-foreground leading-tight">Phone Number</p>
                {dbUser?.phone_number ? (
                  <div className="flex items-center gap-2 h-5 mt-0.5">
                    <span className="text-sm text-muted-foreground truncate">{maskPhone(dbUser.phone_number)}</span>
                    {/* Phone is verified if whatsapp_verified, phone_verified, or has telegram */}
                    {dbUser?.whatsapp_verified ? (
                      <Badge variant="success" className="shrink-0 py-0 h-4 flex items-center">
                        <Check className="w-3 h-3 mr-1" /> WhatsApp
                      </Badge>
                    ) : dbUser?.phone_verified || dbUser?.telegram_chat_id ? (
                      <Badge variant="success" className="shrink-0 py-0 h-4 flex items-center">
                        <Check className="w-3 h-3 mr-1" /> Verified
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="shrink-0 py-0 h-4 flex items-center">
                        Pending
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center h-5 mt-0.5">
                    <span className="text-sm text-gray-400">Not set – Add for WhatsApp access</span>
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
                <p className="font-medium text-foreground leading-tight">Telegram</p>
                {dbUser?.telegram_chat_id ? (
                  <div className="flex items-center gap-2 h-5 mt-0.5">
                    <span className="text-sm text-muted-foreground">Connected</span>
                    <Badge variant="success" className="shrink-0 py-0 h-4 flex items-center">
                      <Check className="w-3 h-3 mr-1" /> Telegram
                    </Badge>
                  </div>
                ) : (
                  <div className="flex items-center h-5 mt-0.5">
                    <span className="text-sm text-muted-foreground/60 truncate">Not connected – Message @FamilyButlerBot</span>
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
              <Phone className="w-5 h-5 text-emerald-600" />
              {dbUser?.phone_number ? 'Change Phone Number' : 'Add Phone Number'}
            </DialogTitle>
            <DialogDescription>
              Enter your phone number with country code (e.g., +43 660 1234567).
              {!dbUser?.phone_verified && (
                <span className="block mt-1 text-amber-600 dark:text-amber-500">
                  Your phone will be verified when you send a WhatsApp or Telegram message from this number.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+43 660 1234567"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPhoneDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePhone} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              {email ? 'Change Email Address' : 'Add Email Address'}
            </DialogTitle>
            <DialogDescription>
              {email 
                ? 'Enter your new email address. A verification link will be sent to confirm the change.'
                : 'Enter your email address. A verification link will be sent to confirm.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEmail} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Send Verification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Display Name Dialog */}
      <Dialog open={nameDialogOpen} onOpenChange={setNameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-slate-600" />
              Change Display Name
            </DialogTitle>
            <DialogDescription>
              How should we call you? This name will be visible to your family members.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDisplayName} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
