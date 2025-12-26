'use client';


import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { 
  Users, 
  Trash2, 
  LogOut, 
  Download, 
  UserMinus,
  Plus,
  Calendar,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AddMemberDialog } from '@/components/dashboard/add-member-dialog';
import { AccountSecurityCard } from '@/components/settings/account-security-card';
import { GoogleCalendarConnectButton } from '@/components/settings/google-calendar-connect';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuthStore } from '@/stores/auth-store';

import { FamilyMembersList, type FamilyUser, type FamilyMember } from '@/components/dashboard/family-members-list';

import { useDashboardData } from '@/hooks/use-dashboard-data';
// ... imports

export default function SettingsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { dbUser, signOut } = useAuthStore(); // dbUser will be hydrated by useDashboardData
  // Trigger global data fetch to ensure dbUser is fresh
  const { refresh: refreshDashboard } = useDashboardData();
  
  const [members, setMembers] = useState<FamilyUser[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [deleteAccountDialog, setDeleteAccountDialog] = useState(false);
  const [deleteFamilyDialog, setDeleteFamilyDialog] = useState(false);
  const [leaveFamilyDialog, setLeaveFamilyDialog] = useState(false);
  const [addMemberDialog, setAddMemberDialog] = useState(false);
  const [deleteMemberDialog, setDeleteMemberDialog] = useState(false);
  const [editMemberDialog, setEditMemberDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [editMemberName, setEditMemberName] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch data - extracted to useCallback so mutations can refetch
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/family');
      const data = await res.json();
      
      if (data.success) {
        setMembers(data.data.users || []);
        setFamilyMembers(data.data.familyMembers || []);
        setIsAdmin(data.data.isAdmin || false);
      } else {
        console.warn('Family fetch failed:', data.error);
      }
    } catch (error) {
      console.error('Error fetching family data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Combined update handler
  const handleDataUpdate = useCallback(async () => {
    await Promise.all([
      refreshDashboard(),
      fetchData()
    ]);
  }, [refreshDashboard, fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Fetch immediately - the API validates session server-side
  // On direct page load, dbUser may not be populated (cookie-based auth),
  // but the API will work correctly with the session cookie
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
      toast.error(t('settings.exportError'));
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
        toast.error(t('settings.deleteAccountError'));
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
        toast.error(t('settings.deleteFamilyError'));
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
        toast.error(t('settings.leaveFamilyError'));
      }
    } catch (error) {
      console.error('Leave error:', error);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle edit family member
  const handleEditMember = async () => {
    if (!selectedMember || !editMemberName.trim()) return;
    
    setActionLoading(true);
    try {
      const res = await fetch('/api/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'edit', 
          memberId: selectedMember.id, 
          name: editMemberName.trim() 
        })
      });
      
      if (res.ok) {
        toast.success(t('settings.memberUpdated'));
        setEditMemberDialog(false);
        setSelectedMember(null);
        setEditMemberName('');
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || t('settings.updateMemberError'));
      }
    } catch (error) {
      console.error('Edit member error:', error);
      toast.error(t('settings.updateMemberError'));
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete family member
  const handleDeleteMember = async () => {
    if (!selectedMember) return;
    
    setActionLoading(true);
    try {
      const res = await fetch('/api/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'deleteMember', 
          memberId: selectedMember.id 
        })
      });
      
      if (res.ok) {
        toast.success(t('settings.memberDeleted'));
        setDeleteMemberDialog(false);
        setSelectedMember(null);
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || t('settings.deleteMemberError'));
      }
    } catch (error) {
      console.error('Delete member error:', error);
      toast.error(t('settings.deleteMemberError'));
    } finally {
      setActionLoading(false);
    }
  };

  // Open edit dialog
  const openEditDialog = (member: FamilyMember) => {
    setSelectedMember(member);
    setEditMemberName(member.name);
    setEditMemberDialog(true);
  };

  // Open delete dialog
  const openDeleteDialog = (member: FamilyMember) => {
    setSelectedMember(member);
    setDeleteMemberDialog(true);
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6 max-w-2xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>
            <p className="text-gray-500 mt-1">{t('settings.description')}</p>
          </div>
          
          {/* Account & Security Section */}
          <AccountSecurityCard 
          dbUser={dbUser} 
          loading={loading} 
          onUpdate={handleDataUpdate} 
        />  
          {/* Family Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  {t('settings.familyMembers')}
                </CardTitle>
                <CardDescription className="mt-1">
                  {isAdmin ? t('settings.adminRole') : t('settings.memberRole')}
                </CardDescription>
              </div>
              {isAdmin && (
                <Button size="sm" onClick={() => setAddMemberDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('settings.addMember')}
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
                <FamilyMembersList
                  users={members}
                  familyMembers={familyMembers}
                  isAdmin={isAdmin}
                  showActions={true}
                  onEditMember={openEditDialog}
                  onDeleteMember={openDeleteDialog}
                />
              )}
              
              {!isAdmin && (
                <Button
                  variant="outline"
                  className="w-full mt-4 text-orange-600 border-orange-200 hover:bg-orange-50"
                  onClick={() => setLeaveFamilyDialog(true)}
                >
                  <UserMinus className="w-4 h-4 mr-2" />
                  {t('settings.leaveFamily')}
                </Button>
              )}
            </CardContent>
          </Card>
          
          {/* Calendar Integrations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {t('settings.calendarSync')}
              </CardTitle>
              <CardDescription>
                {t('settings.calendarSyncDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GoogleCalendarConnectButton />
            </CardContent>
          </Card>
          
          {/* GDPR Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-gray-900">{t('settings.gdprTitle')}</CardTitle>
              <CardDescription>
                {t('settings.gdprDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleExportData}
              >
                <Download className="w-4 h-4 mr-2" />
                {t('settings.exportData')}
              </Button>
              
              {isAdmin && (
                <Button
                  variant="outline"
                  className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => setDeleteFamilyDialog(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('settings.deleteFamily')}
                </Button>
              )}
              
              <Button
                variant="outline"
                className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setDeleteAccountDialog(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('settings.deleteAccount')}
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
            {t('settings.signOut')}
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
          title={t('settings.deleteAccountTitle')}
          description={t('settings.deleteAccountDesc')}
          confirmText="DELETE"
          onConfirm={handleDeleteAccount}
          loading={actionLoading}
        />
        
        {/* Delete Family Dialog */}
        <ConfirmDialog
          open={deleteFamilyDialog}
          onOpenChange={setDeleteFamilyDialog}
          title={t('settings.deleteFamilyTitle')}
          description={t('settings.deleteFamilyDesc')}
          confirmText="DELETE"
          onConfirm={handleDeleteFamily}
          loading={actionLoading}
        />
        
        {/* Leave Family Dialog */}
        <ConfirmDialog
          open={leaveFamilyDialog}
          onOpenChange={setLeaveFamilyDialog}
          title={t('settings.leaveFamilyTitle')}
          description={t('settings.leaveFamilyDesc')}
          onConfirm={handleLeaveFamily}
          loading={actionLoading}
        />
        
        {/* Edit Member Dialog */}
        <ConfirmDialog
          open={editMemberDialog}
          onOpenChange={(open) => {
            setEditMemberDialog(open);
            if (!open) {
              setSelectedMember(null);
              setEditMemberName('');
            }
          }}
          title={t('settings.editMemberTitle')}
          description={
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t('settings.editMemberDesc')}
              </p>
              <Input
                value={editMemberName}
                onChange={(e) => setEditMemberName(e.target.value)}
                placeholder={t('settings.enterName')}
                className="mt-2"
              />
            </div>
          }
          confirmText={t('common.save')}
          onConfirm={handleEditMember}
          loading={actionLoading}
        />
        
        {/* Delete Member Dialog */}
        <ConfirmDialog
          open={deleteMemberDialog}
          onOpenChange={(open) => {
            setDeleteMemberDialog(open);
            if (!open) setSelectedMember(null);
          }}
          title={t('settings.deleteMemberTitle')}
          description={t('settings.deleteMemberDesc', { name: selectedMember?.name })}
          confirmText="DELETE"
          onConfirm={handleDeleteMember}
          loading={actionLoading}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
