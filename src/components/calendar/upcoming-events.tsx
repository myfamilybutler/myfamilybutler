'use client';

import { useMemo, useState } from 'react';
import { format, parseISO, isAfter, startOfDay, addDays } from 'date-fns';
import { Clock, Pencil, Trash2, Loader2, ChevronDown, ChevronUp, Filter, X } from 'lucide-react';
import { motion, useMotionValue, useTransform, animate, PanInfo, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn, formatTime } from '@/lib/utils';
import type { CalendarEvent } from '@/types/calendar';
import { EditEventDialog } from './edit-event-dialog';
import { getMemberColor } from '@/lib/utils/ui-helpers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/date-utils';

interface UpcomingEventsProps {
  events: CalendarEvent[];
  /** Family members from family_members table - single source of truth */
  familyMembers?: string[];
  pageSize?: number;
  maxEvents?: number;
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

function SwipeableEventCard({ event, onEdit, onDelete, isDeleting }: SwipeableEventCardProps) {
  const { t } = useTranslation();
  const x = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);
  
  const actionsOpacity = useTransform(x, [-120, -60, 0], [1, 0.5, 0]);
  const actionsScale = useTransform(x, [-120, -60, 0], [1, 0.9, 0.8]);
  
  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const threshold = -60;
    if (info.offset.x < threshold) {
      animate(x, -120, { type: 'spring', stiffness: 500, damping: 30 });
    } else {
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
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="relative overflow-hidden rounded-xl"
    >
      <motion.div 
        className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2"
        style={{ opacity: actionsOpacity, scale: actionsScale }}
      >
        <button
          onClick={handleEditClick}
          className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500 text-white shadow-lg active:scale-95 transition-transform"
          aria-label={t('common.edit')}
        >
          <Pencil className="w-5 h-5" />
        </button>
        <button
          onClick={handleDeleteClick}
          disabled={isDeleting}
          className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-500 text-white shadow-lg active:scale-95 transition-transform disabled:opacity-50"
          aria-label={t('common.delete')}
        >
          {isDeleting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Trash2 className="w-5 h-5" />
          )}
        </button>
      </motion.div>

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
          <div className="flex-shrink-0 w-16 text-right">
            <span className="text-sm font-semibold text-gray-900">
              {event.is_all_day ? t('calendar.allDay') : formatTime(event.event_time)}
            </span>
            <p className="text-xs text-gray-500">{event.dateLabel}</p>
          </div>
          
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

