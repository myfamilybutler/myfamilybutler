'use client';

import { useState, useCallback } from 'react';
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
  User,
  Shield,
  Bell,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddMemberDialog } from '@/components/dashboard/add-member-dialog';
import { AccountSecurityCard } from '@/components/settings/account-security-card';
import { GoogleCalendarConnectButton } from '@/components/settings/google-calendar-connect';
import { ColorPicker } from '@/components/settings/color-picker';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuthStore } from '@/stores/auth-store';
import { DEFAULT_MEMBER_COLOR } from '@/lib/utils/ui-helpers';

import { FamilyMembersList, type FamilyMember } from '@/components/dashboard/family-members-list';

import { useDashboardData } from '@/hooks/use-dashboard-data';
import { useFamilyData } from '@/stores/family-store';

export default function SettingsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { dbUser, signOut } = useAuthStore();
  const { refresh: refreshDashboard } = useDashboardData();
  const { users, profileMembers, hasHousehold, isHouseholdAdmin, loading: familyLoading, refetch: refetchFamily } = useFamilyData();
  
  // Dialog states
  const [deleteAccountDialog, setDeleteAccountDialog] = useState(false);
  const [deleteFamilyDialog, setDeleteFamilyDialog] = useState(false);
  const [leaveFamilyDialog, setLeaveFamilyDialog] = useState(false);
  const [addMemberDialog, setAddMemberDialog] = useState(false);
  const [deleteMemberDialog, setDeleteMemberDialog] = useState(false);
  const [editMemberDialog, setEditMemberDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [editMemberName, setEditMemberName] = useState('');
  const [editMemberColor, setEditMemberColor] = useState(DEFAULT_MEMBER_COLOR);
  const [actionLoading, setActionLoading] = useState(false);

  // Combined update handler
  const handleDataUpdate = useCallback(async () => {
    await Promise.all([
      refreshDashboard(),
      refetchFamily()
    ]);
  }, [refreshDashboard, refetchFamily]);

  // Handle logout
  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };
  
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
          name: editMemberName.trim(),
          color: editMemberColor,
        })
      });
      
      if (res.ok) {
        toast.success(t('settings.memberUpdated'));
        setEditMemberDialog(false);
        setSelectedMember(null);
        setEditMemberName('');
        setEditMemberColor(DEFAULT_MEMBER_COLOR);
        refetchFamily();
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
      // Check if this is a user (account holder) or a profile member
      // profileMembers data has 'color', users (account holders) don't have it in the list
      const isUser = users.some(u => u.id === selectedMember.id);
      
      const res = await fetch('/api/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: isUser ? 'removeUser' : 'deleteMember', 
          memberId: selectedMember.id 
        })
      });
      
      if (res.ok) {
        toast.success(isUser ? t('settings.userRemoved') : t('settings.memberDeleted'));
        setDeleteMemberDialog(false);
        setSelectedMember(null);
        refetchFamily();
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
    setEditMemberColor(member.color || DEFAULT_MEMBER_COLOR);
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
            <h1 className="text-2xl font-bold text-foreground">{t('settings.title')}</h1>
            <p className="text-muted-foreground mt-1">{t('settings.description')}</p>
          </div>
          
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">{t('settings.profileTab')}</span>
                <span className="sm:hidden">{t('settings.profileTabShort')}</span>
              </TabsTrigger>
              <TabsTrigger value="family" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">{t('settings.familyTab')}</span>
                <span className="sm:hidden">{t('settings.familyTabShort')}</span>
              </TabsTrigger>
              <TabsTrigger value="privacy" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">{t('settings.privacyTab')}</span>
                <span className="sm:hidden">{t('settings.privacyTabShort')}</span>
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              {/* Account & Security Section */}
              <AccountSecurityCard 
                dbUser={dbUser} 
                loading={familyLoading} 
                onUpdate={handleDataUpdate} 
              />
              
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
              
              {/* Logout - in profile tab */}
              <Button
                variant="outline"
                className="w-full"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                {t('settings.signOut')}
              </Button>
            </TabsContent>

            {/* Family Tab */}
            <TabsContent value="family" className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      {t('settings.familyMembers')}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {isHouseholdAdmin ? t('settings.adminRole') : t('settings.memberRole')}
                    </CardDescription>
                  </div>
                  {hasHousehold ? (
                    <Button size="sm" onClick={() => setAddMemberDialog(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      {t('settings.addMember')}
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => router.push('/onboarding')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Family
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {familyLoading ? (
                    <div className="animate-pulse space-y-2">
                      <div className="h-10 bg-muted rounded"></div>
                      <div className="h-10 bg-muted rounded"></div>
                    </div>
                  ) : (
                    <FamilyMembersList
                      users={users}
                      familyMembers={profileMembers}
                      isAdmin={isHouseholdAdmin}
                      showActions={true}
                      onEditMember={openEditDialog}
                      onDeleteMember={openDeleteDialog}
                    />
                  )}
                  
                  {!isHouseholdAdmin && (
                    <Button
                      variant="warningOutline"
                      className="w-full mt-4"
                      onClick={() => setLeaveFamilyDialog(true)}
                    >
                      <UserMinus className="w-4 h-4 mr-2" />
                      {t('settings.leaveFamily')}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy Tab */}
            <TabsContent value="privacy" className="space-y-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    {t('settings.gdprTitle')}
                  </CardTitle>
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
                </CardContent>
              </Card>

              {/* Danger Zone */}
              <Card className="border-red-200 dark:border-red-900">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <Bell className="w-5 h-5" />
                    {t('settings.dangerZone')}
                  </CardTitle>
                  <CardDescription>
                    {t('settings.dangerZoneDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isHouseholdAdmin && (
                    <Button
                      variant="destructiveOutline"
                      className="w-full justify-start"
                      onClick={() => setDeleteFamilyDialog(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t('settings.deleteFamily')}
                    </Button>
                  )}
                  
                  <Button
                    variant="destructiveOutline"
                    className="w-full justify-start"
                    onClick={() => setDeleteAccountDialog(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('settings.deleteAccount')}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Add Member Dialog - Reusing Component */}
        <AddMemberDialog 
          open={addMemberDialog} 
          onOpenChange={setAddMemberDialog}
          onSuccess={refetchFamily}
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
              setEditMemberColor(DEFAULT_MEMBER_COLOR);
            }
          }}
          title={t('settings.editMemberTitle')}
          description={
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('settings.editMemberDesc')}
              </p>
              <div className="space-y-2">
                <Label htmlFor="memberName">{t('settings.memberName')}</Label>
                <Input
                  id="memberName"
                  value={editMemberName}
                  onChange={(e) => setEditMemberName(e.target.value)}
                  placeholder={t('settings.enterName')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('settings.memberColor')}</Label>
                <ColorPicker
                  value={editMemberColor}
                  onChange={setEditMemberColor}
                />
              </div>
            </div>
          }
          onConfirm={handleEditMember}
          loading={actionLoading}
          variant="default"
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
