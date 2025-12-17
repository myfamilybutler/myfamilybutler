'use client';

import { useState } from 'react';
import { UserPlus } from 'lucide-react';
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
import { useAuthStore } from '@/stores/auth-store';

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  defaultTab?: 'invite' | 'add';
}

export function AddMemberDialog({ 
  open, 
  onOpenChange, 
  onSuccess,
  defaultTab = 'invite' 
}: AddMemberDialogProps) {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [invitePhone, setInvitePhone] = useState('');
  const [memberName, setMemberName] = useState('');

  const handleAction = async (type: 'invite' | 'add') => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const payload = type === 'invite' 
        ? { supabaseUserId: user.id, action: 'invite', phoneNumber: invitePhone }
        : { supabaseUserId: user.id, action: 'add', name: memberName };
        
      const res = await fetch('/api/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setInvitePhone('');
        setMemberName('');
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        toast.error(data.error || 'Failed to add member');
      }
    } catch (error) {
      console.error('Add member error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Family Member</DialogTitle>
          <DialogDescription>
            Invite a new user or add a family member who doesn&apos;t use the app.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invite">Invite via Phone</TabsTrigger>
            <TabsTrigger value="add">Add Family Member</TabsTrigger>
          </TabsList>
          
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
              {loading ? 'Sending...' : 'Send Invite'}
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
