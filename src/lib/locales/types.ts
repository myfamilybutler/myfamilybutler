/**
 * Locale Knowledge Base - Type Definitions
 * 
 * TypeScript interfaces for regional AI configuration.
 * Used by all AI prompt builders.
 */

// ===========================================
// Core Types
// ===========================================

/**
 * Date format patterns for the locale
 */
export interface DateFormatConfig {
  /** Standard date format (e.g., 'DD.MM.YYYY') */
  standard: string;
  /** Short date format (e.g., 'DD.MM.') */
  short: string;
  /** Locale for JS date formatting (e.g., 'de-AT') */
  jsLocale: string;
  /** Month name overrides (e.g., 'Jänner' instead of 'Januar') */
  monthNames?: Record<number, string>;
}

/**
 * Term definition with optional context
 */
export interface TermDefinition {
  /** What the AI should understand this term as */
  meaning: string;
  /** Optional: Is this an event type? */
  isEventType?: boolean;
  /** Optional: Default duration if applicable */
  defaultDuration?: string;
  /** Optional: Category for filtering */
  category?: 'school' | 'sports' | 'medical' | 'religious' | 'other';
}

/**
 * Terminology grouped by domain
 */
export interface TerminologyConfig {
  school: Record<string, TermDefinition>;
  sports: Record<string, TermDefinition>;
  medical: Record<string, TermDefinition>;
  religious: Record<string, TermDefinition>;
  general: Record<string, TermDefinition>;
}

/**
 * Example input for AI training/testing
 */
export interface InputExample {
  /** Type of input */
  type: 'school_letter' | 'training_message' | 'appointment' | 'invitation' | 'cancellation' | 'other';
  /** Short description */
  description: string;
  /** The actual input text */
  text: string;
  /** What events should be extracted */
  expectedEvents: ExpectedEvent[];
}

/**
 * Expected event from an example input
 */
export interface ExpectedEvent {
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  endTime?: string;
  isAllDay?: boolean;
  location?: string;
}

/**
 * Holiday/vacation periods
 */
export interface HolidayConfig {
  name: string;
  /** Description for AI context */
  description: string;
  /** Approximate timing */
  timing: string;
}

/**
 * Complete locale configuration
 */
export interface LocaleConfig {
  /** Unique identifier (e.g., 'de-AT', 'de-DE') */
  id: string;
  /** Human-readable name */
  name: string;
  /** Region/Area specification */
  region?: string;
  /** Timezone */
  timezone: string;
  /** Country calling code */
  countryCode: string;
  /** Currency */
  currency: string;
  /** Date formatting configuration */
  dateFormat: DateFormatConfig;
  /** Domain-specific terminology */
  terminology: TerminologyConfig;
  /** School vacation periods */
  holidays: HolidayConfig[];
  /** Example inputs for AI context */
  examples: InputExample[];
  /** Cultural context snippets for AI prompts */
  culturalContext: string[];
}

// ===========================================
// Utility Types
// ===========================================

export type LocaleId = 'de-AT' | 'de-DE' | 'de-CH';

export type SupportedLocale = LocaleConfig & { id: LocaleId };
