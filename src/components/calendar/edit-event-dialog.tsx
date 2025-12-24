'use client';

/**
 * Edit Event Dialog
 * 
 * Dialog for editing calendar events with form fields for all event properties.
 * Uses extracted subcomponents for better organization.
 */

import { useState, useEffect, useMemo } from 'react';
import { Pencil, Trash2, Clock, MapPin, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CalendarEvent } from '@/types/calendar';
import { EventReminderSection } from './event-reminder-section';
import { FamilyMemberSelector } from './family-member-selector';

import { useTranslation } from 'react-i18next';

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [fetchedMembers, setFetchedMembers] = useState<string[]>([]);
  
  // Form state
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [familyMember, setFamilyMember] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  // Fetch family members if not provided
  useEffect(() => {
    if (open && availableFamilyMembers.length === 0) {
      let cancelled = false;
      
      const fetchFamilyMembers = async () => {
        try {
          const response = await fetch('/api/family');
          const data = await response.json();
          
          if (cancelled) return;
          
          if (data.success && data.data) {
            const allNames: string[] = [];
            
            // Add users with accounts (use display_name or phone_number)
            if (data.data.users) {
              for (const user of data.data.users) {
                const name = user.display_name || user.phone_number;
                if (name) allNames.push(name);
              }
            }
            
            // Add family members without accounts
            if (data.data.familyMembers) {
              for (const member of data.data.familyMembers) {
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
  }, [open, availableFamilyMembers.length]);

  // Combine provided and fetched members
  const allMembers = useMemo(() => {
    const combined = new Set([...availableFamilyMembers, ...fetchedMembers]);
    if (event?.family_member) {
      combined.add(event.family_member);
    }
    return Array.from(combined).sort();
  }, [availableFamilyMembers, fetchedMembers, event?.family_member]);

  // Initialize form when event changes or dialog opens
  useEffect(() => {
    if (open && event) {
      setTitle(event.title);
      setEventDate(event.event_date);
      setEventTime(event.event_time || '');
      setEndTime(event.end_time || '');
      setIsAllDay(event.is_all_day);
      setFamilyMember(event.family_member || '');
      setLocation(event.location || '');
      setDescription(event.description || '');
      setShowDeleteConfirm(false);
    }
  }, [open, event]);

  const handleSave = async () => {
    if (!event) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/events', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          updates: {
            title,
            event_date: eventDate,
            event_time: eventTime || null,
            end_time: endTime || null,
            is_all_day: isAllDay,
            family_member: familyMember || null,
            location: location || null,
            description: description || null,
          },
        }),
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update event');
      }

      toast.success(t('calendar.eventUpdated'));
      onEventUpdated?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating event:', error);
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
      onEventDeleted?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error(t('calendar.deleteError'));
    } finally {
      setIsDeleting(false);
    }
  };

  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-emerald-600" />
            {t('calendar.editEvent')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4 px-1">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">{t('calendar.title')}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('calendar.eventTitle')}
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="eventDate">{t('calendar.date')}</Label>
            <Input
              id="eventDate"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isAllDay"
              checked={isAllDay}
              onChange={(e) => setIsAllDay(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="isAllDay" className="cursor-pointer">
              {t('calendar.allDayEvent')}
            </Label>
          </div>

          {/* Time (only if not all day) */}
          {!isAllDay && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="eventTime" className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {t('calendar.start')}
                </Label>
                <Input
                  id="eventTime"
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">{t('calendar.end')}</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Family Member Selection */}
          <FamilyMemberSelector
            value={familyMember}
            onChange={setFamilyMember}
            availableMembers={allMembers}
          />

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {t('calendar.location')}
            </Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t('calendar.eventLocation')}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t('calendar.description')}</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('calendar.additionalNotes')}
            />
          </div>

          {/* Reminder Section */}
          <EventReminderSection
            eventId={event.id}
            eventTitle={title}
            eventDate={eventDate}
            eventTime={eventTime}
          />
        </div>

        <DialogFooter className="flex-shrink-0 flex-col sm:flex-row gap-2 border-t pt-4">
          {/* Delete Section */}
          {!showDeleteConfirm ? (
            <Button
              variant="ghost"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              {t('common.delete')}
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-600">{t('common.deleteConfirm')}</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.yes')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
              >
                {t('common.no')}
              </Button>
            </div>
          )}

          <div className="flex-1" />

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={isLoading || !title || !eventDate}
            className="bg-emerald-600 hover:bg-emerald-700"
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
  );
}
