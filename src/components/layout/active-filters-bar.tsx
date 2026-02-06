'use client';

/**
 * Active Filters Bar
 * 
 * Shows active member filters as pill buttons below the navbar.
 * Provides clear visual feedback when filters are applied and easy way to clear them.
 */

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFilterStore } from '@/stores/filter-store';
import { useFamilyData } from '@/stores/family-store';
import { DEFAULT_MEMBER_COLOR } from '@/lib/utils/ui-helpers';
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
            const color = memberColors.get(memberName) || DEFAULT_MEMBER_COLOR;
            
            return (
              <button
                key={memberName}
                onClick={() => toggleMember(memberName)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white transition-all hover:opacity-90 hover:shadow-sm active:scale-95 flex-shrink-0"
                style={{ backgroundColor: color }}
                title={t('calendar.removeFilter')}
              >
                <span>{memberName}</span>
                <X className="w-3 h-3 opacity-80" />
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
