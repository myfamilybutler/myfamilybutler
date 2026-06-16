/**
 * Context Builder - Phase 2.6
 * 
 * Builds and caches family context for AI prompts.
 * Reduces database queries and improves response time.
 */

import { getAdminClient } from '@/lib/supabase/client';
import { getFamilyMembers } from '@/lib/supabase';
import type { Event, User } from '@/types';
import { APP_CONFIG } from '@/lib/config';
import { log, logError } from '@/lib/utils/logger';
import { LRUCache } from '@/lib/utils/lru';

// ===========================================
// Types
// ===========================================

export interface FamilyContext {
  householdId: string;
  householdName?: string;
  members: Array<{ id: string; name: string; color?: string }>;
  users: Array<Pick<User, 'id' | 'display_name' | 'phone_number'>>;
  /** All member names (for prompt injection) */
  memberNames: string[];
  /** Recent events (for context) */
  recentEvents: Event[];
  /** Preferences */
  preferences: {
    language: 'de' | 'en';
    timezone: string;
  };
  /** When this context was built */
  cachedAt: number;
}

export interface PromptContext {
  /** Family context (if available) */
  family?: FamilyContext;
  /** Current date/time info */
  temporal: TemporalContext;
  /** User's detected mood */
  mood?: 'neutral' | 'stressed' | 'playful' | 'frustrated';
  /** Conversation history count */
  historyCount: number;
}

export interface TemporalContext {
  date: string;       // YYYY-MM-DD
  time: string;       // HH:MM
  weekday: string;    // Full weekday name
  timezone: string;
  isWeekend: boolean;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
}

// ===========================================
// Cache
// ===========================================

interface CacheEntry {
  context: FamilyContext;
  expiresAt: number;
}

const contextCache = new LRUCache<string, CacheEntry>(1000);
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_TIMEZONE = APP_CONFIG.localization.timezone;

// Cleanup interval
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupInterval) return;
  
  // Double-checked locking pattern to prevent race condition
  const newInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of contextCache.entries()) {
      if (now > entry.expiresAt) {
        contextCache.delete(key);
      }
    }
  }, 60 * 1000);
  
  // Only assign if still null (second check)
  if (!cleanupInterval) {
    cleanupInterval = newInterval;
    if (cleanupInterval.unref) {
      cleanupInterval.unref();
    }
  } else {
    // Another call already created it
    clearInterval(newInterval);
  }
}

// ===========================================
// Context Building
// ===========================================

/**
 * Get family context (cached)
 */
export async function getFamilyContext(householdId: string): Promise<FamilyContext | null> {
  if (!householdId) return null;
  
  ensureCleanup();
  
  // Check cache
  const cached = contextCache.get(householdId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.context;
  }
  
  // Build fresh context
  try {
    const admin = getAdminClient();
    
    // Parallel fetch
    const [familyResult, householdResult, eventsResult] = await Promise.all([
      getFamilyMembers(householdId),
      admin.from('households').select('name').eq('id', householdId).single(),
      admin.from('events')
        .select('*')
        .eq('household_id', householdId)
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true })
        .limit(5),
    ]);
    
    const context: FamilyContext = {
      householdId,
      householdName: householdResult.data?.name || undefined,
      members: familyResult.familyMembers,
      users: familyResult.users.map(u => ({
        id: u.id,
        display_name: u.display_name,
        phone_number: u.phone_number,
      })),
      memberNames: [
        ...familyResult.users.filter(u => u.display_name).map(u => u.display_name!),
        ...familyResult.familyMembers.map(m => m.name),
      ],
      recentEvents: (eventsResult.data || []) as Event[],
      preferences: {
        language: 'de',
        timezone: DEFAULT_TIMEZONE,
      },
      cachedAt: Date.now(),
    };
    
    // Cache it
    contextCache.set(householdId, {
      context,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    
    return context;
    
  } catch (err) {
    logError('[Context] Error building family context:', err);
    return null;
  }
}

/**
 * Get temporal context (current date/time info)
 */
export function getTemporalContext(timezone: string = DEFAULT_TIMEZONE): TemporalContext {
  const now = new Date();
  
  const dateFormatter = new Intl.DateTimeFormat('de-AT', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  const timeFormatter = new Intl.DateTimeFormat('de-AT', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  
  const weekdayFormatter = new Intl.DateTimeFormat('de-AT', {
    timeZone: timezone,
    weekday: 'long',
  });
  
  const parts = dateFormatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year')?.value || '';
  const month = parts.find(p => p.type === 'month')?.value || '';
  const day = parts.find(p => p.type === 'day')?.value || '';
  
  const hourText = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    hour12: false,
  }).format(now);
  const hour = Number.parseInt(hourText, 10);

  const weekdayEn = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  }).format(now);
  const dayOfWeek = ({
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  } as const)[weekdayEn] ?? now.getDay();

  let timeOfDay: TemporalContext['timeOfDay'];
  if (hour >= 5 && hour < 12) timeOfDay = 'morning';
  else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
  else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
  else timeOfDay = 'night';
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  return {
    date: `${year}-${month}-${day}`,
    time: timeFormatter.format(now),
    weekday: weekdayFormatter.format(now),
    timezone,
    isWeekend,
    timeOfDay,
  };
}

/**
 * Build complete prompt context
 */
export async function buildPromptContext(
  userId: string,
  householdId: string | null,
  historyCount: number = 0
): Promise<PromptContext> {
  const family = householdId ? await getFamilyContext(householdId) : undefined;
  const timezone = family?.preferences.timezone || DEFAULT_TIMEZONE;
  
  return {
    family: family || undefined,
    temporal: getTemporalContext(timezone),
    historyCount,
  };
}

/**
 * Invalidate cached context (call after family changes)
 */
export function invalidateContextCache(householdId: string): void {
  contextCache.delete(householdId);
  log.info(`[Context] Cache invalidated for household: ${householdId.slice(0, 8)}...`);
}

/**
 * Format context for prompt injection
 */
export function formatContextForPrompt(context: PromptContext): string {
  const lines: string[] = [];
  
  // Temporal context
  lines.push(`Aktuelles Datum: ${context.temporal.weekday}, ${context.temporal.date}`);
  lines.push(`Aktuelle Uhrzeit: ${context.temporal.time}`);
  lines.push(`Zeitzone: ${context.temporal.timezone}`);
  
  if (context.temporal.isWeekend) {
    lines.push('Es ist Wochenende.');
  }
  
  // Family context
  if (context.family) {
    if (context.family.memberNames.length > 0) {
      lines.push('');
      lines.push(`Bekannte Familienmitglieder: ${context.family.memberNames.join(', ')}`);
    }
    
    if (context.family.recentEvents.length > 0) {
      lines.push('');
      lines.push('Nachste Termine:');
      for (const event of context.family.recentEvents.slice(0, 3)) {
        const time = event.event_time || 'ganztagig';
        lines.push(`- ${event.event_date} ${time}: ${event.title}`);
      }
    }
  }
  
  return lines.join('\n');
}
