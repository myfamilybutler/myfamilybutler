'use client';

/**
 * Active Filters Bar
 * 
 * Shows active member filters as pill buttons below the navbar.
 * Provides clear visual feedback when filters are applied and easy way to clear them.
 */

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
              <Badge
                asChild
                key={memberName}
                variant="outline"
                size="sm"
                className="shrink-0 border-border/80 bg-background/70 hover:bg-accent hover:text-foreground"
              >
                <button
                  type="button"
                  onClick={() => toggleMember(memberName)}
                  title={t('calendar.removeFilter')}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="max-w-24 truncate">{memberName}</span>
                  <X className="w-3 h-3 opacity-70" />
                </button>
              </Badge>
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
