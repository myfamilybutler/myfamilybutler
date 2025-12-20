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
});

/**
 * Schema for the event extractor response
 */
export const EventExtractorResponseSchema = z.object({
  intent_type: z.enum(['calendar_event', 'reminder', 'unknown']),
  events: z.array(ExtractedEventSchema).optional(),
  needs_clarification: z.boolean(),
  clarification_question: z.string().optional().nullable(),
  confidence: z.number().min(0).max(1).optional(),
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
export type ExtractedEvent = z.infer<typeof ExtractedEventSchema>;
export type EventExtractorResponse = z.infer<typeof EventExtractorResponseSchema>;
