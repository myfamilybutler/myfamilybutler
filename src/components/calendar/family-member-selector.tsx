'use client';

/**
 * Family Member Selector
 * 
 * Badge-based selection for family members with custom input option.
 * Extracted from EditEventDialog for reusability.
 */

import { useState } from 'react';
import { User, X } from 'lucide-react';
import { FamilyMemberBadge } from '@/components/ui/family-member-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useFamilyData } from '@/stores/family-store';
import { useTranslation } from 'react-i18next';

interface FamilyMemberSelectorProps {
  value: string;
  onChange: (value: string) => void;
  availableMembers: string[];
}

export function FamilyMemberSelector({
  value,
  onChange,
  availableMembers,
}: FamilyMemberSelectorProps) {
  const { t } = useTranslation();
  const [customMember, setCustomMember] = useState('');
  const { memberColors } = useFamilyData();

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
        <User className="w-3 h-3" /> {t('calendar.familyMember')}
      </Label>
      
      {/* Member badges */}
      {availableMembers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {availableMembers.map((member) => {
            const isSelected = value === member;
            
            return (
              <button
                type="button"
                key={member}
                onClick={() => handleSelectMember(member)}
                className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
              >
                <FamilyMemberBadge
                  name={member}
                  colorHex={memberColors.get(member)}
                  size="default"
                  className={cn(
                    'cursor-pointer transition-opacity',
                    isSelected
                      ? 'ring-2 ring-primary/70 ring-offset-2 ring-offset-background shadow-sm'
                      : 'opacity-70 hover:opacity-100'
                  )}
                  suffix={isSelected ? <X className="h-3 w-3 opacity-80" /> : undefined}
                />
              </button>
            );
          })}
        </div>
      )}
      
      {/* Custom member input */}
      <div className="flex gap-2">
        <Input
          placeholder={t('calendar.familyMemberPlaceholder')}
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
            {t('common.add')}
          </Button>
        )}
      </div>
      
      {/* Current selection indicator (for custom members not in list) */}
      {value && !availableMembers.includes(value) && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{t('common.selected')}:</span>
          <FamilyMemberBadge
            name={value}
            colorHex={memberColors.get(value)}
            size="sm"
            showDot={false}
          />
        </div>
      )}
    </div>
  );
}
