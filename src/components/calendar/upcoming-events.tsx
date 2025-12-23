'use client';

import { useMemo, useState } from 'react';
import { format, parseISO, isAfter, startOfDay, addDays } from 'date-fns';
import { Clock, Pencil, Trash2, Loader2 } from 'lucide-react';
import { motion, useMotionValue, useTransform, animate, PanInfo } from 'framer-motion';
import { toast } from 'sonner';
import { cn, formatTime } from '@/lib/utils';
import type { CalendarEvent } from '@/types/calendar';
import { EditEventDialog } from './edit-event-dialog';
import { getMemberColor } from '@/lib/utils/ui-helpers';

interface UpcomingEventsProps {
  events: CalendarEvent[];
  maxItems?: number;
  onEventsChanged?: () => void;
}

interface ProcessedEvent extends CalendarEvent {
  dateLabel: string;
}

interface SwipeableEventCardProps {
  event: ProcessedEvent;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (eventId: string) => void;
  isDeleting: boolean;
}

function SwipeableEventCard({ event, onEdit, onDelete, isDeleting }: SwipeableEventCardProps) {
  const x = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);
  
  // Transform x position to opacity for action buttons
  const actionsOpacity = useTransform(x, [-120, -60, 0], [1, 0.5, 0]);
  const actionsScale = useTransform(x, [-120, -60, 0], [1, 0.9, 0.8]);
  
  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const threshold = -60;
    if (info.offset.x < threshold) {
      // Snap to reveal actions
      animate(x, -120, { type: 'spring', stiffness: 500, damping: 30 });
    } else {
      // Snap back
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 30 });
    }
    setIsDragging(false);
  };

  const handleClose = () => {
    animate(x, 0, { type: 'spring', stiffness: 500, damping: 30 });
  };

  const handleEditClick = () => {
    handleClose();
    onEdit(event);
  };

  const handleDeleteClick = () => {
    onDelete(event.id);
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Action buttons (revealed on swipe) */}
      <motion.div 
        className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2"
        style={{ opacity: actionsOpacity, scale: actionsScale }}
      >
        <button
          onClick={handleEditClick}
          className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500 text-white shadow-lg active:scale-95 transition-transform"
        >
          <Pencil className="w-5 h-5" />
        </button>
        <button
          onClick={handleDeleteClick}
          disabled={isDeleting}
          className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-500 text-white shadow-lg active:scale-95 transition-transform disabled:opacity-50"
        >
          {isDeleting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Trash2 className="w-5 h-5" />
          )}
        </button>
      </motion.div>

      {/* Swipeable card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -120, right: 0 }}
        dragElastic={0.1}
        dragDirectionLock
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative bg-gray-50/80 hover:bg-gray-100/80 transition-colors cursor-grab active:cursor-grabbing"
        onClick={() => !isDragging && x.get() === 0 && onEdit(event)}
      >
        <div className="flex items-start gap-3 p-3">
          {/* Time column */}
          <div className="flex-shrink-0 w-16 text-right">
            <span className="text-sm font-semibold text-gray-900">
              {event.is_all_day ? 'All day' : formatTime(event.event_time)}
            </span>
            <p className="text-xs text-gray-500">{event.dateLabel}</p>
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {event.title}
            </p>
            {event.family_member && (
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    getMemberColor(event.family_member)
                  )}
                />
                <span className="text-xs text-gray-500">
                  {event.family_member}
                </span>
              </div>
            )}
          </div>

          {/* Swipe hint indicator */}
          <div className="flex-shrink-0 flex items-center text-gray-300">
            <div className="w-1 h-8 bg-gray-200 rounded-full" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function UpcomingEvents({ events, maxItems = 5, onEventsChanged }: UpcomingEventsProps) {
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);

  const handleEditClick = (event: CalendarEvent) => {
    setEditingEvent(event);
    setEditDialogOpen(true);
  };

  const handleDelete = async (eventId: string) => {
    setDeletingEventId(eventId);
    try {
      const response = await fetch(`/api/events?id=${eventId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete event');
      }

      toast.success('Event deleted');
      onEventsChanged?.();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    } finally {
      setDeletingEventId(null);
    }
  };

  // Filter, sort, and process upcoming events with date labels
  const upcomingEvents = useMemo(() => {
    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);
    const todayStr = format(today, 'yyyy-MM-dd');
    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
    
    return events
      .filter((event) => {
        const eventDate = parseISO(event.event_date);
        return isAfter(eventDate, today) || event.event_date === todayStr;
      })
      .sort((a, b) => {
        // Sort by date first
        const dateCompare = a.event_date.localeCompare(b.event_date);
        if (dateCompare !== 0) return dateCompare;
        
        // Then by time (all-day events first)
        if (a.is_all_day && !b.is_all_day) return -1;
        if (!a.is_all_day && b.is_all_day) return 1;
        if (a.event_time && b.event_time) {
          return a.event_time.localeCompare(b.event_time);
        }
        return 0;
      })
      .slice(0, maxItems)
      .map((event): ProcessedEvent => {
        let dateLabel: string;
        if (event.event_date === todayStr) {
          dateLabel = 'Today';
        } else if (event.event_date === tomorrowStr) {
          dateLabel = 'Tomorrow';
        } else {
          dateLabel = format(parseISO(event.event_date), 'EEE, MMM d');
        }
        return { ...event, dateLabel };
      });
  }, [events, maxItems]);

  if (upcomingEvents.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Upcoming</h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
            <Clock className="w-6 h-6 text-gray-300" />
          </div>
          <p className="text-sm text-gray-500">No upcoming events</p>
          <p className="text-xs text-gray-400 mt-1">Your schedule is clear!</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Upcoming</h3>
          <span className="text-xs text-gray-400">← Swipe to edit/delete</span>
        </div>
        <div className="space-y-2">
          {upcomingEvents.map((event) => (
            <SwipeableEventCard
              key={event.id}
              event={event}
              onEdit={handleEditClick}
              onDelete={handleDelete}
              isDeleting={deletingEventId === event.id}
            />
          ))}
        </div>
      </div>

      <EditEventDialog
        event={editingEvent}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onEventUpdated={onEventsChanged}
        onEventDeleted={onEventsChanged}
      />
    </>
  );
}
