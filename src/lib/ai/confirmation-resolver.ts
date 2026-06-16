/**
 * AI-Powered Confirmation Resolver (SMART_AI_V2)
 * 
 * Uses Gemini as primary provider with fallback chain:
 * 1. Gemini (free/fast)
 * 2. OpenAI (reliable fallback)
 * 3. Pattern matching (offline fallback)
 */

import OpenAI from 'openai';
import { detectLanguage } from './response-templates';
import { isGeminiAvailable, getHouseholdGeminiKey } from './providers/gemini';
import { log, logError } from '@/lib/utils/logger';

export type ConfirmationIntent = 
  | 'confirm'           // User wants to save the event
  | 'reject'            // User doesn't want to save it (explicit discard)
  | 'modify'            // User wants to change something (general)
  | 'modify_specific'   // User is making a specific change ("change time to 3pm")
  | 'clarify'           // User is asking a question
  | 'new_event'         // User is describing a different event
  | 'unclear';          // Can't determine intent

export interface ConfirmationResult {
  intent: ConfirmationIntent;
  response?: string;      // Natural response to user if not confirm/reject
  modifications?: {       // If intent is 'modify' or 'modify_specific'
    field: string;
    newValue: string;
  }[];
  confidence?: number;    // How confident we are in this classification
}

interface DraftContext {
  title: string;
  event_date: string;
  event_time?: string | null;
  is_all_day: boolean;
  family_member?: string | null;
  location?: string | null;
}

// ===========================================
// Provider Instances
// ===========================================

let openaiInstance: OpenAI | null = null;
let geminiModule: typeof import('@google/generative-ai') | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiInstance;
}

async function getGemini(householdId?: string | null) {
  if (!geminiModule) {
    geminiModule = await import('@google/generative-ai');
  }

  const apiKey = await getHouseholdGeminiKey(householdId);

  if (!apiKey) {
    throw new Error('GOOGLE_GEMINI_API_KEY is not configured');
  }

  const genAI = new geminiModule.GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 300,
    },
  });
}

// ===========================================
// Main Entry Point
// ===========================================

/**
 * Use AI to understand user's natural language response to a draft
 * Fallback chain: Gemini → OpenAI → Pattern matching
 */
export async function resolveConfirmationIntent(
  userMessage: string,
  draft: DraftContext,
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[],
  householdId?: string | null
): Promise<ConfirmationResult> {
  const lang = detectLanguage(userMessage);
  
  // Quick win: Check for very short, obvious responses first (< 15 chars)
  const quickResult = quickIntentCheck(userMessage);
  if (quickResult) {
    log.info(`[ConfirmationResolver] Quick match: ${quickResult.intent}`);
    return quickResult;
  }
  
  // Try Gemini first (free/fast)
  if (await isGeminiAvailable(householdId)) {
    try {
      const result = await resolveWithGemini(userMessage, draft, householdId);
      if (result.intent !== 'unclear') {
        log.info(`[ConfirmationResolver] Gemini: ${result.intent}`);
        return result;
      }
    } catch (error) {
      logError('[ConfirmationResolver] Gemini error:', error);
    }
  }
  
  // Fallback to OpenAI
  if (process.env.OPENAI_API_KEY) {
    try {
      const result = await resolveWithOpenAI(userMessage, draft, conversationHistory);
      log.info(`[ConfirmationResolver] OpenAI: ${result.intent}`);
      return result;
    } catch (error) {
      logError('[ConfirmationResolver] OpenAI error:', error);
    }
  }
  
  // Final fallback: Pattern matching
  return fallbackIntentDetection(userMessage, lang);
}

// ===========================================
// Quick Intent Check (for obvious responses)
// ===========================================

