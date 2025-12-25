'use client';

/**
 * Quick Add Sheet
 * 
 * Bottom sheet for quickly creating new events.
 * Uses shared EventForm component for consistency with EditEventDialog.
 */

import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { EventForm, createEventFormData, isEventFormValid, type EventFormData } from './event-form';
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

  // Reset form when sheet opens
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
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title.trim(),
          event_date: formData.eventDate,
          event_time: formData.eventTime || null,
          end_time: formData.endTime || null,
          is_all_day: formData.isAllDay || !formData.eventTime,
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl px-5 pb-8 max-h-[85vh] flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle>{t('calendar.newEvent')}</SheetTitle>
          <SheetDescription className="sr-only">
            {t('calendar.quickAddDescription')}
          </SheetDescription>
        </SheetHeader>

        {/* Scrollable form content */}
        <div className="flex-1 overflow-y-auto py-4 px-1">
          <EventForm
            data={formData}
            onChange={handleFormChange}
            autoFocus
          />
        </div>

        <SheetFooter className="flex-shrink-0 pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={isLoading || !isEventFormValid(formData)}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
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
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
