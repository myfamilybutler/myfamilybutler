'use client';

/**
 * Shared Event Form Component
 * 
 * Reusable form fields for creating and editing calendar events.
 * Used by both QuickAddSheet and EditEventDialog for consistency.
 * 
 * This is a CONTROLLED component - all state is managed by the parent.
 */

import { useMemo } from 'react';
import { MapPin } from 'lucide-react';
import { format, parseISO, addHours } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { FamilyMemberSelector } from './family-member-selector';
import type { CalendarEvent } from '@/types/calendar';
import { useFamilyData } from '@/stores/family-store';

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
 * Normalize time string to HH:mm format
 */
function normalizeTime(time: string | null | undefined): string {
  if (!time) return '';
  // Take first 5 chars if longer (HH:mm:ss)
  const clean = time.slice(0, 5);
  const [h, m] = clean.split(':');
  if (!h || !m) return '';
  
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
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
      eventTime: normalizeTime(event.event_time),
      endTime: normalizeTime(event.end_time),
      isAllDay: event.is_all_day,
      familyMember: event.family_member || '',
      location: event.location || '',
      description: event.description || '',
    };
  }

    // Default time: next 15-minute slot
    const now = new Date();
    const minutes = now.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 15) * 15;
    // NOTE: setMinutes(60) automatically increments the hour
    now.setMinutes(roundedMinutes);
    now.setSeconds(0);
    
    const startTime = format(now, 'HH:mm');
    const endTime = format(addHours(now, 1), 'HH:mm');

    return {
      title: '',
      eventDate: defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      eventTime: startTime,
      endTime: endTime,
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
  const basicValid = data.title.trim() !== '' && data.eventDate !== '';
  if (!basicValid) return false;

  // For time-based events, require start time
  if (!data.isAllDay) {
    return data.eventTime !== '';
  }

  return true;
}

export function EventForm({
  data,
  onChange,
  availableFamilyMembers = [],
  autoFocus = false,
}: EventFormProps) {
  const { t } = useTranslation();
  const { memberNames } = useFamilyData();

  // Combine provided and hook-sourced members
  const allMembers = useMemo(() => {
    const combined = new Set([...availableFamilyMembers, ...memberNames]);
    if (data.familyMember) {
      combined.add(data.familyMember);
    }
    return Array.from(combined).sort();
  }, [availableFamilyMembers, memberNames, data.familyMember]);

  // Update handler
  const updateField = <K extends keyof EventFormData>(field: K, value: EventFormData[K]) => {
    onChange({ ...data, [field]: value });
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      updateField('eventDate', format(date, 'yyyy-MM-dd'));
    }
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
        <Label>{t('calendar.date')}</Label>
        <DatePicker
          date={data.eventDate ? parseISO(data.eventDate) : undefined}
          onSelect={handleDateSelect}
          placeholder={t('calendar.selectDate')}
        />
      </div>

      {/* All Day Toggle */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="event-allday"
          checked={data.isAllDay}
          onCheckedChange={(checked) => {
            const isChecked = checked as boolean;
            
            // If switching TO time-based (unchecked), ALWAYS reset to current time default
            if (!isChecked) {
              const now = new Date();
              const minutes = now.getMinutes();
              const roundedMinutes = Math.ceil(minutes / 15) * 15;
              now.setMinutes(roundedMinutes);
              now.setSeconds(0);
              
              const startTime = format(now, 'HH:mm');
              const endTime = format(addHours(now, 1), 'HH:mm');
              
              onChange({
                ...data,
                isAllDay: false,
                eventTime: startTime,
                endTime: endTime
              });
            } else {
              updateField('isAllDay', isChecked);
            }
          }}
        />
        <Label htmlFor="event-allday" className="cursor-pointer">
          {t('calendar.allDayEvent')}
        </Label>
      </div>

      {/* Time (Start/End) - only if not all day */}
      {!data.isAllDay && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('calendar.start')}</Label>
            <TimePicker
              value={data.eventTime}
              onChange={(value) => updateField('eventTime', value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('calendar.end')}</Label>
            <TimePicker
              value={data.endTime}
              onChange={(value) => updateField('endTime', value)}
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
