'use client';

/**
 * Family Member Selector
 * 
 * Badge-based selection for family members with custom input option.
 * Extracted from EditEventDialog for reusability.
 */

import { useState } from 'react';
import { User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FamilyMemberSelectorProps {
  value: string;
  onChange: (value: string) => void;
  availableMembers: string[];
}

// Color mapping for family members
const MEMBER_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  default: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700' },
  mom: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700' },
  dad: { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700' },
  kids: { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700' },
};

function getMemberStyles(member?: string) {
  if (!member) return MEMBER_COLORS.default;
  const lowerMember = member.toLowerCase();
  return MEMBER_COLORS[lowerMember] || MEMBER_COLORS.default;
}

export function FamilyMemberSelector({
  value,
  onChange,
  availableMembers,
}: FamilyMemberSelectorProps) {
  const [customMember, setCustomMember] = useState('');

  const handleSelectMember = (member: string) => {
    onChange(value === member ? '' : member);
  };

  const handleAddCustomMember = () => {
    if (customMember.trim()) {
      onChange(customMember.trim());
      setCustomMember('');
    }
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        <User className="w-3 h-3" /> Family Member
      </Label>
      
      {/* Member badges */}
      {availableMembers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {availableMembers.map((member) => {
            const isSelected = value === member;
            const styles = getMemberStyles(member);
            
            return (
              <button
                key={member}
                type="button"
                onClick={() => handleSelectMember(member)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all',
                  isSelected
                    ? `${styles.bg} ${styles.border} ${styles.text}`
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                )}
              >
                {member}
                {isSelected && (
                  <X className="w-3 h-3 ml-1.5 inline-block" />
                )}
              </button>
            );
          })}
        </div>
      )}
      
      {/* Custom member input */}
      <div className="flex gap-2">
        <Input
          placeholder="Or type a name..."
          value={customMember}
          onChange={(e) => setCustomMember(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddCustomMember();
            }
          }}
          className="flex-1"
        />
        {customMember && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddCustomMember}
          >
            Add
          </Button>
        )}
      </div>
      
      {/* Current selection indicator (for custom members not in list) */}
      {value && !availableMembers.includes(value) && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Selected:</span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
            {value}
          </span>
        </div>
      )}
    </div>
  );
}
