'use client';

import { Crown, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FamilyMemberRow } from '@/components/ui/family-member-row';
import { useTranslation } from 'react-i18next';

interface FamilyUser {
  id: string;
  display_name?: string;
  phone_number?: string;
  linked_email?: string;
  color?: string;
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
      {users.map((user) => {
        const displayName = user.display_name || user.phone_number || user.linked_email || t('settings.unknownUser');
        const rightSlot =
          showActions && isAdmin && !user.is_household_admin ? (
            <Button
              variant="destructiveGhost"
              size="sm"
              className="h-8 w-8 p-0 shrink-0"
              aria-label={t('settings.removeMemberA11y', { name: displayName })}
              onClick={() => onDeleteMember?.({ id: user.id, name: displayName })}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          ) : user.is_household_admin ? (
            <span className="text-xs text-primary inline-flex items-center gap-1 shrink-0">
              <Crown className="w-3 h-3" />
              {t('settings.householdAdmin')}
            </span>
          ) : null;

        return (
          <FamilyMemberRow
            key={user.id}
            name={displayName}
            colorHex={user.color}
            rightSlot={rightSlot}
            badgeClassName="max-w-[13rem] sm:max-w-[16rem]"
          />
        );
      })}

      {/* Family Members (non-WhatsApp) */}
      {familyMembers.map((member) => {
        const rightSlot =
          showActions && isAdmin ? (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                aria-label={t('settings.editMemberA11y', { name: member.name })}
                onClick={() => onEditMember?.(member)}
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                variant="destructiveGhost"
                size="sm"
                className="h-8 w-8 p-0"
                aria-label={t('settings.deleteMemberA11y', { name: member.name })}
                onClick={() => onDeleteMember?.(member)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ) : null;

        return (
          <FamilyMemberRow
            key={member.id}
            name={member.name}
            colorHex={member.color}
            rightSlot={rightSlot}
            badgeClassName="max-w-[13rem] sm:max-w-[16rem]"
          />
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