function quickIntentCheck(message: string): ConfirmationResult | null {
  const lower = message.toLowerCase().trim();

  if (lower === 'confirm') {
    return { intent: 'confirm', confidence: 0.99 };
  }

  if (lower === 'reject' || lower === 'discard') {
    return { intent: 'reject', confidence: 0.99 };
  }

  if (lower === 'modify' || lower === 'edit') {
    return { intent: 'modify', confidence: 0.99 };
  }
  
  // Very short confirmations (high confidence)
  const quickConfirm = ['ja', 'yes', 'ok', 'okay', 'jo', 'yep', 'yup', 'sure', 'klar', 'passt', 'genau', 'stimmt', '👍', '✅'];
  if (quickConfirm.includes(lower)) {
    return { intent: 'confirm', confidence: 0.95 };
  }
  
  // Very short rejections
  const quickReject = ['nein', 'no', 'nope', 'nah', 'cancel', 'abbrechen', 'weg', 'löschen', 'discard', 'verwerfen', '❌', '👎'];
  if (quickReject.includes(lower)) {
    return { intent: 'reject', confidence: 0.95 };
  }
  
  return null;
}

// ===========================================
// Gemini Resolver
// ===========================================

async function resolveWithGemini(
  userMessage: string,
  draft: DraftContext,
  householdId?: string | null
): Promise<ConfirmationResult> {
  const model = await getGemini(householdId);
  
  const prompt = `Analyze this user reply to a draft calendar event.

DRAFT EVENT:
- Title: ${draft.title}
- Date: ${draft.event_date}${draft.event_time ? ` at ${draft.event_time}` : ''}${draft.is_all_day ? ' (all day)' : ''}
${draft.family_member ? `- For: ${draft.family_member}` : ''}
${draft.location ? `- Location: ${draft.location}` : ''}

USER REPLY: "${userMessage}"

Classify the intent as one of:
- "confirm" - User agrees to save (yes, ok, sure, sounds good, go ahead)
- "reject" - User wants to discard/cancel (no, delete, cancel, don't save)
- "modify_specific" - User is making a direct change: "change time to 3pm", "it's on Tuesday"
- "modify" - User wants to change something but not specific: "wait, let me fix something"
- "clarify" - User asking a question: "what time?", "is this right?"
- "new_event" - User describing a completely different event
- "unclear" - Cannot determine

Output ONLY JSON:
{"intent": "...", "modifications": [{"field": "time|date|title|location|family_member", "newValue": "..."}]}`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let content = response.text();
    
    // Clean up response
    content = content.replace(/```(?:json)?\n?/g, '').replace(/```\n?/g, '').trim();
    
    const parsed = JSON.parse(content);
    
    if (isValidIntent(parsed.intent)) {
      return {
        intent: parsed.intent as ConfirmationIntent,
        modifications: parsed.modifications,
        confidence: 0.85,
      };
    }
  } catch (error) {
    logError('[ConfirmationResolver] Gemini parse error:', error);
  }
  
  return { intent: 'unclear', confidence: 0.3 };
}

// ===========================================
// OpenAI Resolver
// ===========================================

async function resolveWithOpenAI(
  userMessage: string,
  draft: DraftContext,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[] | undefined
): Promise<ConfirmationResult> {
  const openai = getOpenAI();
  
  const systemPrompt = `You are an AI assistant helping with calendar event confirmations.

CURRENT DRAFT EVENT:
- Title: ${draft.title}
- Date: ${draft.event_date}${draft.event_time ? ` at ${draft.event_time}` : ''}${draft.is_all_day ? ' (all day)' : ''}
${draft.family_member ? `- For: ${draft.family_member}` : ''}
${draft.location ? `- Location: ${draft.location}` : ''}

Analyze the user's message and determine their intent:
1. "confirm" - User agrees to save (examples: "yes", "sure", "sounds good", "go ahead", "ok")
2. "reject" - User wants to discard (examples: "no", "cancel", "delete", "don't save", "wrong")
3. "modify_specific" - User is making a direct change (examples: "change time to 3pm", "it's on Tuesday not Monday")
4. "modify" - User wants to change something generally (examples: "wait", "let me change", "not quite right")
5. "clarify" - User is asking a question (examples: "what time?", "is this correct?")
6. "new_event" - User is describing a completely different event
7. "unclear" - Can't determine the intent

Respond in JSON format:
{
  "intent": "confirm|reject|modify|modify_specific|clarify|new_event|unclear",
  "response": "Natural response (only for clarify/new_event/unclear)",
  "modifications": [{"field": "title|date|time|family_member|location", "newValue": "..."}]
}`;

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...(conversationHistory?.slice(-3) || []),
    { role: 'user' as const, content: userMessage },
  ];

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    temperature: 0.3,
    max_tokens: 300,
    response_format: { type: 'json_object' },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    return { intent: 'unclear', confidence: 0.3 };
  }

  const result = JSON.parse(content) as ConfirmationResult;
  
  if (!isValidIntent(result.intent)) {
    result.intent = 'unclear';
  }

  return { ...result, confidence: 0.9 };
}

