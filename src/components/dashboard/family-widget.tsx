'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, UserPlus, Clock, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AddMemberDialog } from './add-member-dialog';

interface FamilyUser {
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
  const [members, setMembers] = useState<FamilyUser[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [defaultTab, setDefaultTab] = useState<'invite' | 'add'>('invite');
  
  // Fetch family data
  const fetchFamily = useCallback(async (signal?: AbortSignal) => {
    try {
      // API uses session cookies now, no need for supabaseUserId
      const res = await fetch('/api/family', { signal });
      const data = await res.json();
      
      if (data.success) {
        setMembers(data.data.users || []);
        setFamilyMembers(data.data.familyMembers || []);
        setPendingInvites(data.data.pendingInvites || []);
        setIsAdmin(data.data.isAdmin || false);
      }
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error('Error fetching family:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchFamily(controller.signal);
    
    return () => {
      controller.abort();
    };
  }, [fetchFamily]);
  
  const handleOpenDialog = (tab: 'invite' | 'add') => {
    setDefaultTab(tab);
    setDialogOpen(true);
  };
  
  if (loading) {
    return (
      <Card className="border-slate-200 shadow-sm">
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
      <Card className="border-slate-200 shadow-sm">
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
                onClick={() => handleOpenDialog('invite')}
              >
                <UserPlus className="w-4 h-4" />
                Invite
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 gap-1"
                onClick={() => handleOpenDialog('add')}
              >
                <Plus className="w-4 h-4" />
                Add
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
         <AddMemberDialog 
           open={dialogOpen} 
           onOpenChange={setDialogOpen}
           defaultTab={defaultTab}
           onSuccess={fetchFamily}
         />
    </>
  );
}
