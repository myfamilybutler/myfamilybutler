'use client';

/**
 * Event Reminder Form Section
 * 
 * Extracted from EditEventDialog for better organization.
 * Allows setting reminders for events with preset or custom timing.
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import { addHours, addDays, setHours, setMinutes } from 'date-fns';
import { Bell, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { fetchWithTimeout } from '@/lib/utils/fetch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDate } from '@/lib/utils';
import { logError } from '@/lib/utils/logger';

interface EventReminderSectionProps {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
}

type ReminderType = '1h' | '1d' | 'custom';

interface ReminderItem {
  id: string;
  event_id?: string | null;
  message: string;
  remind_at: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  created_at: string;
}

export function EventReminderSection({
  eventId,
  eventTitle,
  eventDate,
  eventTime,
}: EventReminderSectionProps) {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [reminderType, setReminderType] = useState<ReminderType>('1h');
  const [customDate, setCustomDate] = useState<Date | undefined>();
  const [customTime, setCustomTime] = useState('');
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [isLoadingReminders, setIsLoadingReminders] = useState(true);
  const [deletingReminderId, setDeletingReminderId] = useState<string | null>(null);

  const requestIdRef = useRef(0);

  const loadReminders = useCallback(
    async (signal?: AbortSignal) => {
      const requestId = ++requestIdRef.current;
      const isCurrent = () => requestId === requestIdRef.current;

      setIsLoadingReminders(true);
      try {
        const response = await fetchWithTimeout(
          `/api/reminders?eventId=${encodeURIComponent(eventId)}`,
          { signal }
        );
        const result = await response.json();

        if (!isCurrent() || signal?.aborted) return;

        if (!response.ok || !result.success) {
          throw new Error(result.error || t('calendar.reminders.toast.loadFailed'));
        }

        setReminders((result.data || []) as ReminderItem[]);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        logError('Error loading reminders:', error);
        if (isCurrent()) {
          toast.error(t('calendar.reminders.toast.loadFailed'));
        }
      } finally {
        if (isCurrent()) {
          setIsLoadingReminders(false);
        }
      }
    },
    [eventId, t]
  );

  useEffect(() => {
    const abortController = new AbortController();
    void loadReminders(abortController.signal);
    return () => abortController.abort();
  }, [loadReminders]);

  const handleAddReminder = async () => {
    let remindAt: Date;
    const eventDateTime = new Date(`${eventDate}T${eventTime || '09:00'}`);
    
    switch (reminderType) {
      case '1h':
        remindAt = addHours(eventDateTime, -1);
        break;
      case '1d':
        remindAt = addDays(eventDateTime, -1);
        break;
      case 'custom':
        if (!customDate || !customTime) {
          toast.error(t('calendar.reminders.toast.selectDateTime'));
          return;
        }
        const [hours, minutes] = customTime.split(':').map(Number);
        remindAt = setMinutes(setHours(customDate, hours), minutes);
        break;
      default:
        remindAt = addHours(eventDateTime, -1);
    }

    setIsLoading(true);
    try {
      const response = await fetchWithTimeout('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          eventTitle,
          remindAt: remindAt.toISOString(),
        }),
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || t('calendar.reminders.toast.createFailed'));
      }

      toast.success(t('calendar.reminders.toast.setFor', { date: formatDate(remindAt, 'PPp') }));
      setShowForm(false);
      setCustomDate(undefined);
      setCustomTime('');
      await loadReminders();
    } catch (error) {
      logError('Error creating reminder:', error);
      toast.error(t('calendar.reminders.toast.createFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteReminder = async (reminderId: string) => {
    setDeletingReminderId(reminderId);
    try {
      const response = await fetchWithTimeout(`/api/reminders?id=${encodeURIComponent(reminderId)}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || t('calendar.reminders.toast.deleteFailed'));
      }

      toast.success(t('calendar.reminders.toast.removed'));
      await loadReminders();
    } catch (error) {
      logError('Error deleting reminder:', error);
      toast.error(t('calendar.reminders.toast.deleteFailed'));
    } finally {
      setDeletingReminderId(null);
    }
  };

  return (
    <div className="border-t border-border pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{t('calendar.reminders.title')}</Label>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm((prev) => !prev)}
        >
          <Bell className="w-4 h-4 mr-2" />
          {showForm ? t('calendar.reminders.hideForm') : t('calendar.reminders.addReminder')}
        </Button>
      </div>

      {isLoadingReminders ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t('calendar.reminders.loading')}
        </div>
      ) : reminders.length > 0 ? (
        <div className="space-y-2">
          {reminders.map((reminder) => {
            const remindAtDate = new Date(reminder.remind_at);
            const remindAtLabel = Number.isNaN(remindAtDate.getTime())
              ? reminder.remind_at
              : formatDate(remindAtDate, 'PPp');

            return (
              <div
                key={reminder.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{remindAtLabel}</p>
                  <p className="text-xs text-muted-foreground capitalize">{reminder.status}</p>
                </div>

                {reminder.status === 'pending' && (
                  <Button
                    type="button"
                    size="icon"
                    variant="destructiveGhost"
                    onClick={() => void handleDeleteReminder(reminder.id)}
                    disabled={deletingReminderId === reminder.id}
                    aria-label={t('calendar.reminders.deleteA11y')}
                  >
                    {deletingReminderId === reminder.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t('calendar.reminders.noneForEvent')}</p>
      )}

      {showForm && (
        <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
          <Label>{t('calendar.reminders.remindMe')}</Label>
          <Select
            value={reminderType}
            onValueChange={(v) => setReminderType(v as ReminderType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">{t('calendar.reminders.oneHourBefore')}</SelectItem>
              <SelectItem value="1d">{t('calendar.reminders.oneDayBefore')}</SelectItem>
              <SelectItem value="custom">{t('calendar.reminders.customTime')}</SelectItem>
            </SelectContent>
          </Select>

          {reminderType === 'custom' && (
            <div className="grid grid-cols-2 gap-2">
              <DatePicker
                date={customDate}
                onSelect={setCustomDate}
                placeholder={t('calendar.reminders.pickDate')}
              />
              <TimePicker
                value={customTime}
                onChange={setCustomTime}
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleAddReminder}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('calendar.reminders.setReminder')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowForm(false)}
            >
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
