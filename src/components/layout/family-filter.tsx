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

// Color mapping matching UpcomingEvents for consistency
const MEMBER_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  default: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700' },
  mom: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700' },
  dad: { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700' },
  kids: { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700' },
};

function getMemberStyles(member?: string) {
  if (!member) return MEMBER_STYLES.default;
  const lowerMember = member.toLowerCase();
  
  if (lowerMember.includes('mom') || lowerMember.includes('mama')) return MEMBER_STYLES.mom;
  if (lowerMember.includes('dad') || lowerMember.includes('papa')) return MEMBER_STYLES.dad;
  if (lowerMember.includes('kid') || lowerMember.includes('child')) return MEMBER_STYLES.kids;

  return MEMBER_STYLES.default;
}

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
            "flex items-center gap-2 text-gray-700 hover:text-gray-900 hover:bg-slate-100 relative",
            hasActiveFilters && "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
          )}
          aria-label={t('common.filters')}
        >
          <Users className="w-5 h-5" />
          {hasActiveFilters && (
            <Badge 
              variant="secondary" 
              className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-emerald-600 text-white border-2 border-white"
            >
              {selectedMembers.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h4 className="font-semibold text-sm text-gray-900">
              {t('calendar.filterByMember')}
            </h4>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-slate-500 hover:text-slate-800 transition-colors"
              >
                {t('calendar.clear')}
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {members.map((member) => {
              const isSelected = selectedMembers.includes(member.name);
              const styles = getMemberStyles(member.name);
              
              return (
                <button
                  key={member.id}
                  onClick={() => toggleMember(member.name)}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all w-full',
                    isSelected
                      ? `${styles.bg} ${styles.border} ${styles.text}`
                      : 'bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100 hover:border-gray-200'
                  )}
                >
                  <span className="truncate">{member.name}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 flex-shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
          
          {hasActiveFilters && (
            <p className="text-xs text-gray-400 text-center pt-1">
              {t('calendar.showingEventsFor', { count: selectedMembers.length })}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
