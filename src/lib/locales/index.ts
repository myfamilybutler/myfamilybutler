/**
 * Locale Knowledge Base - Main Export
 * 
 * Single source of truth for regional AI configuration.
 * 
 * Usage:
 *   import { getLocaleConfig, getTerminology } from '@/lib/locales';
 *   
 *   const locale = getLocaleConfig();
 *   const schoolTerms = getTerminology('school');
 */

import { deAT } from './de-AT';
import type { LocaleConfig, LocaleId, TerminologyConfig, TermDefinition } from './types';

// ===========================================
// Supported Locales Registry
// ===========================================

const locales: Record<LocaleId, LocaleConfig> = {
  'de-AT': deAT,
  // Future locales:
  // 'de-DE': deDE,  // Germany
  // 'de-CH': deCH,  // Switzerland
} as Record<LocaleId, LocaleConfig>;

// Default locale (can be configured in APP_CONFIG)
let currentLocaleId: LocaleId = 'de-AT';

// ===========================================
// Core Functions
// ===========================================

/**
 * Get the current locale configuration
 */
export function getLocaleConfig(): LocaleConfig {
  return locales[currentLocaleId];
}

/**
 * Set the current locale
 */
export function setLocale(localeId: LocaleId): void {
  if (locales[localeId]) {
    currentLocaleId = localeId;
  } else {
    console.warn(`[Locales] Unknown locale: ${localeId}, keeping ${currentLocaleId}`);
  }
}

/**
 * Get current locale ID
 */
export function getCurrentLocaleId(): LocaleId {
  return currentLocaleId;
}

/**
 * Get all supported locale IDs
 */
export function getSupportedLocales(): LocaleId[] {
  return Object.keys(locales) as LocaleId[];
}

// ===========================================
// Terminology Helpers
// ===========================================

type TermCategory = keyof TerminologyConfig;

/**
 * Get terminology for a specific category
 */
export function getTerminology(category: TermCategory): Record<string, TermDefinition> {
  return getLocaleConfig().terminology[category];
}

/**
 * Get all terminology (all categories merged)
 */
export function getAllTerminology(): Record<string, TermDefinition> {
  const locale = getLocaleConfig();
  return {
    ...locale.terminology.school,
    ...locale.terminology.sports,
    ...locale.terminology.medical,
    ...locale.terminology.religious,
    ...locale.terminology.general,
  };
}

/**
 * Generate terminology list for AI prompts
 * Returns a formatted string of terms and their meanings
 */
export function getTerminologyForPrompt(category?: TermCategory): string {
  const terms = category ? getTerminology(category) : getAllTerminology();

  return Object.entries(terms)
    .map(([term, def]) => `- **${term}**: ${def.meaning}`)
    .join('\n');
}

/**
 * Get just the term names for a category (for quick reference)
 */
export function getTermList(category: TermCategory): string[] {
  return Object.keys(getTerminology(category));
}

// ===========================================
// Cultural Context Helpers
// ===========================================

/**
 * Get cultural context for AI prompts
 */
export function getCulturalContext(): string[] {
  return getLocaleConfig().culturalContext;
}

/**
 * Get cultural context as formatted string for prompts
 */
export function getCulturalContextForPrompt(): string {
  return getCulturalContext()
    .map(ctx => `- ${ctx}`)
    .join('\n');
}

// ===========================================
// Example Helpers
// ===========================================

/**
 * Get all input examples
 */
export function getExamples() {
  return getLocaleConfig().examples;
}

/**
 * Get examples by type
 */
export function getExamplesByType(type: string) {
  return getExamples().filter(ex => ex.type === type);
}

/**
 * Format examples for few-shot prompting in AI
 * Creates input→output pairs that teach the AI by example
 */
export function getExamplesForPrompt(maxExamples: number = 3): string {
  const examples = getExamples().slice(0, maxExamples);

  if (examples.length === 0) {
    return '';
  }

  const formatted = examples.map((ex, index) => {
    // Format the expected output as JSON
    const expectedOutput = {
      intent_type: 'calendar_event',
      events: ex.expectedEvents.map(e => ({
        title: e.title,
        event_date: e.date,
        event_time: e.time || null,
        end_time: e.endTime || null,
        is_all_day: e.isAllDay || !e.time,
        location: e.location || null,
      })),
      needs_clarification: false,
      confidence: 0.95,
    };

    // Truncate long input texts for prompt efficiency
    const inputText = ex.text.length > 300
      ? ex.text.substring(0, 300) + '...'
      : ex.text;

    return `### Beispiel ${index + 1}: ${ex.description}
**Input:**
\`\`\`
${inputText}
\`\`\`
**Output:**
\`\`\`json
${JSON.stringify(expectedOutput, null, 2)}
\`\`\``;
  });

  return `## Lernbeispiele (Few-Shot)\n\n${formatted.join('\n\n')}`;
}

// ===========================================
// Date Format Helpers
// ===========================================

/**
 * Get date format configuration
 */
export function getDateFormat() {
  return getLocaleConfig().dateFormat;
}

/**
 * Get JS locale string for date formatting
 */
export function getJsLocale(): string {
  return getLocaleConfig().dateFormat.jsLocale;
}

// ===========================================
// Holiday Helpers
// ===========================================

/**
 * Get holiday/vacation information
 */
export function getHolidays() {
  return getLocaleConfig().holidays;
}

/**
 * Get holidays formatted for AI prompt
 */
export function getHolidaysForPrompt(): string {
  return getHolidays()
    .map(h => `- **${h.name}**: ${h.description} (${h.timing})`)
    .join('\n');
}

// ===========================================
// Re-exports
// ===========================================

export type {
  LocaleConfig,
  LocaleId,
  TermDefinition,
  TerminologyConfig,
  InputExample,
  HolidayConfig,
  DateFormatConfig,
} from './types';

export { deAT } from './de-AT';
