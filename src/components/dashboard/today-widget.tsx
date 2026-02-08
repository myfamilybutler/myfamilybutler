'use client';

/**
 * Today Widget Component
 * 
 * Shows today's and tomorrow's events at a glance for busy mothers.
 * Designed for quick scanning - no interaction required to see what's happening.
 */

import { useMemo } from 'react';
import { format, parseISO, addDays, startOfDay } from 'date-fns';
import { MapPin, User, CalendarDays, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, formatDate, formatTime } from '@/lib/utils';
import type { CalendarEvent } from '@/types/calendar';
import { useFamilyData } from '@/stores/family-store';
import { DEFAULT_MEMBER_COLOR } from '@/lib/utils/ui-helpers';
import { useTranslation } from 'react-i18next';

interface TodayWidgetProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onAddEvent?: () => void;
}

interface DaySection {
  label: string;
  date: Date;
  events: CalendarEvent[];
  isToday: boolean;
}

export function TodayWidget({ events, onEventClick, onAddEvent }: TodayWidgetProps) {
  const { t } = useTranslation();
  const { memberColors } = useFamilyData();

  const { todaySection, tomorrowSection } = useMemo(() => {
    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);
    const todayStr = format(today, 'yyyy-MM-dd');
    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');

    const todayEvents = events
      .filter((e) => {
        const endDate = e.end_date || e.event_date;
        return e.event_date <= todayStr && endDate >= todayStr;
      })
      .sort((a, b) => {
        if (a.is_all_day && !b.is_all_day) return -1;
        if (!a.is_all_day && b.is_all_day) return 1;
        return (a.event_time || '').localeCompare(b.event_time || '');
      });

    const tomorrowEvents = events
      .filter((e) => {
        const endDate = e.end_date || e.event_date;
        return e.event_date <= tomorrowStr && endDate >= tomorrowStr;
      })
      .sort((a, b) => {
        if (a.is_all_day && !b.is_all_day) return -1;
        if (!a.is_all_day && b.is_all_day) return 1;
        return (a.event_time || '').localeCompare(b.event_time || '');
      });

    return {
      todaySection: {
        label: t('calendar.today'),
        date: today,
        events: todayEvents,
        isToday: true,
      },
      tomorrowSection: {
        label: t('calendar.tomorrow'),
        date: tomorrow,
        events: tomorrowEvents,
        isToday: false,
      },

    };
  }, [events, t]);

  // Show only if there are events today or tomorrow
  if (todaySection.events.length === 0 && tomorrowSection.events.length === 0) {
    return null;
  }

  return (
    <Card className="border-border shadow-sm overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            {t('dashboard.todayTomorrow')}
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 text-xs text-primary hover:text-primary hover:bg-primary/10"
            onClick={onAddEvent}
          >
            + {t('calendar.newEvent')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Today Section */}
        <DaySectionView 
          section={todaySection} 
          memberColors={memberColors}
          onEventClick={onEventClick}
          t={t}
        />

        {/* Tomorrow Section - only if has events */}
        {tomorrowSection.events.length > 0 && (
          <>
            <div className="border-t border-border" />
            <DaySectionView 
              section={tomorrowSection}
              memberColors={memberColors}
              onEventClick={onEventClick}
              t={t}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface DaySectionViewProps {
  section: DaySection;
  memberColors: Map<string, string>;
  onEventClick?: (event: CalendarEvent) => void;
  t: (key: string) => string;
}

function DaySectionView({ section, memberColors, onEventClick, t }: DaySectionViewProps) {
  const isUrgent = (event: CalendarEvent) => {
    if (event.is_all_day) return false;
    if (!event.event_time) return false;
    
    const now = new Date();
    const eventDate = parseISO(event.event_date);
    const [hours, minutes] = event.event_time.split(':').map(Number);
    eventDate.setHours(hours, minutes);
    
    const diffMs = eventDate.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    return diffHours > 0 && diffHours <= 2; // Within 2 hours
  };

  return (
    <div>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge
            variant={section.isToday ? 'success' : 'secondary'}
            size="sm"
          >
            {section.label}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatDate(section.date, 'EEE, P')}
          </span>
        </div>
        <Badge variant="secondary" size="sm">
          {section.events.length}
        </Badge>
      </div>

      {/* Events List */}
      {section.events.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2 italic">
          {section.isToday ? t('dashboard.nothingPlanned') : t('dashboard.noEvents')}
        </p>
      ) : (
        <div className="space-y-1.5">
          {section.events.slice(0, 4).map((event) => {
            const memberColor = event.family_member 
              ? memberColors.get(event.family_member) || DEFAULT_MEMBER_COLOR
              : DEFAULT_MEMBER_COLOR;
            const urgent = section.isToday && isUrgent(event);

            return (
              <button
                key={event.id}
                onClick={() => onEventClick?.(event)}
                className={cn(
                  "w-full text-left p-2.5 rounded-lg transition-all duration-200",
                  "hover:bg-accent hover:shadow-sm",
                  urgent && "bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800"
                )}
              >
                <div className="flex items-start gap-2">
                  {/* Time Column */}
                  <div className="flex-shrink-0 w-14 text-right">
                    <span className={cn(
                      "text-xs font-medium",
                      urgent ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"
                    )}>
                      {event.is_all_day ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {t('calendar.allDay')}
                        </span>
                      ) : (
                        formatTime(event.event_time)
                      )}
                    </span>
                    {urgent && (
                      <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                        {t('dashboard.soon')}
                      </span>
                    )}
                  </div>

                  {/* Event Content */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium truncate",
                      urgent && "text-amber-900 dark:text-amber-100"
                    )}>
                      {event.title}
                    </p>
                    
                    {/* Meta Row */}
                    <div className="flex items-center gap-2 mt-0.5">
                      {/* Family Member Badge */}
                      {event.family_member && (
                        <Badge
                          size="xs"
                          className="text-white border-transparent"
                          style={{ backgroundColor: memberColor }}
                        >
                          <User className="w-2.5 h-2.5" />
                          {event.family_member}
                        </Badge>
                      )}
                      
                      {/* Location */}
                      {event.location && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground truncate max-w-[100px]">
                          <MapPin className="w-2.5 h-2.5" />
                          {event.location}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Chevron for affordance */}
                  <ChevronRight className="w-4 h-4 text-muted-foreground/30 flex-shrink-0 self-center" />
                </div>
              </button>
            );
          })}
          
          {/* Show more indicator */}
          {section.events.length > 4 && (
            <p className="text-xs text-muted-foreground text-center py-1">
              +{section.events.length - 4} {t('calendar.more')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
