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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CalendarEvent } from '@/types/calendar';
import {
  EventForm,
  buildRecurrenceFromForm,
  createEventFormData,
  isEventFormValid,
  type EventFormData,
} from './event-form';
import { EventReminderSection } from './event-reminder-section';
import { DeleteEventDialog } from './delete-event-dialog';
import { useTranslation } from 'react-i18next';
import { log } from '@/lib/utils/logger';

type RecurrenceEditScope = 'single' | 'series';

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
  const [editScope, setEditScope] = useState<RecurrenceEditScope>('series');
  const [formData, setFormData] = useState<EventFormData>(() => 
    createEventFormData(event)
  );
  const isRecurringInstance = Boolean(
    event?.is_recurring_instance && event.recurrence_parent_id && event.recurrence_instance_date
  );
  const targetEventId = isRecurringInstance ? event?.recurrence_parent_id : event?.id;
  const occurrenceDate = isRecurringInstance ? event?.recurrence_instance_date : undefined;

  // Reset form when dialog opens with a different event
  useEffect(() => {
    if (open && event) {
      setFormData(createEventFormData(event));
      setShowDeleteDialog(false);
      setEditScope(isRecurringInstance ? 'single' : 'series');
    }
  }, [open, event, isRecurringInstance]);

  const handleFormChange = useCallback((data: EventFormData) => {
    setFormData(data);
  }, []);

  const handleSave = async () => {
    if (!event || !targetEventId || !isEventFormValid(formData)) return;
    
    setIsLoading(true);
    try {
      const recurrence = buildRecurrenceFromForm(formData);
      const shouldApplySingleOccurrence = isRecurringInstance && editScope === 'single';

      const response = await fetch('/api/events', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: targetEventId,
          editScope: shouldApplySingleOccurrence ? 'single' : 'series',
          occurrenceDate: shouldApplySingleOccurrence ? occurrenceDate : undefined,
          updates: {
            title: formData.title,
            event_date: formData.eventDate,
            end_date: formData.endDate || formData.eventDate,
            event_time: formData.eventTime || null,
            end_time: formData.endTime || null,
            is_all_day: formData.isAllDay,
            recurrence_rule: shouldApplySingleOccurrence ? null : recurrence.recurrenceRule,
            recurrence_end: shouldApplySingleOccurrence ? null : recurrence.recurrenceEnd,
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
    if (!event || !targetEventId) return;
    
    setIsDeleting(true);
    try {
      const params = new URLSearchParams({ id: targetEventId });
      if (isRecurringInstance) {
        params.set('scope', editScope);
        if (editScope === 'single' && occurrenceDate) {
          params.set('occurrenceDate', occurrenceDate);
        }
      }

      const response = await fetch(`/api/events?${params.toString()}`, {
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
            {isRecurringInstance && (
              <div className="mb-4 space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {t('calendar.editScope')}
                </label>
                <Select
                  value={editScope}
                  onValueChange={(value) => setEditScope(value as RecurrenceEditScope)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">{t('calendar.scopeThisEvent')}</SelectItem>
                    <SelectItem value="series">{t('calendar.scopeEntireSeries')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <EventForm
              data={formData}
              onChange={handleFormChange}
              availableFamilyMembers={availableFamilyMembers}
              disableRecurrence={isRecurringInstance && editScope === 'single'}
              disableDateEditing={isRecurringInstance && editScope === 'series'}
            />

            {isRecurringInstance && editScope === 'series' && (
              <p className="mt-2 text-xs text-muted-foreground">
                Date changes are disabled here to avoid moving the whole series unexpectedly.
              </p>
            )}
            
            {/* Reminder Section - only in edit mode */}
            {!isRecurringInstance && (
              <div className="mt-4">
                <EventReminderSection
                  eventId={event.id}
                  eventTitle={formData.title || event.title}
                  eventDate={formData.eventDate || event.event_date}
                  eventTime={formData.eventTime || event.event_time || ''}
                />
              </div>
            )}
          </div>

          <DialogFooter className="flex-shrink-0 flex-col sm:flex-row gap-2 border-t pt-4">
            {/* Delete Button - Opens confirmation dialog */}
            <Button
              variant="destructiveOutline"
              className="min-h-[44px]"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t('common.delete')}
            </Button>

            <div className="flex-1" />

            {/* Save Button */}
            <Button
              variant="brand"
              onClick={handleSave}
              disabled={isLoading || !isEventFormValid(formData)}
              className="min-h-[44px]"
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
