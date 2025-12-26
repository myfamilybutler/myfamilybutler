'use client';

/**
 * Event Reminder Form Section
 * 
 * Extracted from EditEventDialog for better organization.
 * Allows setting reminders for events with preset or custom timing.
 */

import { useState } from 'react';
import { format, addHours, addDays, setHours, setMinutes } from 'date-fns';
import { Bell, Loader2 } from 'lucide-react';
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
    } catch (error) {
      console.error('Error creating reminder:', error);
      toast.error('Failed to create reminder');
    } finally {
      setIsLoading(false);
    }
  };

  if (!showForm) {
    return (
      <div className="border-t border-gray-200 pt-4">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowForm(true)}
        >
          <Bell className="w-4 h-4 mr-2" />
          Add Reminder
        </Button>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200 pt-4">
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
    </div>
  );
}
