'use client';

import { useMemo, useState, useEffect } from 'react';
import { format, parseISO, isBefore, startOfDay, addDays } from 'date-fns';
import { Clock, Pencil, Trash2, Loader2, ChevronDown, ChevronUp, Hand } from 'lucide-react';
import { motion, useMotionValue, useTransform, animate, PanInfo, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn, formatTime } from '@/lib/utils';
import type { CalendarEvent } from '@/types/calendar';
import { EditEventDialog } from './edit-event-dialog';
import { getMemberColor } from '@/lib/utils/ui-helpers';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/utils';
import { useSelectedMembers } from '@/stores/filter-store';
import { useFamilyData } from '@/stores/family-store';
import { EventDetailDialog } from './event-detail-dialog';

interface UpcomingEventsProps {
  events: CalendarEvent[];
  pageSize?: number;
  maxEvents?: number;
  onEventsChanged?: () => void;
  hideHeader?: boolean;
  excludeTodayAndTomorrow?: boolean;
}

interface ProcessedEvent extends CalendarEvent {
  dateLabel: string;
}

interface SwipeableEventCardProps {
  event: ProcessedEvent;
  onSelect: (event: CalendarEvent) => void;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (eventId: string) => void;
  isDeleting: boolean;
  showSwipeHint?: boolean;
  onHintDismiss?: () => void;
}