          <div className="flex-shrink-0 flex items-center text-gray-300">
            <div className="w-1 h-8 bg-gray-200 rounded-full" />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function UpcomingEvents({ 
  events,
  familyMembers = [],
  pageSize = 5, 
  maxEvents = 20, 
  onEventsChanged 
}: UpcomingEventsProps) {
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const { t, i18n } = useTranslation();

  // Family members from props (single source of truth from family_members table)
  // No longer extracting from events

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

      toast.success(t('calendar.eventDeleted'));
      onEventsChanged?.();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error(t('calendar.deleteError'));
    } finally {
      setDeletingEventId(null);
    }
  };

  const toggleMember = (member: string) => {
    setSelectedMembers(prev => 
      prev.includes(member) 
        ? prev.filter(m => m !== member)
        : [...prev, member]
    );
  };

  const clearFilters = () => {
    setSelectedMembers([]);
    setFilterOpen(false);
  };

  // Filter, sort, and process upcoming events with date labels
  const allUpcomingEvents = useMemo(() => {
    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);
    const todayStr = format(today, 'yyyy-MM-dd');
    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
    
    return events
      .filter((event) => {
        const eventDate = parseISO(event.event_date);
        const isUpcoming = isAfter(eventDate, today) || event.event_date === todayStr;
        
        // Apply family member filter
        if (selectedMembers.length > 0) {
          const matchesMember = !event.family_member || selectedMembers.includes(event.family_member);
          return isUpcoming && matchesMember;
        }
        
        return isUpcoming;
      })
      .sort((a, b) => {
        const dateCompare = a.event_date.localeCompare(b.event_date);
        if (dateCompare !== 0) return dateCompare;
        
        if (a.is_all_day && !b.is_all_day) return -1;
        if (!a.is_all_day && b.is_all_day) return 1;
        if (a.event_time && b.event_time) {
          return a.event_time.localeCompare(b.event_time);
        }
        return 0;
      })
      .slice(0, maxEvents)
      .map((event): ProcessedEvent => {
        let dateLabel: string;
        if (event.event_date === todayStr) {
          dateLabel = t('calendar.today');
        } else if (event.event_date === tomorrowStr) {
          dateLabel = t('calendar.tomorrow');
        } else {
          dateLabel = formatDate(parseISO(event.event_date), 'EEE, MMM d');
        }
        return { ...event, dateLabel };
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, maxEvents, selectedMembers, i18n.language, t]);

  const visibleEvents = useMemo(() => {
    return allUpcomingEvents.slice(0, visibleCount);
  }, [allUpcomingEvents, visibleCount]);

  const totalEvents = allUpcomingEvents.length;
  const remainingEvents = totalEvents - visibleCount;
  const canShowMore = remainingEvents > 0;
  const canShowLess = visibleCount > pageSize;
  const hasActiveFilters = selectedMembers.length > 0;

  const handleShowMore = () => {
    setVisibleCount(prev => Math.min(prev + pageSize, maxEvents));
  };

  const handleShowLess = () => {
    setVisibleCount(pageSize);
  };

  if (allUpcomingEvents.length === 0 && !hasActiveFilters) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">{t('calendar.upcomingEvents')}</h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
            <Clock className="w-6 h-6 text-gray-300" />
          </div>
          <p className="text-sm text-gray-500">{t('calendar.noEvents')}</p>
          <p className="text-xs text-gray-400 mt-1">Your schedule is clear!</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            {t('calendar.upcomingEvents')}
            <span className="ml-2 text-xs font-normal text-gray-400">
              ({totalEvents})
            </span>
          </h3>
          
          {/* Filter button */}
          {familyMembers.length > 0 && (
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 gap-1.5",
                    hasActiveFilters && "text-emerald-600"
                  )}
                  aria-label={t('common.filters')}
                >
                  <Filter className="w-4 h-4" />
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                      {selectedMembers.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="end">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      {t('calendar.filterByMember')}
                    </span>
                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        {t('calendar.clear')}
                      </button>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {familyMembers.map((member) => {
                      const isSelected = selectedMembers.includes(member);
                      const styles = getMemberStyles(member);
                      
                      return (
                        <button
                          key={member}
                          onClick={() => toggleMember(member)}
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
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
        
        {/* No results with filter */}
        {allUpcomingEvents.length === 0 && hasActiveFilters && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <p className="text-sm text-gray-500">{t('calendar.noEventsFilter')}</p>
            <button 
              onClick={clearFilters}
              className="text-xs text-emerald-600 hover:text-emerald-700 mt-1"
            >
              {t('calendar.clearFilters')}
            </button>
          </div>
        )}

        {/* Event list with animations */}
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {visibleEvents.map((event) => (
              <SwipeableEventCard
                key={event.id}
                event={event}
                onEdit={handleEditClick}
                onDelete={handleDelete}
                isDeleting={deletingEventId === event.id}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Pagination controls */}
        {totalEvents > 0 && (
          <div className="flex flex-col items-center gap-2 pt-2">
            {canShowMore && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShowMore}
                className="w-full text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <ChevronDown className="w-4 h-4 mr-1" />
                {t('calendar.showMore', { count: Math.min(pageSize, remainingEvents) })}
                <span className="ml-1 text-gray-400">
                  ({t('calendar.remaining', { count: remainingEvents })})
                </span>
              </Button>
            )}
            
            {canShowLess && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShowLess}
                className="text-gray-400 hover:text-gray-600"
              >
                <ChevronUp className="w-4 h-4 mr-1" />
                {t('calendar.showLess')}
              </Button>
            )}

            {visibleCount >= maxEvents && totalEvents >= maxEvents && (
              <p className="text-xs text-gray-400 text-center">
                {t('calendar.maxEvents', { count: maxEvents })}
              </p>
            )}
          </div>
        )}
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
