'use client';


import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  Users, 
  Trash2, 
  LogOut, 
  Download, 
  Crown,
  UserMinus,
  Plus,
  Calendar,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AddMemberDialog } from '@/components/dashboard/add-member-dialog';
import { AccountSecurityCard } from '@/components/settings/account-security-card';
import { GoogleCalendarConnectButton } from '@/components/settings/google-calendar-connect';
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
  const { dbUser, signOut } = useAuthStore();
  const [members, setMembers] = useState<FamilyUser[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [deleteAccountDialog, setDeleteAccountDialog] = useState(false);
  const [deleteFamilyDialog, setDeleteFamilyDialog] = useState(false);
  const [leaveFamilyDialog, setLeaveFamilyDialog] = useState(false);
  const [addMemberDialog, setAddMemberDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Add Member states
  // const [invitePhone, setInvitePhone] = useState('');
  // const [memberName, setMemberName] = useState('');
  
  // Fetch data - extracted to useCallback so mutations can refetch
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/family');
      const data = await res.json();
      
      if (data.success) {
        setMembers(data.data.users || []);
        setFamilyMembers(data.data.familyMembers || []);
        setIsAdmin(data.data.isAdmin || false);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Handle logout
  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };
  
  // Handle add/invite member logic moved to AddMemberDialog
  
  // Handle data export (GDPR: Right to portability)
  const handleExportData = async () => {
    try {
      const res = await fetch('/api/account/export');
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
    setActionLoading(true);
    try {
      const res = await fetch('/api/account', {
        method: 'DELETE',
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
    setActionLoading(true);
    try {
      const res = await fetch('/api/family', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteFamily' })
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
    setActionLoading(true);
    try {
      const res = await fetch('/api/family', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'leave' })
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
          
          {/* Account & Security Section */}
          <AccountSecurityCard dbUser={dbUser} onUpdate={fetchData} />
          
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
          
          {/* Calendar Integrations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Calendar Sync
              </CardTitle>
              <CardDescription>
                Connect your calendar to automatically sync events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GoogleCalendarConnectButton />
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
        <ConfirmDialog
          open={deleteAccountDialog}
          onOpenChange={setDeleteAccountDialog}
          title="Delete Account"
          description="This will permanently delete your account and all your data. This action cannot be undone."
          confirmText="DELETE"
          onConfirm={handleDeleteAccount}
          loading={actionLoading}
        />
        
        {/* Delete Family Dialog */}
        <ConfirmDialog
          open={deleteFamilyDialog}
          onOpenChange={setDeleteFamilyDialog}
          title="Delete Family"
          description="This will delete the family and remove all members. All events will be lost."
          confirmText="DELETE"
          onConfirm={handleDeleteFamily}
          loading={actionLoading}
        />
        
        {/* Leave Family Dialog */}
        <ConfirmDialog
          open={leaveFamilyDialog}
          onOpenChange={setLeaveFamilyDialog}
          title="Leave Family"
          description="Are you sure you want to leave this family? You can be invited back later."
          onConfirm={handleLeaveFamily}
          loading={actionLoading}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
