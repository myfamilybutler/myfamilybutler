'use client';


import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  User, 
  Users, 
  Trash2, 
  LogOut, 
  Download, 
  AlertTriangle,
  Crown,
  UserMinus,
  Plus,
  Save,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { AddMemberDialog } from '@/components/dashboard/add-member-dialog';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuthStore } from '@/stores/auth-store';

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

export default function SettingsPage() {
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const [members, setMembers] = useState<FamilyUser[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [deleteAccountDialog, setDeleteAccountDialog] = useState(false);
  const [deleteFamilyDialog, setDeleteFamilyDialog] = useState(false);
  const [leaveFamilyDialog, setLeaveFamilyDialog] = useState(false);
  const [addMemberDialog, setAddMemberDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  
  // Add Member states
  // const [invitePhone, setInvitePhone] = useState('');
  // const [memberName, setMemberName] = useState('');
  
  // Fetch data - extracted to useCallback so mutations can refetch
  const fetchData = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const res = await fetch(`/api/family?firebaseUid=${user.uid}`);
      const data = await res.json();
      
      if (data.success) {
        setMembers(data.data.users || []);
        setFamilyMembers(data.data.familyMembers || []);
        setIsAdmin(data.data.isAdmin || false);
        
        // Find current user's display name
        const currentUser = data.data.users?.find(
          (u: FamilyUser) => u.phone_number === user.phoneNumber
        );
        if (currentUser?.display_name) {
          setDisplayName(currentUser.display_name);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, user?.phoneNumber]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Handle logout
  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };
  
  // Handle profile update
  const handleUpdateProfile = async () => {
    if (!user?.uid) return;
    
    setActionLoading(true);
    try {
      const res = await fetch('/api/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebaseUid: user.uid, displayName })
      });
      
      if (res.ok) {
        toast.success('Profile updated successfully');
        fetchData(); // Refetch to update UI
      } else {
        toast.error('Failed to update profile');
      }
    } catch (error) {
      console.error('Update error:', error);
    } finally {
      setActionLoading(false);
    }
  };
  
  // Handle add/invite member logic moved to AddMemberDialog
  
  // Handle data export (GDPR: Right to portability)
  const handleExportData = async () => {
    if (!user?.uid) return;
    
    try {
      const res = await fetch(`/api/account/export?firebaseUid=${user.uid}`);
      const data = await res.json();
      
      // Download as JSON
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'familybutler-data.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  };
  
  // Handle account deletion (GDPR: Right to erasure)
  const handleDeleteAccount = async () => {
    if (!user?.uid || confirmText !== 'DELETE') return;
    
    setActionLoading(true);
    try {
      const res = await fetch('/api/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebaseUid: user.uid })
      });
      
      if (res.ok) {
        await signOut();
        router.push('/');
      } else {
        toast.error('Failed to delete account');
      }
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setActionLoading(false);
    }
  };
  
  // Handle family deletion (admin only)
  const handleDeleteFamily = async () => {
    if (!user?.uid || confirmText !== 'DELETE') return;
    
    setActionLoading(true);
    try {
      const res = await fetch('/api/family', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebaseUid: user.uid, action: 'deleteFamily' })
      });
      
      if (res.ok) {
        router.push('/onboarding');
      } else {
        toast.error('Failed to delete family');
      }
    } catch (error) {
      console.error('Delete family error:', error);
    } finally {
      setActionLoading(false);
    }
  };
  
  // Handle leaving family (non-admin)
  const handleLeaveFamily = async () => {
    if (!user?.uid) return;
    
    setActionLoading(true);
    try {
      const res = await fetch('/api/family', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebaseUid: user.uid, action: 'leave' })
      });
      
      if (res.ok) {
        router.push('/onboarding');
      } else {
        toast.error('Failed to leave family');
      }
    } catch (error) {
      console.error('Leave error:', error);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6 max-w-2xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-500 mt-1">Manage your account and family</p>
          </div>
          
          {/* Profile Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <Button 
                  onClick={handleUpdateProfile} 
                  disabled={actionLoading}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </div>
              <div className="text-sm text-gray-500">
                Phone: {user?.phoneNumber}
              </div>
            </CardContent>
          </Card>
          
          {/* Family Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Family Members
                </CardTitle>
                <CardDescription className="mt-1">
                  {isAdmin ? 'You are the admin of this family' : 'Family member'}
                </CardDescription>
              </div>
              {isAdmin && (
                <Button size="sm" onClick={() => setAddMemberDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Member
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-10 bg-slate-100 rounded"></div>
                  <div className="h-10 bg-slate-100 rounded"></div>
                </div>
              ) : (
                <>
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold text-emerald-700">
                            {(member.display_name || member.phone_number).charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{member.display_name || member.phone_number}</p>
                          {member.is_admin && (
                            <span className="text-xs text-emerald-600 flex items-center gap-1">
                              <Crown className="w-3 h-3" /> Admin
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {familyMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold text-slate-600">
                            {member.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <p className="font-medium">{member.name}</p>
                      </div>
                    </div>
                  ))}
                </>
              )}
              
              {!isAdmin && (
                <Button
                  variant="outline"
                  className="w-full mt-4 text-orange-600 border-orange-200 hover:bg-orange-50"
                  onClick={() => setLeaveFamilyDialog(true)}
                >
                  <UserMinus className="w-4 h-4 mr-2" />
                  Leave Family
                </Button>
              )}
            </CardContent>
          </Card>
          
          {/* GDPR Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-gray-900">Your Data (GDPR)</CardTitle>
              <CardDescription>
                Manage your personal data in accordance with GDPR
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleExportData}
              >
                <Download className="w-4 h-4 mr-2" />
                Export My Data
              </Button>
              
              {isAdmin && (
                <Button
                  variant="outline"
                  className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => setDeleteFamilyDialog(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Family
                </Button>
              )}
              
              <Button
                variant="outline"
                className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setDeleteAccountDialog(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete My Account
              </Button>
            </CardContent>
          </Card>
          
          {/* Logout */}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
        
        {/* Add Member Dialog - Reusing Component */}
        <AddMemberDialog 
          open={addMemberDialog} 
          onOpenChange={setAddMemberDialog}
          onSuccess={fetchData}
        />
        
        {/* Delete Account Dialog */}
        <Dialog open={deleteAccountDialog} onOpenChange={setDeleteAccountDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Delete Account
              </DialogTitle>
              <DialogDescription>
                This will permanently delete your account and all your data. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Type DELETE to confirm</Label>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteAccountDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={confirmText !== 'DELETE' || actionLoading}
              >
                {actionLoading ? 'Deleting...' : 'Delete Account'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        

        {/* Delete Family Dialog */}
        <Dialog open={deleteFamilyDialog} onOpenChange={setDeleteFamilyDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Delete Family
              </DialogTitle>
              <DialogDescription>
                This will delete the family and remove all members. All events will be lost.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Type DELETE to confirm</Label>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteFamilyDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteFamily}
                disabled={confirmText !== 'DELETE' || actionLoading}
              >
                {actionLoading ? 'Deleting...' : 'Delete Family'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Leave Family Dialog */}
        <Dialog open={leaveFamilyDialog} onOpenChange={setLeaveFamilyDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Leave Family</DialogTitle>
              <DialogDescription>
                Are you sure you want to leave this family? You can be invited back later.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLeaveFamilyDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleLeaveFamily}
                disabled={actionLoading}
              >
                {actionLoading ? 'Leaving...' : 'Leave Family'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
