'use client';

import { useState, useEffect } from 'react';
import { Plus, UserPlus, Clock, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/auth-store';

interface HouseholdMember {
  id: string;
  display_name?: string;
  phone_number: string;
  is_admin: boolean;
}

interface FamilyMember {
  id: string;
  name: string;
}

interface PendingInvite {
  id: string;
  phone_number: string;
}

export function FamilyWidget() {
  const { user } = useAuthStore();
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [memberName, setMemberName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Fetch household data
  useEffect(() => {
    async function fetchHousehold() {
      if (!user?.uid) return;
      
      try {
        const res = await fetch(`/api/household?firebaseUid=${user.uid}`);
        const data = await res.json();
        
        if (data.success) {
          setMembers(data.data.users || []);
          setFamilyMembers(data.data.familyMembers || []);
          setPendingInvites(data.data.pendingInvites || []);
          setIsAdmin(data.data.isAdmin || false);
        }
      } catch (error) {
        console.error('Error fetching household:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchHousehold();
  }, [user?.uid]);
  
  // Invite WhatsApp user
  const handleInvite = async () => {
    if (!user?.uid || !phoneNumber.trim()) return;
    
    setSubmitting(true);
    try {
      const res = await fetch('/api/household', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebaseUid: user.uid,
          action: 'invite',
          phoneNumber: phoneNumber.trim()
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setPendingInvites(prev => [...prev, { id: Date.now().toString(), phone_number: phoneNumber.trim() }]);
        setPhoneNumber('');
        setInviteDialogOpen(false);
      } else {
        alert(data.error || 'Failed to invite');
      }
    } catch (error) {
      console.error('Invite error:', error);
    } finally {
      setSubmitting(false);
    }
  };
  
  // Add family member (non-WhatsApp)
  const handleAddMember = async () => {
    if (!user?.uid || !memberName.trim()) return;
    
    setSubmitting(true);
    try {
      const res = await fetch('/api/household', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebaseUid: user.uid,
          action: 'add',
          name: memberName.trim()
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setFamilyMembers(prev => [...prev, { id: Date.now().toString(), name: memberName.trim() }]);
        setMemberName('');
        setAddDialogOpen(false);
      } else {
        alert(data.error || 'Failed to add member');
      }
    } catch (error) {
      console.error('Add member error:', error);
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <Card className="h-full border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-gray-900">Family</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-10 bg-slate-100 rounded-xl"></div>
            <div className="h-10 bg-slate-100 rounded-xl"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="h-full border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Family
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* WhatsApp Members */}
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-emerald-700">
                  {(member.display_name || member.phone_number).charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-900 truncate block">
                  {member.display_name || member.phone_number}
                </span>
                {member.is_admin && (
                  <span className="text-xs text-emerald-600">Admin</span>
                )}
              </div>
            </div>
          ))}
          
          {/* Family Members (non-WhatsApp) */}
          {familyMembers.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-slate-600">
                  {member.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium text-gray-900 truncate">
                {member.name}
              </span>
            </div>
          ))}
          
          {/* Pending Invites */}
          {pendingInvites.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Pending invites
              </p>
              {pendingInvites.map((invite) => (
                <div key={invite.id} className="text-xs text-gray-400 pl-2">
                  {invite.phone_number}
                </div>
              ))}
            </div>
          )}
          
          {members.length === 0 && familyMembers.length === 0 && (
            <p className="text-sm text-gray-400 py-2">No family members yet</p>
          )}
          
          {/* Action buttons (admin only) */}
          {isAdmin && (
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1"
                onClick={() => setInviteDialogOpen(true)}
              >
                <UserPlus className="w-4 h-4" />
                Invite
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 gap-1"
                onClick={() => setAddDialogOpen(true)}
              >
                <Plus className="w-4 h-4" />
                Add
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Family Member</DialogTitle>
            <DialogDescription>
              Enter their phone number. They&apos;ll join when they message the FamilyButler WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="+43 660 1234567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
            <Button onClick={handleInvite} disabled={submitting} className="w-full">
              {submitting ? 'Inviting...' : 'Send Invite'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Add Member Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Family Member</DialogTitle>
            <DialogDescription>
              Add someone who doesn&apos;t have WhatsApp. They&apos;ll appear in your calendar for event tagging.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g. Max"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
              />
            </div>
            <Button onClick={handleAddMember} disabled={submitting} className="w-full">
              {submitting ? 'Adding...' : 'Add Member'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
