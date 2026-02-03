/**
 * Locale Knowledge Base - Simplified
 * 
 * Static Austrian (de-AT) configuration.
 * No dynamic locale switching - single locale support.
 */

import { deAT } from './de-AT';
import type { TermDefinition } from './types';

// Re-export the static locale configuration
export const localeConfig = deAT;

/**
 * Get terminology for a specific category
 */
export function getTerminology(category: keyof typeof localeConfig.terminology): Record<string, TermDefinition> {
  return localeConfig.terminology[category];
}

/**
 * Generate terminology list for AI prompts
 */
export function getTerminologyForPrompt(category?: keyof typeof localeConfig.terminology): string {
  const terms = category 
    ? getTerminology(category) 
    : (Object.values(localeConfig.terminology) as Record<string, TermDefinition>[])
        .reduce((acc, cat) => ({ ...acc, ...cat }), {} as Record<string, TermDefinition>);

  return Object.entries(terms)
    .map(([term, def]) => `- **${term}**: ${def.meaning}`)
    .join('\n');
}

/**
 * Get cultural context for AI prompts
 */
export function getCulturalContextForPrompt(): string {
  return localeConfig.culturalContext
    .map(ctx => `- ${ctx}`)
    .join('\n');
}

/**
 * Format examples for few-shot prompting
 */
export function getExamplesForPrompt(maxExamples: number = 3): string {
  const examples = localeConfig.examples.slice(0, maxExamples);

  if (examples.length === 0) {
    return '';
  }

  const formatted = examples.map((ex, index) => {
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

// Re-export types
export type {
  LocaleConfig,
  TermDefinition,
  InputExample,
  HolidayConfig,
  DateFormatConfig,
} from './types';