function SwipeableEventCard({ event, onSelect, onEdit, onDelete, isDeleting, showSwipeHint, onHintDismiss }: SwipeableEventCardProps) {
  const { memberColors } = useFamilyData();
  const { t } = useTranslation();
  const x = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);
  const [hintVisible, setHintVisible] = useState(showSwipeHint);

  // Auto-dismiss hint after 5 seconds
  useEffect(() => {
    if (hintVisible) {
      const timer = setTimeout(() => {
        setHintVisible(false);
        onHintDismiss?.();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [hintVisible, onHintDismiss]);
  
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
        className="relative bg-muted/50 hover:bg-muted transition-colors cursor-grab active:cursor-grabbing"
        onClick={() => !isDragging && x.get() === 0 && onSelect(event)}
      >
        <div className="flex items-start gap-3 p-3">
          <div className="flex-shrink-0 w-20 text-right">
            <span className="text-sm font-semibold text-foreground">
              {event.is_all_day ? t('calendar.allDay') : formatTime(event.event_time)}
            </span>
            <p className="text-xs text-muted-foreground">{event.dateLabel}</p>
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {event.title}
            </p>
            {event.family_member && (
              <div className="mt-1">
                <span
                  className={cn(
                    'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-white',
                    getMemberColor(event.family_member, memberColors?.get(event.family_member))
                  )}
                >
                  {event.family_member}
                </span>
              </div>
            )}
          </div>

          <div className="flex-shrink-0 flex items-center text-muted-foreground/30">
            <div className="w-1 h-8 bg-border rounded-full" />
          </div>
        </div>

        {/* Swipe Hint Overlay */}
        {hintVisible && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-end pr-4 bg-gradient-to-l from-emerald-50/90 via-emerald-50/50 to-transparent dark:from-emerald-950/90 dark:via-emerald-950/50 pointer-events-none"
          >
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <Hand className="w-4 h-4 animate-pulse" />
              <span className="text-xs font-medium">{t('dashboard.swipeHint')}</span>
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

const SWIPE_HINT_KEY = 'familybutler_swipe_hint_dismissed';

export function UpcomingEvents({ 
  events,
  pageSize = 5, 
  maxEvents = 20, 
  onEventsChanged,
  hideHeader = false,
  excludeTodayAndTomorrow = false,
}: UpcomingEventsProps) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [swipeHintDismissed, setSwipeHintDismissed] = useState(() => {
    // Check localStorage on initial render
    if (typeof window !== 'undefined') {
      return localStorage.getItem(SWIPE_HINT_KEY) === 'true';
    }
    return false;
  });
  
  // Use global filter store
  const selectedMembers = useSelectedMembers();
  
  const { t, i18n } = useTranslation();

  const handleDismissSwipeHint = () => {
    setSwipeHintDismissed(true);
    localStorage.setItem(SWIPE_HINT_KEY, 'true');
  };

  const handleEditClick = (event: CalendarEvent) => {
    setEditingEvent(event);
    setEditDialogOpen(true);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setDetailOpen(true);
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

  // Filter, sort, and process upcoming events with date labels
  const allUpcomingEvents = useMemo(() => {
    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);
    const todayStr = format(today, 'yyyy-MM-dd');
    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
    
    return events
      .filter((event) => {
        const eventStart = parseISO(event.event_date);
        const eventEnd = parseISO(event.end_date || event.event_date);
        const normalizedEnd = eventEnd >= eventStart ? eventEnd : eventStart;
        const isUpcoming = !isBefore(normalizedEnd, today);

        if (!isUpcoming) {
          return false;
        }

        if (excludeTodayAndTomorrow) {
          const endDate = event.end_date || event.event_date;
          const overlapsTodayOrTomorrow =
            (event.event_date <= todayStr && endDate >= todayStr) ||
            (event.event_date <= tomorrowStr && endDate >= tomorrowStr);
          if (overlapsTodayOrTomorrow) {
            return false;
          }
        }
        
        // Apply global family member filter
        if (selectedMembers.length > 0) {
          const matchesMember = !event.family_member || selectedMembers.includes(event.family_member);
          return matchesMember;
        }
        
        return true;
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
        const labelDate =
          event.event_date < todayStr && (event.end_date || event.event_date) >= todayStr
            ? todayStr
            : event.event_date;

        if (labelDate === todayStr) {
          dateLabel = t('calendar.today');
        } else if (labelDate === tomorrowStr) {
          dateLabel = t('calendar.tomorrow');
        } else {
          // Format based on current language
          const formatStr = i18n.language === 'de' ? 'dd.MM.yyyy' : 'EEE, MMM d';
          dateLabel = formatDate(parseISO(labelDate), formatStr);
        }
        return { ...event, dateLabel };
      });
  }, [events, maxEvents, selectedMembers, i18n.language, t, excludeTodayAndTomorrow]);

  const visibleEvents = useMemo(() => {
    return allUpcomingEvents.slice(0, visibleCount);
  }, [allUpcomingEvents, visibleCount]);

  // Group events by date for section headers (Google Calendar style)
  const groupedEvents = useMemo(() => {
    const groups: { dateLabel: string; events: ProcessedEvent[] }[] = [];
    let currentGroup: { dateLabel: string; events: ProcessedEvent[] } | null = null;

    for (const event of visibleEvents) {
      if (!currentGroup || currentGroup.dateLabel !== event.dateLabel) {
        currentGroup = { dateLabel: event.dateLabel, events: [] };
        groups.push(currentGroup);
      }
      currentGroup.events.push(event);
    }

    return groups;
  }, [visibleEvents]);

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
        <h3 className="text-sm font-semibold text-foreground">
          {excludeTodayAndTomorrow ? t('dashboard.laterEvents') : t('calendar.upcomingEvents')}
        </h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
            <Clock className="w-6 h-6 text-muted-foreground/50" />
          </div>
          <p className="text-sm text-muted-foreground">
            {excludeTodayAndTomorrow ? t('dashboard.noLaterEvents') : t('calendar.noEvents')}
          </p>
          {!excludeTodayAndTomorrow && (
            <p className="text-xs text-muted-foreground/80 mt-1">{t('calendar.scheduleClear')}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {!hideHeader && (
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              {excludeTodayAndTomorrow ? t('dashboard.laterEvents') : t('calendar.upcomingEvents')}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({totalEvents})
              </span>
            </h3>
            
            {/* Note: Filter button has been moved to Navbar */}
          </div>
        )}
        
        {/* No results with filter */}
        {allUpcomingEvents.length === 0 && hasActiveFilters && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <p className="text-sm text-gray-500">{t('calendar.noEventsFilter')}</p>
            {/* We don't show clear button here as the filter is in navbar */}
          </div>
        )}

        {/* Event list with date section headers (Google Calendar style) */}
        <div className="space-y-3">
          {groupedEvents.map((group, groupIndex) => (
            <div key={group.dateLabel}>
              <div className="mb-1 px-1">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.dateLabel}
                </h4>
              </div>

              {/* Events for this date */}
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {group.events.map((event, eventIndex) => {
                    // Show swipe hint only on first card if not dismissed
                    const isFirstCard = groupIndex === 0 && eventIndex === 0;
                    const showHint = isFirstCard && !swipeHintDismissed;
                    
                    return (
                      <SwipeableEventCard
                        key={event.id}
                        event={event}
                        onSelect={handleSelectEvent}
                        onEdit={handleEditClick}
                        onDelete={handleDelete}
                        isDeleting={deletingEventId === event.id}
                        showSwipeHint={showHint}
                        onHintDismiss={handleDismissSwipeHint}
                      />
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination controls */}
        {totalEvents > 0 && (
          <div className="flex flex-col items-center gap-2">
            {canShowMore && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShowMore}
                className="w-full text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <ChevronDown className="w-4 h-4 mr-1" />
                {t('calendar.showMore', { count: Math.min(pageSize, remainingEvents) })}
                <span className="ml-1 text-muted-foreground/60">
                  ({t('calendar.remaining', { count: remainingEvents })})
                </span>
              </Button>
            )}
            
            {canShowLess && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShowLess}
                className="text-muted-foreground/80 hover:text-muted-foreground"
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

      <EventDetailDialog
        event={selectedEvent}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={(event) => {
          setDetailOpen(false);
          handleEditClick(event);
        }}
      />

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
