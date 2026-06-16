'use client';

/**
 * Quick Add Sheet
 * 
 * Dialog for quickly creating new events.
 * Uses shared EventForm component for consistency with EditEventDialog.
 */

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { fetchWithTimeout } from '@/lib/utils/fetch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  EventForm,
  buildRecurrenceFromForm,
  createEventFormData,
  isEventFormValid,
  type EventFormData,
} from './event-form';
import { log } from '@/lib/utils/logger';

interface QuickAddSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventCreated?: () => void;
  defaultDate?: Date;
}

export function QuickAddSheet({
  open,
  onOpenChange,
  onEventCreated,
  defaultDate,
}: QuickAddSheetProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<EventFormData>(() => 
    createEventFormData(null, defaultDate)
  );

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData(createEventFormData(null, defaultDate));
    }
  }, [open, defaultDate]);

  const handleFormChange = useCallback((data: EventFormData) => {
    setFormData(data);
  }, []);

  const handleSave = async () => {
    if (!isEventFormValid(formData)) return;
    
    setIsLoading(true);
    try {
      const recurrence = buildRecurrenceFromForm(formData);
      const response = await fetchWithTimeout('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title.trim(),
          event_date: formData.eventDate,
          end_date: formData.endDate || formData.eventDate,
          event_time: formData.eventTime || null,
          end_time: formData.endTime || null,
          is_all_day: formData.isAllDay || !formData.eventTime,
          recurrence_rule: recurrence.recurrenceRule,
          recurrence_end: recurrence.recurrenceEnd,
          family_member: formData.familyMember || null,
          location: formData.location.trim() || null,
          description: formData.description.trim() || null,
        }),
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create event');
      }

      toast.success(t('calendar.eventCreated'));
      onEventCreated?.();
      onOpenChange(false);
    } catch (error) {
      log.error('Error creating event:', error);
      toast.error(t('calendar.createError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col gap-0">
        <DialogHeader className="flex-shrink-0 border-b pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-600" />
            {t('calendar.newEvent')}
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable form content */}
        <div className="flex-1 overflow-y-auto px-1 py-4">
          <EventForm
            data={formData}
            onChange={handleFormChange}
            autoFocus
          />
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-3 sm:pt-4">
          <Button
            variant="outline"
            size="touch"
            onClick={() => onOpenChange(false)}
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="brand"
            size="touch"
            onClick={handleSave}
            disabled={isLoading || !isEventFormValid(formData)}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('common.saving')}
              </>
            ) : (
              t('calendar.addEvent')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
