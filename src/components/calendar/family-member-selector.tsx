'use client';

/**
 * Family Member Selector
 * 
 * Badge-based selection for family members with custom input option.
 * Extracted from EditEventDialog for reusability.
 */

import { useState } from 'react';
import { User, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FamilyMemberSelectorProps {
  value: string;
  onChange: (value: string) => void;
  availableMembers: string[];
}

type MemberBadgeVariant = 'success' | 'info' | 'secondary' | 'warning';

function getMemberVariant(member: string): MemberBadgeVariant {
  const lowerMember = member.toLowerCase();
  if (lowerMember === 'mom' || lowerMember === 'mama' || lowerMember === 'mum') return 'info';
  if (lowerMember === 'dad' || lowerMember === 'papa') return 'secondary';
  if (lowerMember.includes('kid') || lowerMember.includes('child')) return 'warning';
  return 'success';
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
            
            return (
              <Badge
                asChild
                key={member}
                variant={isSelected ? getMemberVariant(member) : 'outline'}
                size="default"
                className={cn(
                  'cursor-pointer',
                  !isSelected && 'border-border bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <button
                  type="button"
                  onClick={() => handleSelectMember(member)}
                >
                  {member}
                  {isSelected && <X className="w-3 h-3 ml-0.5" />}
                </button>
              </Badge>
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
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Selected:</span>
          <Badge variant="success" size="sm">{value}</Badge>
        </div>
      )}
    </div>
  );
}
