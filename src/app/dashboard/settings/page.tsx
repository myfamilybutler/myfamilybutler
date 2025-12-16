'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, 
  Users, 
  Trash2, 
  LogOut, 
  Download, 
  AlertTriangle,
  Crown,
  UserMinus
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
import { ProtectedRoute } from '@/components/auth/protected-route';
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

export default function SettingsPage() {
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [deleteAccountDialog, setDeleteAccountDialog] = useState(false);
  const [deleteHouseholdDialog, setDeleteHouseholdDialog] = useState(false);
  const [leaveHouseholdDialog, setLeaveHouseholdDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  
  // Fetch data
  useEffect(() => {
    async function fetchData() {
      if (!user?.uid) return;
      
      try {
        const res = await fetch(`/api/household?firebaseUid=${user.uid}`);
        const data = await res.json();
        
        if (data.success) {
          setMembers(data.data.users || []);
          setFamilyMembers(data.data.familyMembers || []);
          setIsAdmin(data.data.isAdmin || false);
          
          // Find current user's display name
          const currentUser = data.data.users?.find(
            (u: HouseholdMember) => u.phone_number === user.phoneNumber
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
    }
    
    fetchData();
  }, [user?.uid, user?.phoneNumber]);
  
  // Handle logout
  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };
  
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
      alert('Failed to export data');
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
        alert('Failed to delete account');
      }
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setActionLoading(false);
    }
  };
  
  // Handle household deletion (admin only)
  const handleDeleteHousehold = async () => {
    if (!user?.uid || confirmText !== 'DELETE') return;
    
    setActionLoading(true);
    try {
      const res = await fetch('/api/household', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebaseUid: user.uid, action: 'deleteHousehold' })
      });
      
      if (res.ok) {
        router.push('/onboarding');
      } else {
        alert('Failed to delete household');
      }
    } catch (error) {
      console.error('Delete household error:', error);
    } finally {
      setActionLoading(false);
    }
  };
  
  // Handle leaving household (non-admin)
  const handleLeaveHousehold = async () => {
    if (!user?.uid) return;
    
    setActionLoading(true);
    try {
      const res = await fetch('/api/household', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebaseUid: user.uid, action: 'leave' })
      });
      
      if (res.ok) {
        router.push('/onboarding');
      } else {
        alert('Failed to leave household');
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
        <div className="space-y-6 max-w-2xl">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-500 mt-1">Manage your account and household</p>
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
              <div>
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div className="text-sm text-gray-500">
                Phone: {user?.phoneNumber}
              </div>
            </CardContent>
          </Card>
          
          {/* Household Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Household Members
              </CardTitle>
              <CardDescription>
                {isAdmin ? 'You are the admin of this household' : 'Household member'}
              </CardDescription>
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
                  onClick={() => setLeaveHouseholdDialog(true)}
                >
                  <UserMinus className="w-4 h-4 mr-2" />
                  Leave Household
                </Button>
              )}
              
              {isAdmin && (
                <Button
                  variant="outline"
                  className="w-full mt-4 text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => setDeleteHouseholdDialog(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Household
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
        
        {/* Delete Household Dialog */}
        <Dialog open={deleteHouseholdDialog} onOpenChange={setDeleteHouseholdDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Delete Household
              </DialogTitle>
              <DialogDescription>
                This will delete the household and remove all members. All events will be lost.
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
              <Button variant="outline" onClick={() => setDeleteHouseholdDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteHousehold}
                disabled={confirmText !== 'DELETE' || actionLoading}
              >
                {actionLoading ? 'Deleting...' : 'Delete Household'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Leave Household Dialog */}
        <Dialog open={leaveHouseholdDialog} onOpenChange={setLeaveHouseholdDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Leave Household</DialogTitle>
              <DialogDescription>
                Are you sure you want to leave this household? You can be invited back later.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLeaveHouseholdDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleLeaveHousehold}
                disabled={actionLoading}
              >
                {actionLoading ? 'Leaving...' : 'Leave Household'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
