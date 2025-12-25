'use client';

/**
 * Shared Event Form Component
 * 
 * Reusable form fields for creating and editing calendar events.
 * Used by both QuickAddSheet and EditEventDialog for consistency.
 * 
 * This is a CONTROLLED component - all state is managed by the parent.
 */

import { useState, useEffect, useMemo } from 'react';
import { Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FamilyMemberSelector } from './family-member-selector';
import type { CalendarEvent } from '@/types/calendar';

export interface EventFormData {
  title: string;
  eventDate: string;
  eventTime: string;
  endTime: string;
  isAllDay: boolean;
  familyMember: string;
  location: string;
  description: string;
}

interface EventFormProps {
  /** Form data controlled by parent */
  data: EventFormData;
  /** Callback when any field changes */
  onChange: (data: EventFormData) => void;
  /** Available family members for selection */
  availableFamilyMembers?: string[];
  /** Auto-focus the title input */
  autoFocus?: boolean;
}

/**
 * Create initial form data from an event or defaults
 */
export function createEventFormData(
  event?: CalendarEvent | null,
  defaultDate?: Date
): EventFormData {
  if (event) {
    return {
      title: event.title,
      eventDate: event.event_date,
      eventTime: event.event_time || '',
      endTime: event.end_time || '',
      isAllDay: event.is_all_day,
      familyMember: event.family_member || '',
      location: event.location || '',
      description: event.description || '',
    };
  }
  return {
    title: '',
    eventDate: defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    eventTime: '',
    endTime: '',
    isAllDay: false,
    familyMember: '',
    location: '',
    description: '',
  };
}

/**
 * Validate form data
 */
export function isEventFormValid(data: EventFormData): boolean {
  return data.title.trim() !== '' && data.eventDate !== '';
}

export function EventForm({
  data,
  onChange,
  availableFamilyMembers = [],
  autoFocus = false,
}: EventFormProps) {
  const { t } = useTranslation();
  const [fetchedMembers, setFetchedMembers] = useState<string[]>([]);

  // Fetch family members if not provided
  useEffect(() => {
    if (availableFamilyMembers.length === 0 && fetchedMembers.length === 0) {
      let cancelled = false;
      
      const fetchFamilyMembers = async () => {
        try {
          const response = await fetch('/api/family');
          const result = await response.json();
          
          if (cancelled) return;
          
          if (result.success && result.data) {
            const allNames: string[] = [];
            
            if (result.data.users) {
              for (const user of result.data.users) {
                const name = user.display_name || user.phone_number;
                if (name) allNames.push(name);
              }
            }
            
            if (result.data.familyMembers) {
              for (const member of result.data.familyMembers) {
                allNames.push(member.name);
              }
            }
            
            setFetchedMembers(allNames);
          }
        } catch {
          // Silently fail - not critical
        }
      };
      
      fetchFamilyMembers();
      
      return () => { cancelled = true; };
    }
  }, [availableFamilyMembers.length, fetchedMembers.length]);

  // Combine provided and fetched members
  const allMembers = useMemo(() => {
    const combined = new Set([...availableFamilyMembers, ...fetchedMembers]);
    if (data.familyMember) {
      combined.add(data.familyMember);
    }
    return Array.from(combined).sort();
  }, [availableFamilyMembers, fetchedMembers, data.familyMember]);

  // Update handler
  const updateField = <K extends keyof EventFormData>(field: K, value: EventFormData[K]) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="event-title">{t('calendar.title')}</Label>
        <Input
          id="event-title"
          value={data.title}
          onChange={(e) => updateField('title', e.target.value)}
          placeholder={t('calendar.eventTitle')}
          autoFocus={autoFocus}
        />
      </div>

      {/* Date */}
      <div className="space-y-2">
        <Label htmlFor="event-date">{t('calendar.date')}</Label>
        <Input
          id="event-date"
          type="date"
          value={data.eventDate}
          onChange={(e) => updateField('eventDate', e.target.value)}
        />
      </div>

      {/* All Day Toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="event-allday"
          checked={data.isAllDay}
          onChange={(e) => updateField('isAllDay', e.target.checked)}
          className="rounded border-gray-300"
        />
        <Label htmlFor="event-allday" className="cursor-pointer">
          {t('calendar.allDayEvent')}
        </Label>
      </div>

      {/* Time (Start/End) - only if not all day */}
      {!data.isAllDay && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="event-time" className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> {t('calendar.start')}
            </Label>
            <Input
              id="event-time"
              type="time"
              value={data.eventTime}
              onChange={(e) => updateField('eventTime', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-end-time">{t('calendar.end')}</Label>
            <Input
              id="event-end-time"
              type="time"
              value={data.endTime}
              onChange={(e) => updateField('endTime', e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Family Member Selection */}
      <FamilyMemberSelector
        value={data.familyMember}
        onChange={(value) => updateField('familyMember', value)}
        availableMembers={allMembers}
      />

      {/* Location */}
      <div className="space-y-2">
        <Label htmlFor="event-location" className="flex items-center gap-1">
          <MapPin className="w-3 h-3" /> {t('calendar.location')}
        </Label>
        <Input
          id="event-location"
          value={data.location}
          onChange={(e) => updateField('location', e.target.value)}
          placeholder={t('calendar.eventLocation')}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="event-description">{t('calendar.description')}</Label>
        <Input
          id="event-description"
          value={data.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder={t('calendar.additionalNotes')}
        />
      </div>
    </div>
  );
}
