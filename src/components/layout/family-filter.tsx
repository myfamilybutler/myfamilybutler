'use client';

import { useTranslation } from 'react-i18next';
import { Users, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useFilterStore } from '@/stores/filter-store';
import { useFamilyMembers } from '@/hooks/use-family-members';
import { useState } from 'react';
import { DEFAULT_MEMBER_COLOR } from '@/lib/utils/ui-helpers';

export function FamilyFilter() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { members } = useFamilyMembers();
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
              const memberColor = member.color || DEFAULT_MEMBER_COLOR;
              
              return (
                <button
                  key={member.id}
                  onClick={() => toggleMember(member.name)}
                  className={cn(
                    'flex items-center gap-3 w-full px-2 py-1.5 rounded-md text-sm transition-colors',
                    isSelected
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  {/* Color dot */}
                  <span 
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: memberColor }}
                  />
                  <span className="flex-1 text-left truncate">{member.name}</span>
                  {isSelected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