// ===========================================
// Pattern-based Fallback
// ===========================================

function fallbackIntentDetection(message: string, lang: 'de' | 'en'): ConfirmationResult {
  const lower = message.toLowerCase().trim();
  
  // Strong confirmation indicators
  const confirmPatterns = [
    'ja', 'yes', 'ok', 'okay', 'sure', 'go ahead', 'please add',
    'stimmt', 'passt', 'richtig', 'genau', 'klar', 'super',
    'speichern', 'save', 'add it', 'do it', 'confirm',
    'sounds good', 'perfect', 'looks good', 'exactly',
  ];
  
  // Strong rejection indicators  
  const rejectPatterns = [
    'nein', 'no', 'cancel', 'abbrechen', 'falsch', 'wrong',
    'delete', 'löschen', "don't save", 'nicht speichern',
    'never mind', 'vergiss es', 'ignore', 'discard', 'verwerfen',
  ];
  
  // Modification indicators (specific changes)
  const modifySpecificPatterns = [
    /(?:change|änder|ändern).+(?:to|auf|zu)/i,
    /(?:it's|es ist|eigentlich).+(?:not|nicht)/i,
    /(?:um|at|on) \d{1,2}(?::\d{2})?/i,
    /(?:tuesday|wednesday|monday|dienstag|mittwoch|montag)/i,
  ];
  
  // General modification indicators
  const modifyPatterns = [
    'change', 'ändern', 'different', 'anders', 'stattdessen',
    'not quite', 'nicht ganz', 'actually', 'eigentlich', 'wait', 'warte',
  ];
  
  // Question indicators
  const questionPatterns = ['?', 'what', 'was', 'when', 'wann', 'where', 'wo', 'who', 'wer', 'which', 'welch'];
  
  // Check specific modifications first
  for (const pattern of modifySpecificPatterns) {
    if (pattern.test(lower)) {
      return { 
        intent: 'modify_specific',
        response: lang === 'de' 
          ? 'Ich werde die Änderung übernehmen.'
          : "I'll apply that change.",
        confidence: 0.7,
      };
    }
  }
  
  if (confirmPatterns.some(p => lower.includes(p)) && !rejectPatterns.some(p => lower.includes(p))) {
    return { intent: 'confirm', confidence: 0.8 };
  }
  
  if (rejectPatterns.some(p => lower.includes(p))) {
    return { intent: 'reject', confidence: 0.8 };
  }
  
  if (modifyPatterns.some(p => lower.includes(p))) {
    return { 
      intent: 'modify',
      response: lang === 'de' 
        ? 'Was möchtest du ändern?'
        : 'What would you like to change?',
      confidence: 0.7,
    };
  }
  
  if (questionPatterns.some(p => lower.includes(p))) {
    return { 
      intent: 'clarify',
      response: lang === 'de'
        ? 'Ich bin mir nicht sicher, was du meinst. Möchtest du den Termin speichern?'
        : "I'm not sure what you mean. Would you like to save the event?",
      confidence: 0.6,
    };
  }
  
  // Default to unclear with helpful response
  return {
    intent: 'unclear',
    response: lang === 'de'
      ? 'Soll ich den Termin speichern oder möchtest du etwas ändern?'
      : 'Should I save the event or would you like to change something?',
    confidence: 0.4,
  };
}

// ===========================================
// Helpers
// ===========================================

function isValidIntent(intent: unknown): intent is ConfirmationIntent {
  return typeof intent === 'string' && [
    'confirm', 'reject', 'modify', 'modify_specific', 'clarify', 'new_event', 'unclear'
  ].includes(intent);
}
