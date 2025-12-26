'use client';

import { useState, useEffect } from 'react';
import {
  Mail,
  Phone,
  MessageCircle,
  Check,
  Plus,
  Pencil,
  Loader2,
  Shield,
  User,
  Save,
  X
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
  // Get email directly from Supabase Auth user (most reliable source)
  const { user } = useAuthStore();
  const email = user?.email || dbUser?.linked_email || null;
  const isEmailVerified = !!user?.email_confirmed_at;

  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState(dbUser?.display_name || '');
  const [isEditingName, setIsEditingName] = useState(false);
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
        body: JSON.stringify({ displayName }),
      });

      if (res.ok) {
        toast.success('Name updated successfully');
        setIsEditingName(false);
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

  const handleCancelEditName = () => {
    setDisplayName(dbUser?.display_name || '');
    setIsEditingName(false);
  };

  const handleResendVerification = async () => {
    if (!email) return;
    
    setResendingVerification(true);
    try {
      const res = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send');
      }

      toast.success('Verification email sent');
    } catch (error) {
      console.error('Resend verification error:', error);
      toast.error('Failed to send verification email');
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
          <div className="space-y-2">
            <Label htmlFor="displayName" className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              Display Name
            </Label>
            
            {isEditingName ? (
              <div className="flex gap-2">
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="flex-1"
                  autoFocus
                />
                <Button onClick={handleSaveDisplayName} disabled={saving} size="icon" className="shrink-0">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </Button>
                <Button onClick={handleCancelEditName} disabled={saving} variant="outline" size="icon" className="shrink-0">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-2 rounded-md border border-transparent hover:border-gray-200 hover:bg-slate-50 transition-colors group">
                <span className="font-medium text-gray-900 ml-1">{displayName || 'No name set'}</span>
                <Button 
                  onClick={() => setIsEditingName(true)} 
                  variant="ghost" 
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Login Methods</p>
          </div>

          {/* Email - from Supabase Auth */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Email</p>
                {email ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{email}</span>
                    {isEmailVerified ? (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                        <Check className="w-3 h-3 mr-1" /> Verified
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                        Not Verified
                      </Badge>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">Not set</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isEmailVerified && email && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleResendVerification}
                  disabled={resendingVerification}
                >
                  {resendingVerification ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Mail className="w-4 h-4 mr-2" />
                  )}
                  Resend
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNewEmail(email || '');
                  setEmailDialogOpen(true);
                }}
              >
                {email ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Phone Number */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <Phone className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Phone Number</p>
                {dbUser?.phone_number ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{maskPhone(dbUser.phone_number)}</span>
                    {dbUser?.whatsapp_verified ? (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                        <Check className="w-3 h-3 mr-1" /> WhatsApp
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                        Phone added
                      </Badge>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">Not set – Add for WhatsApp access</span>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setNewPhone(dbUser?.phone_number || '');
                setPhoneDialogOpen(true);
              }}
            >
              {dbUser?.phone_number ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>

          {/* Telegram */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Telegram</p>
                {dbUser?.telegram_chat_id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Connected</span>
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                      <Check className="w-3 h-3 mr-1" /> Telegram
                    </Badge>
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">Not connected – Message @FamilyButlerBot</span>
                )}
              </div>
            </div>
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
              Enter your phone number with country code (e.g., +43 660 1234567)
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
    </>
  );
}
