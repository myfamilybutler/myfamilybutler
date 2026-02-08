'use client';

/**
 * Event Reminder Form Section
 * 
 * Extracted from EditEventDialog for better organization.
 * Allows setting reminders for events with preset or custom timing.
 */

import { useCallback, useEffect, useState } from 'react';
import { format, addHours, addDays, setHours, setMinutes } from 'date-fns';
import { Bell, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
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
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [reminderType, setReminderType] = useState<ReminderType>('1h');
  const [customDate, setCustomDate] = useState<Date | undefined>();
  const [customTime, setCustomTime] = useState('');
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [isLoadingReminders, setIsLoadingReminders] = useState(true);
  const [deletingReminderId, setDeletingReminderId] = useState<string | null>(null);

  const loadReminders = useCallback(async () => {
    setIsLoadingReminders(true);
    try {
      const response = await fetch(`/api/reminders?eventId=${encodeURIComponent(eventId)}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to load reminders');
      }

      setReminders((result.data || []) as ReminderItem[]);
    } catch (error) {
      console.error('Error loading reminders:', error);
      toast.error('Failed to load reminders');
    } finally {
      setIsLoadingReminders(false);
    }
  }, [eventId]);

  useEffect(() => {
    void loadReminders();
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
          toast.error('Please select a date and time for the reminder');
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
      const response = await fetch('/api/events', {
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
        throw new Error(result.error || 'Failed to create reminder');
      }

      toast.success(`Reminder set for ${format(remindAt, 'PPp')}`);
      setShowForm(false);
      setCustomDate(undefined);
      setCustomTime('');
      await loadReminders();
    } catch (error) {
      console.error('Error creating reminder:', error);
      toast.error('Failed to create reminder');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteReminder = async (reminderId: string) => {
    setDeletingReminderId(reminderId);
    try {
      const response = await fetch(`/api/reminders?id=${encodeURIComponent(reminderId)}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete reminder');
      }

      toast.success('Reminder removed');
      await loadReminders();
    } catch (error) {
      console.error('Error deleting reminder:', error);
      toast.error('Failed to remove reminder');
    } finally {
      setDeletingReminderId(null);
    }
  };

  return (
    <div className="border-t border-gray-200 pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm">Reminders</Label>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm((prev) => !prev)}
        >
          <Bell className="w-4 h-4 mr-2" />
          {showForm ? 'Hide Form' : 'Add Reminder'}
        </Button>
      </div>

      {isLoadingReminders ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading reminders...
        </div>
      ) : reminders.length > 0 ? (
        <div className="space-y-2">
          {reminders.map((reminder) => {
            const remindAtDate = new Date(reminder.remind_at);
            const remindAtLabel = Number.isNaN(remindAtDate.getTime())
              ? reminder.remind_at
              : format(remindAtDate, 'PPp');

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
                    variant="ghost"
                    onClick={() => void handleDeleteReminder(reminder.id)}
                    disabled={deletingReminderId === reminder.id}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    aria-label="Delete reminder"
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
        <p className="text-sm text-muted-foreground">No reminders set for this event.</p>
      )}

      {showForm && (
        <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
          <Label>Remind me</Label>
          <Select
            value={reminderType}
            onValueChange={(v) => setReminderType(v as ReminderType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">1 hour before</SelectItem>
              <SelectItem value="1d">1 day before</SelectItem>
              <SelectItem value="custom">Custom time</SelectItem>
            </SelectContent>
          </Select>

          {reminderType === 'custom' && (
            <div className="grid grid-cols-2 gap-2">
              <DatePicker
                date={customDate}
                onSelect={setCustomDate}
                placeholder="Pick date"
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
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Set Reminder'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
