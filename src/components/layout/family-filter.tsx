'use client';

import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FamilyMemberRow } from '@/components/ui/family-member-row';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useFilterStore } from '@/stores/filter-store';
import { useFamilyStore } from '@/stores/family-store';
import { useState } from 'react';

export function FamilyFilter() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const members = useFamilyStore((state) => state.members);
  const selectedMembers = useFilterStore((state) => state.selectedMembers);
  const { toggleMember, clearFilters } = useFilterStore((state) => state.actions);

  const hasActiveFilters = selectedMembers.length > 0;
  
  // If no members are loaded yet, don't show the filter
  if (members.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-accent relative",
            hasActiveFilters && "text-primary bg-primary/10 hover:bg-primary/20"
          )}
          aria-label={t('common.filters')}
        >
          <Users className="w-5 h-5" />
          {hasActiveFilters && (
            <Badge 
              variant="default" 
              size="xs"
              className="absolute -top-1 -right-1 min-w-5 justify-center"
            >
              {selectedMembers.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="end">
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 pb-2 border-b">
            <span className="font-medium text-sm text-foreground">
              {t('calendar.filterByMember')}
            </span>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground hover:bg-transparent"
              >
                {t('calendar.clear')}
              </Button>
            )}
          </div>
          
          {/* Member list */}
          <div className="py-1">
            {members.map((member) => {
              const isSelected = selectedMembers.includes(member.name);
              
              return (
                <FamilyMemberRow
                  key={member.id}
                  name={member.name}
                  colorHex={member.color}
                  selected={isSelected}
                  onClick={() => toggleMember(member.name)}
                />
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
