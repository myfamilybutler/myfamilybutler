'use client';

import { MapPin, User, CalendarDays, Clock, Pencil, Repeat } from 'lucide-react';
import { parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { formatDate, formatTime } from '@/lib/utils';
import { rruleToHuman } from '@/lib/recurrence';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { FamilyMemberBadge } from '@/components/ui/family-member-badge';
import { Button } from '@/components/ui/button';
import type { CalendarEvent } from '@/types/calendar';
import { useFamilyData } from '@/stores/family-store';

interface EventDetailDialogProps {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (event: CalendarEvent) => void;
}

function getEventEndDate(event: CalendarEvent): string {
  return event.end_date || event.event_date;
}

function normalizeRule(rule: string | null | undefined): string | null {
  if (!rule) return null;
  return rule.startsWith('RRULE:') ? rule.slice('RRULE:'.length) : rule;
}

export function EventDetailDialog({
  event,
  open,
  onOpenChange,
  onEdit,
}: EventDetailDialogProps) {
  const { t, i18n } = useTranslation();
  const { memberColors } = useFamilyData();

  if (!event) return null;

  const endDate = getEventEndDate(event);
  const isMultiDay = endDate > event.event_date;
  const startDateLabel = formatDate(parseISO(event.event_date), 'PPPP', i18n.language);
  const endDateLabel = formatDate(parseISO(endDate), 'PPPP', i18n.language);
  const recurrenceRule = normalizeRule(event.recurrence_rule);
  const recurrenceLabel = recurrenceRule
    ? rruleToHuman(recurrenceRule, i18n.language.startsWith('de') ? 'de' : 'en')
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold leading-tight">
            {event.title}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isMultiDay ? `${startDateLabel} - ${endDateLabel}` : startDateLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {event.is_all_day ? (
              <span>{t('calendar.allDay')}</span>
            ) : (
                <span>
                  {formatTime(event.event_time)}
                  {event.end_time &&
                    ` - ${formatTime(event.end_time)}${isMultiDay ? ` (${formatDate(parseISO(endDate), 'P', i18n.language)})` : ''}`}
                </span>
              )}
            </div>

          {isMultiDay && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span>{t('calendar.date')}: {startDateLabel} - {endDateLabel}</span>
            </div>
          )}

          {recurrenceRule && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Repeat className="h-4 w-4" />
              <span>{recurrenceLabel}</span>
            </div>
          )}

          {event.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{event.location}</span>
            </div>
          )}

          {event.family_member && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <FamilyMemberBadge
                name={event.family_member}
                colorHex={memberColors.get(event.family_member)}
                size="sm"
              />
            </div>
          )}

          {event.description && (
            <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-foreground whitespace-pre-wrap break-words">
              {event.description}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="brand"
            onClick={() => onEdit?.(event)}
          >
            <Pencil className="mr-2 h-4 w-4" />
            {t('common.edit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
