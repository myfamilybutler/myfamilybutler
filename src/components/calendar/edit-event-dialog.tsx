'use client';

/**
 * Edit Event Dialog
 * 
 * Dialog for editing calendar events.
 * Uses shared EventForm component for consistency with QuickAddSheet.
 */

import { useCallback, useState, useEffect } from 'react';
import { Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { CalendarEvent } from '@/types/calendar';
import { EventForm, createEventFormData, isEventFormValid, type EventFormData } from './event-form';
import { EventReminderSection } from './event-reminder-section';
import { DeleteEventDialog } from './delete-event-dialog';
import { useTranslation } from 'react-i18next';
import { log } from '@/lib/utils/logger';

interface EditEventDialogProps {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventUpdated?: () => void;
  onEventDeleted?: () => void;
  availableFamilyMembers?: string[];
}

export function EditEventDialog({
  event,
  open,
  onOpenChange,
  onEventUpdated,
  onEventDeleted,
  availableFamilyMembers = [],
}: EditEventDialogProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [formData, setFormData] = useState<EventFormData>(() => 
    createEventFormData(event)
  );

  // Reset form when dialog opens with a different event
  useEffect(() => {
    if (open && event) {
      setFormData(createEventFormData(event));
      setShowDeleteDialog(false);
    }
  }, [open, event]);

  const handleFormChange = useCallback((data: EventFormData) => {
    setFormData(data);
  }, []);

  const handleSave = async () => {
    if (!event || !isEventFormValid(formData)) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/events', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          updates: {
            title: formData.title,
            event_date: formData.eventDate,
            event_time: formData.eventTime || null,
            end_time: formData.endTime || null,
            is_all_day: formData.isAllDay,
            family_member: formData.familyMember || null,
            location: formData.location || null,
            description: formData.description || null,
          },
        }),
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        // Handle version conflict (409) with specific message
        if (response.status === 409) {
          toast.error('Event was modified by another user. Please refresh and try again.', {
            action: {
              label: 'Refresh',
              onClick: () => onEventUpdated?.(),
            },
          });
          return;
        }
        throw new Error(result.error || 'Failed to update event');
      }

      toast.success(t('calendar.eventUpdated'));
      onEventUpdated?.();
      onOpenChange(false);
    } catch (error) {
      log.error('Error updating event:', error);
      toast.error(t('calendar.updateError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/events?id=${event.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete event');
      }

      toast.success(t('calendar.eventDeleted'));
      setShowDeleteDialog(false);
      onEventDeleted?.();
      onOpenChange(false);
    } catch (error) {
      log.error('Error deleting event:', error);
      toast.error(t('calendar.deleteError'));
    } finally {
      setIsDeleting(false);
    }
  };

  if (!event) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-emerald-600" />
              {t('calendar.editEvent')}
            </DialogTitle>
          </DialogHeader>

          {/* Scrollable form content */}
          <div className="flex-1 overflow-y-auto py-4 px-1">
            <EventForm
              data={formData}
              onChange={handleFormChange}
              availableFamilyMembers={availableFamilyMembers}
            />
            
            {/* Reminder Section - only in edit mode */}
            <div className="mt-4">
              <EventReminderSection
                eventId={event.id}
                eventTitle={formData.title || event.title}
                eventDate={formData.eventDate || event.event_date}
                eventTime={formData.eventTime || event.event_time || ''}
              />
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 flex-col sm:flex-row gap-2 border-t pt-4">
            {/* Delete Button - Opens confirmation dialog */}
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 min-h-[44px]"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t('common.delete')}
            </Button>

            <div className="flex-1" />

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={isLoading || !isEventFormValid(formData)}
              className="bg-emerald-600 hover:bg-emerald-700 min-h-[44px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('common.saving')}
                </>
              ) : (
                t('common.saveChanges')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteEventDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        eventTitle={formData.title || event.title}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
      />
    </>
  );
}
