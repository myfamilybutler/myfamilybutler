/**
 * AI Module - Shared Zod Schemas
 * 
 * Central schema definitions for AI response validation.
 * Used by both OpenAI and Gemini providers.
 */

import { z } from 'zod';

// ===========================================
// Reminder Schema
// ===========================================

export const ReminderSchema = z.object({
  isReminder: z.boolean(),
  task: z.string().optional(),
  datetime: z.string().datetime().optional(),
});

// ===========================================
// Event Schemas
// ===========================================

/**
 * Schema for action items extracted from messages
 * e.g., "Bitte mitbringen: Kostüm in Schultasche"
 */
export const ActionItemSchema = z.object({
  bring: z.array(z.string()).optional(),      // Items to bring
  not_bring: z.array(z.string()).optional(),  // Items NOT to bring
  prepare: z.array(z.string()).optional(),    // Things to prepare beforehand
  deadline: z.string().optional(),             // Deadline for action (e.g., "vor großer Pause")
});

/**
 * Schema for a single extracted event
 */
export const ExtractedEventSchema = z.object({
  title: z.string(),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  event_time: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  is_all_day: z.boolean(),
  family_member: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  recurrence: z.object({
    frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
    interval: z.number().default(1),
    by_day: z.array(z.string()).optional(),
    is_recurring: z.literal(true),
  }).optional().nullable(),
  // New fields for enhanced parsing
  action_items: ActionItemSchema.optional(),
  is_cancelled: z.boolean().optional(),       // For "fällt aus" events
  source_type: z.enum(['schoolfox', 'webuntis', 'whatsapp', 'email', 'voice', 'other']).optional(),
  requires_confirmation: z.boolean().optional(),
});

/**
 * Schema for the event extractor response
 */
export const EventExtractorResponseSchema = z.object({
  intent_type: z.enum([
    'calendar_event',
    'reminder', 
    'school_announcement',  // Info-only, no calendar event
    'action_required',      // Permission slips, bring items
    'schedule_change',      // Cancellations, substitutions
    'leave_request',        // Freistellung tracking
    'unknown'
  ]),
  events: z.array(ExtractedEventSchema).optional(),
  needs_clarification: z.boolean(),
  clarification_question: z.string().optional().nullable(),
  unknown_entities_mentioned: z.array(z.string()).optional(),
  suggested_action: z.enum(['create_event', 'dashboard_redirect', 'clarify']).optional(),
  confidence: z.number().min(0).max(1).optional(),
  // New fields
  action_items: ActionItemSchema.optional(),  // Message-level action items
});

/**
 * Legacy single event schema (backwards compatibility)
 */
export const SingleEventSchema = z.object({
  title: z.string(),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  event_time: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  is_all_day: z.boolean(),
  family_member: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

/**
 * Legacy multi-event schema (backwards compatibility)
 */
export const MultiEventSchema = z.object({
  events: z.array(z.object({
    title: z.string(),
    event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    event_time: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
    end_time: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
    is_all_day: z.boolean().optional(),
    family_member: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
  })),
});

// Type exports
export type ActionItem = z.infer<typeof ActionItemSchema>;
export type ExtractedEvent = z.infer<typeof ExtractedEventSchema>;
export type EventExtractorResponse = z.infer<typeof EventExtractorResponseSchema>;
