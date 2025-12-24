'use client';

import { Crown, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  return (
    <div className="space-y-2">
      {/* WhatsApp Users */}
      {users.map((user) => (
        <div
          key={user.id}
          className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-emerald-700">
                {(user.display_name || user.phone_number).charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-gray-900 truncate block">
                {user.display_name || user.phone_number}
              </span>
              {user.is_admin && (
                <span className="text-xs text-emerald-600 flex items-center gap-1">
                  <Crown className="w-3 h-3" /> Admin
                </span>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Family Members (non-WhatsApp) */}
      {familyMembers.map((member) => (
        <div
          key={member.id}
          className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-slate-600">
                {member.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-sm font-medium text-gray-900 truncate">
              {member.name}
            </span>
          </div>
          
          {/* Edit/Delete buttons - only for admins when showActions is true */}
          {showActions && isAdmin && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-slate-500 hover:text-emerald-600"
                onClick={() => onEditMember?.(member)}
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-slate-500 hover:text-red-600"
                onClick={() => onDeleteMember?.(member)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      ))}

      {users.length === 0 && familyMembers.length === 0 && (
        <p className="text-sm text-gray-400 py-2">No family members yet</p>
      )}
    </div>
  );
}

// Re-export types for consumers
export type { FamilyUser, FamilyMember };
