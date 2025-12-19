'use client';

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { FamilyWidget } from '@/components/dashboard/family-widget';
import { CalendarWidget } from '@/components/calendar/calendar-widget';
import { UpcomingEvents } from '@/components/calendar/upcoming-events';
import { CalendarFilter } from '@/components/calendar/calendar-filter';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent } from '@/components/ui/card';

import type { CalendarEvent } from '@/components/calendar/calendar-widget';

export default function DashboardPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const hasFetchedRef = useRef(false);

  // Initialize selected members when events load
  const initializeFilters = useCallback((loadedEvents: CalendarEvent[]) => {
    const members = new Set<string>();
    loadedEvents.forEach((event) => {
      if (event.family_member) {
        members.add(event.family_member);
      }
    });
    setSelectedMembers(Array.from(members));
  }, []);

  // Fetch events from API - returns loaded events or null on error
  const fetchEventsData = async () => {
    const response = await fetch('/api/dashboard');
    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error('Dashboard fetch failed:', result.error);
      return null;
    }

    // Store raw DB user (clean - no fake object manufacturing)
    useAuthStore.getState().setDbUser(result.user);
    return result.events || [];
  };

  // Initial fetch effect
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (hasFetchedRef.current) return;
      
      const loadedEvents = await fetchEventsData();
      if (loadedEvents && isMounted) {
        setEvents(loadedEvents);
        initializeFilters(loadedEvents);
        hasFetchedRef.current = true;
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [initializeFilters]);

  // Callback for when events are changed (edited/deleted)
  const handleEventsChanged = useCallback(async () => {
    const loadedEvents = await fetchEventsData();
    if (loadedEvents) {
      setEvents(loadedEvents);
    }
  }, []);

  // Memoized filtered events to prevent unnecessary re-renders
  const filteredEvents = useMemo(() => {
    if (selectedMembers.length === 0) {
      return events;
    }
    return events.filter((event) => {
      if (!event.family_member) return true;
      return selectedMembers.includes(event.family_member);
    });
  }, [events, selectedMembers]);

  // Today's date for the header
  const todayFormatted = format(new Date(), 'EEEE, MMMM d');

  return (
    <ProtectedRoute>
      <DashboardLayout>
        {/* Mobile-first: stacked layout, Desktop: sidebar + main */}
        <div className="space-y-4 lg:space-y-0 lg:flex lg:gap-6">
          
          {/* Sidebar (desktop) / Bottom section (mobile) */}
          <aside className="order-2 lg:order-1 lg:w-80 lg:flex-shrink-0 space-y-4">
            {/* Upcoming Events Card */}
            <Card className="border-gray-200 shadow-sm bg-white">
              <CardContent className="p-4">
                <UpcomingEvents 
                  events={filteredEvents} 
                  maxItems={5} 
                  onEventsChanged={handleEventsChanged}
                />
              </CardContent>
            </Card>

            {/* Filter Card (only show if there are family members) */}
            {events.some((e) => e.family_member) && (
              <Card className="border-gray-200 shadow-sm bg-white">
                <CardContent className="p-4">
                  <CalendarFilter
                    events={events}
                    selectedMembers={selectedMembers}
                    onSelectionChange={setSelectedMembers}
                  />
                </CardContent>
              </Card>
            )}

            {/* Family Widget */}
            <FamilyWidget />
          </aside>

          {/* Main Calendar (hero on mobile) */}
          <main className="order-1 lg:order-2 flex-1">
            {/* Header with date */}
            <div className="mb-4">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Family Calendar
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">{todayFormatted}</p>
            </div>

            {/* Calendar Grid */}
            <CalendarWidget 
              events={filteredEvents} 
              onEventsChanged={handleEventsChanged}
            />
          </main>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

