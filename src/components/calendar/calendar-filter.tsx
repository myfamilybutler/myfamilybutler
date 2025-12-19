'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { CalendarEvent } from './calendar-widget';

// Color mapping for family members
const MEMBER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  default: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
  mom: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  dad: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  kids: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
};

function getMemberColors(member?: string) {
  if (!member) return MEMBER_COLORS.default;
  const lowerMember = member.toLowerCase();
  return MEMBER_COLORS[lowerMember] || MEMBER_COLORS.default;
}

interface CalendarFilterProps {
  events: CalendarEvent[];
  selectedMembers: string[];
  onSelectionChange: (members: string[]) => void;
}

export function CalendarFilter({
  events,
  selectedMembers,
  onSelectionChange,
}: CalendarFilterProps) {
  // Extract unique family members from events
  const familyMembers = useMemo(() => {
    const members = new Set<string>();
    events.forEach((event) => {
      if (event.family_member) {
        members.add(event.family_member);
      }
    });
    return Array.from(members).sort();
  }, [events]);

  const handleToggle = (member: string) => {
    if (selectedMembers.includes(member)) {
      onSelectionChange(selectedMembers.filter((m) => m !== member));
    } else {
      onSelectionChange([...selectedMembers, member]);
    }
  };

  if (familyMembers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-900">Filter by Person</h3>
      <div className="space-y-1">
        {familyMembers.map((member) => {
          const isSelected = selectedMembers.includes(member);
          const colors = getMemberColors(member);

          return (
            <button
              key={member}
              onClick={() => handleToggle(member)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left',
                isSelected
                  ? 'bg-gray-50 hover:bg-gray-100'
                  : 'hover:bg-gray-50 opacity-50'
              )}
            >
              {/* Color dot */}
              <span
                className={cn(
                  'w-3 h-3 rounded-full border-2',
                  colors.bg,
                  colors.border
                )}
              />
              
              {/* Member name */}
              <span className="text-sm font-medium text-gray-900 flex-1">
                {member}
              </span>
              
              {/* Checkbox indicator */}
              <span
                className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                  isSelected
                    ? 'bg-emerald-500 border-emerald-500'
                    : 'border-gray-300'
                )}
              >
                {isSelected && (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
