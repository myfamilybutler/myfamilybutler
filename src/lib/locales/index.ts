/**
 * Locale Knowledge Base - Simplified
 * 
 * Static Austrian (de-AT) and English (en) configurations.
 * Supports dynamic locale switching based on user language preference.
 */

import { deAT } from './de-AT';
import { enConfig } from './en';
import type { TermDefinition, InputExample, LocaleConfig } from './types';

// Re-export the static locale configuration for backward compatibility
export const localeConfig = deAT;

/**
 * Get the locale configuration based on language preference
 */
export function getLocaleConfig(lang?: string | null): LocaleConfig {
  if (!lang) return deAT;
  const cleanLang = lang.toLowerCase().trim();
  if (cleanLang.startsWith('en')) {
    return enConfig;
  }
  return deAT;
}

/**
 * Get terminology for a specific category
 */
export function getTerminology(category: keyof typeof deAT.terminology, lang?: string | null): Record<string, TermDefinition> {
  const locale = getLocaleConfig(lang);
  return locale.terminology[category];
}

/**
 * Generate terminology list for AI prompts
 */
export function getTerminologyForPrompt(category?: keyof typeof deAT.terminology, lang?: string | null): string {
  const locale = getLocaleConfig(lang);
  const terms = category 
    ? locale.terminology[category] 
    : (Object.values(locale.terminology) as Record<string, TermDefinition>[])
        .reduce((acc, cat) => ({ ...acc, ...cat }), {} as Record<string, TermDefinition>);

  return Object.entries(terms)
    .map(([term, def]) => `- **${term}**: ${def.meaning}`)
    .join('\n');
}

/**
 * Get cultural context for AI prompts
 */
export function getCulturalContextForPrompt(lang?: string | null): string {
  const locale = getLocaleConfig(lang);
  return locale.culturalContext
    .map(ctx => `- ${ctx}`)
    .join('\n');
}

/**
 * Format examples for few-shot prompting
 * Smarter version: Attempts to pick relevant examples based on input text keywords
 */
export function getExamplesForPrompt(maxExamples: number = 3, inputText?: string, lang?: string | null): string {
  const locale = getLocaleConfig(lang);
  let examples = locale.examples;

  // Simple keyword-based relevance matching
  if (inputText) {
    const text = inputText.toLowerCase();
    
    // Sort examples by relevance to input text
    examples = [...examples].sort((a, b) => {
      const aMatch = getRelevanceScore(a, text);
      const bMatch = getRelevanceScore(b, text);
      return bMatch - aMatch;
    });
  }

  // Take the best matches
  const selected = examples.slice(0, maxExamples);

  if (selected.length === 0) {
    return '';
  }

  const isGerman = locale.id.startsWith('de');
  const formatted = selected.map((ex, index) => {
    const expectedOutput = {
      intent_type: 'calendar_event',
      events: ex.expectedEvents.map(e => ({
        title: e.title,
        event_date: e.date,
        event_time: e.time || null,
        end_time: e.endTime || null,
        is_all_day: e.isAllDay || !e.time,
        location: e.location || null,
        action_items: e.action_items || undefined, // Include action items if present
      })),
      needs_clarification: false,
      confidence: 0.95,
    };

    const textSnippet = ex.text.length > 300
      ? ex.text.substring(0, 300) + '...'
      : ex.text;

    const prefix = isGerman ? 'Beispiel' : 'Example';
    return `### ${prefix} ${index + 1}: ${ex.description}
**Input:**
\`\`\`
${textSnippet}
\`\`\`
**Output:**
\`\`\`json
${JSON.stringify(expectedOutput, null, 2)}
\`\`\``;
  });

  const heading = isGerman ? 'Lernbeispiele (Few-Shot)' : 'Learning Examples (Few-Shot)';
  return `## ${heading}\n\n${formatted.join('\n\n')}`;
}

/**
 * Helper to calculate relevance score for an example
 */
function getRelevanceScore(ex: InputExample, inputText: string): number {
  let score = 0;
  
  // Keyword mapping per category/type
  const keywordSets: Record<string, string[]> = {
    'school': ['schule', 'lehrer', 'elternbrief', 'unterricht', 'school', 'teacher', 'homework'],
    'sports': ['training', 'match', 'turnier', 'spiel', 'football', 'soccer', 'basketball', 'kickn'],
    'medical': ['arzt', 'termin', 'untersuchung', 'impfung', 'doctor', 'appointment', 'medical', 'dentist'],
    'birthday': ['geburtstag', 'party', 'feiert', 'einladung', 'birthday', 'celebration', 'invite'],
    'voice': ['äh', 'hallo', 'nachricht', 'du', 'hey', 'grandma', 'oma'],
  };

  // Check type match
  if (ex.type.includes('school') && keywordSets.school.some(k => inputText.includes(k))) score += 5;
  if (ex.type.includes('training') && keywordSets.sports.some(k => inputText.includes(k))) score += 5;
  if (ex.type.includes('appointment') && keywordSets.medical.some(k => inputText.includes(k))) score += 5;
  if (ex.type.includes('invitation') && keywordSets.birthday.some(k => inputText.includes(k))) score += 5;
  if (ex.type.includes('voice') && keywordSets.voice.some(k => inputText.includes(k))) score += 5;

  // Check text overlap (basic)
  const exText = ex.text.toLowerCase();
  const words = inputText.split(/\s+/).filter(w => w.length > 4);
  words.forEach(word => {
    if (exText.includes(word)) score += 1;
  });

  return score;
}

// Re-export types
export type {
  LocaleConfig,
  TermDefinition,
  InputExample,
  HolidayConfig,
  DateFormatConfig,
} from './types';
