'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, addHours, addDays, setHours, setMinutes } from 'date-fns';
import { Pencil, Trash2, Bell, Clock, MapPin, User, Loader2, X } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { CalendarEvent } from '@/types/calendar';

interface EditEventDialogProps {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventUpdated?: () => void;
  onEventDeleted?: () => void;
  /** Optional list of available family members for badge selection */
  availableFamilyMembers?: string[];
}

// Color mapping for family members
const MEMBER_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  default: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700' },
  mom: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700' },
  dad: { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700' },
  kids: { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700' },
};

function getMemberStyles(member?: string) {
  if (!member) return MEMBER_COLORS.default;
  const lowerMember = member.toLowerCase();
  return MEMBER_COLORS[lowerMember] || MEMBER_COLORS.default;
}

export function EditEventDialog({
  event,
  open,
  onOpenChange,
  onEventUpdated,
  onEventDeleted,
  availableFamilyMembers = [],
}: EditEventDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReminderForm, setShowReminderForm] = useState(false);
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
  const [customMember, setCustomMember] = useState('');
  
  // Reminder state
  const [reminderType, setReminderType] = useState<'1h' | '1d' | 'custom'>('1h');
  const [customReminderDate, setCustomReminderDate] = useState('');
  const [customReminderTime, setCustomReminderTime] = useState('');

  // Fetch family members if not provided
  useEffect(() => {
    if (open && availableFamilyMembers.length === 0) {
      const fetchFamilyMembers = async () => {
        try {
          const response = await fetch('/api/family');
          const data = await response.json();
          if (data.success && data.data.familyMembers) {
            setFetchedMembers(data.data.familyMembers.map((m: { name: string }) => m.name));
          }
        } catch {
          // Silently fail - not critical
        }
      };
      fetchFamilyMembers();
    }
  }, [open, availableFamilyMembers.length]);

  // Combine provided and fetched members
  const allMembers = useMemo(() => {
    const combined = new Set([...availableFamilyMembers, ...fetchedMembers]);
    // Add current event's family member if it exists
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
      setShowReminderForm(false);
      setCustomMember('');
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

      toast.success('Event updated successfully');
      onEventUpdated?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('Failed to update event');
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

      toast.success('Event deleted');
      onEventDeleted?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddReminder = async () => {
    if (!event) return;
    
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
        if (!customReminderDate || !customReminderTime) {
          toast.error('Please select a date and time for the reminder');
          return;
        }
        const [hours, minutes] = customReminderTime.split(':').map(Number);
        remindAt = setMinutes(setHours(new Date(customReminderDate), hours), minutes);
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
          eventId: event.id,
          eventTitle: title,
          remindAt: remindAt.toISOString(),
        }),
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create reminder');
      }

      toast.success(`Reminder set for ${format(remindAt, 'PPp')}`);
      setShowReminderForm(false);
    } catch (error) {
      console.error('Error creating reminder:', error);
      toast.error('Failed to create reminder');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectMember = (member: string) => {
    setFamilyMember(prev => prev === member ? '' : member);
  };

  const handleAddCustomMember = () => {
    if (customMember.trim()) {
      setFamilyMember(customMember.trim());
      setCustomMember('');
    }
  };

  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-emerald-600" />
            Edit Event
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4 px-1">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="eventDate">Date</Label>
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
              All day event
            </Label>
          </div>

          {/* Time (only if not all day) */}
          {!isAllDay && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="eventTime" className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Start
                </Label>
                <Input
                  id="eventTime"
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Family Member - Badge Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <User className="w-3 h-3" /> Family Member
            </Label>
            
            {/* Member badges */}
            {allMembers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {allMembers.map((member) => {
                  const isSelected = familyMember === member;
                  const styles = getMemberStyles(member);
                  
                  return (
                    <button
                      key={member}
                      type="button"
                      onClick={() => handleSelectMember(member)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all',
                        isSelected
                          ? `${styles.bg} ${styles.border} ${styles.text}`
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      )}
                    >
                      {member}
                      {isSelected && (
                        <X className="w-3 h-3 ml-1.5 inline-block" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            
            {/* Custom member input */}
            <div className="flex gap-2">
              <Input
                placeholder="Or type a name..."
                value={customMember}
                onChange={(e) => setCustomMember(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomMember();
                  }
                }}
                className="flex-1"
              />
              {customMember && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCustomMember}
                >
                  Add
                </Button>
              )}
            </div>
            
            {/* Current selection indicator */}
            {familyMember && !allMembers.includes(familyMember) && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Selected:</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                  {familyMember}
                </span>
              </div>
            )}
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Location
            </Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Event location"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional notes"
            />
          </div>

          {/* Reminder Section */}
          <div className="border-t border-gray-200 pt-4">
            {!showReminderForm ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowReminderForm(true)}
              >
                <Bell className="w-4 h-4 mr-2" />
                Add Reminder
              </Button>
            ) : (
              <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                <Label>Remind me</Label>
                <Select
                  value={reminderType}
                  onValueChange={(v) => setReminderType(v as '1h' | '1d' | 'custom')}
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
                    <Input
                      type="date"
                      value={customReminderDate}
                      onChange={(e) => setCustomReminderDate(e.target.value)}
                    />
                    <Input
                      type="time"
                      value={customReminderTime}
                      onChange={(e) => setCustomReminderTime(e.target.value)}
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
                    onClick={() => setShowReminderForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
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
              Delete
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-600">Delete this event?</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yes'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
              >
                No
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
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
