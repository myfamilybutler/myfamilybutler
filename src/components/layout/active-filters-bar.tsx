'use client';

/**
 * Active Filters Bar
 * 
 * Shows active member filters as pill buttons below the navbar.
 * Provides clear visual feedback when filters are applied and easy way to clear them.
 */

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FamilyMemberBadge } from '@/components/ui/family-member-badge';
import { useFilterStore } from '@/stores/filter-store';
import { useFamilyData } from '@/stores/family-store';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface ActiveFiltersBarProps {
  className?: string;
}

export function ActiveFiltersBar({ className }: ActiveFiltersBarProps) {
  const { t } = useTranslation();
  const selectedMembers = useFilterStore((state) => state.selectedMembers);
  const { clearFilters, toggleMember } = useFilterStore((state) => state.actions);
  const { memberColors } = useFamilyData();

  // Don't render if no filters active
  if (selectedMembers.length === 0) return null;

  return (
    <div className={cn(
      "w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border/50 py-2",
      className
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
            {t('calendar.filterByMember')}:
          </span>
          
          {selectedMembers.map((memberName) => {
            const color = memberColors.get(memberName);
            
            return (
              <button
                type="button"
                key={memberName}
                onClick={() => toggleMember(memberName)}
                title={t('calendar.removeFilter')}
                className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
              >
                <FamilyMemberBadge
                  name={memberName}
                  colorHex={color}
                  size="sm"
                  className="cursor-pointer pr-1.5 shadow-sm"
                  suffix={<X className="h-3 w-3 opacity-80" />}
                />
              </button>
            );
          })}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            {t('calendar.clearFilters')}
          </Button>
        </div>
      </div>
    </div>
  );
}
