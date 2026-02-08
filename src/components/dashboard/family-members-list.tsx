'use client';

import { Crown, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FamilyMemberBadge } from '@/components/ui/family-member-badge';
import { useTranslation } from 'react-i18next';

interface FamilyUser {
  id: string;
  display_name?: string;
  phone_number?: string;
  linked_email?: string;
  is_household_admin?: boolean;  // Household owner, not super admin
}

interface FamilyMember {
  id: string;
  name: string;
  color?: string; // HEX color code
}

interface FamilyMembersListProps {
  users: FamilyUser[];
  familyMembers: FamilyMember[];
  isAdmin: boolean;
  showActions?: boolean; // Show edit/delete buttons (for settings page)
  onEditMember?: (member: FamilyMember) => void;
  onDeleteMember?: (member: FamilyMember) => void;
}

export function FamilyMembersList({
  users,
  familyMembers,
  isAdmin,
  showActions = false,
  onEditMember,
  onDeleteMember,
}: FamilyMembersListProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      {/* WhatsApp Users */}
      {users.map((user) => (
        <div
          key={user.id}
          className="flex items-center justify-between p-3 rounded-xl hover:bg-accent transition-colors"
        >
          <div className="flex items-center gap-3">
            <FamilyMemberBadge
              name={user.display_name || user.phone_number || user.linked_email || t('settings.unknownUser')}
              size="sm"
              showDot={false}
              className="max-w-40"
            />
            <div className="flex-1 min-w-0">
              {user.is_household_admin && (
                <span className="text-xs text-primary flex items-center gap-1">
                  <Crown className="w-3 h-3" /> {t('settings.householdAdmin')}
                </span>
              )}
            </div>
          </div>

          {/* Remove user button (for admins, except self) */}
          {showActions && isAdmin && !user.is_household_admin && (
            <Button
              variant="destructiveGhost"
              size="sm"
              className="h-10 w-10 p-0"
              aria-label={t('settings.removeMemberA11y', { name: user.display_name || user.phone_number || user.linked_email || t('settings.unknownUser') })}
              onClick={() => onDeleteMember?.({ id: user.id, name: user.display_name || user.phone_number || user.linked_email || t('settings.unknownUser') })}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      ))}

      {/* Family Members (non-WhatsApp) */}
      {familyMembers.map((member) => {
        return (
          <div
            key={member.id}
            className="flex items-center justify-between p-3 rounded-xl hover:bg-accent transition-colors"
          >
            <div className="flex items-center gap-3">
              <FamilyMemberBadge
                name={member.name}
                colorHex={member.color}
                size="sm"
                showDot={false}
                className="max-w-40"
              />
            </div>
            
            {/* Edit/Delete buttons - only for admins when showActions is true */}
            {showActions && isAdmin && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 p-0 text-muted-foreground hover:text-primary"
                  aria-label={t('settings.editMemberA11y', { name: member.name })}
                  onClick={() => onEditMember?.(member)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="destructiveGhost"
                  size="sm"
                  className="h-10 w-10 p-0"
                  aria-label={t('settings.deleteMemberA11y', { name: member.name })}
                  onClick={() => onDeleteMember?.(member)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        );
      })}

      {users.length === 0 && familyMembers.length === 0 && (
        <p className="text-sm text-muted-foreground/70 py-2">{t('settings.noFamilyMembers')}</p>
      )}
    </div>
  );
}

// Re-export types for consumers
export type { FamilyUser, FamilyMember };
