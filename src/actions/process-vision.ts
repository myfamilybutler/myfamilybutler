'use server';

/**
 * Process Vision Server Action
 * 
 * Extracts calendar events from images using AI vision models.
 * Works with any image buffer (WhatsApp, Telegram, uploaded files, etc.)
 */

import OpenAI from 'openai';
import {
  buildVisionAgentPrompt, 
  VisionExtractionResponseSchema,
  NO_EVENTS_RESPONSE,
  type VisionExtractionResponse,
  type VisionEvent 
} from '@/lib/ai/agents/vision-agent';
import { createEventsBulk } from '@/lib/supabase';

// ===========================================
// Types
// ===========================================

export interface ProcessVisionInput {
  /** The image file buffer */
  imageBuffer: Buffer;
  /** User who sent the image */
  userId: string;
  /** User's household for event creation */
  householdId: string;
  /** Image MIME type (default: image/jpeg) */
  mimeType?: string;
}

export interface ProcessVisionResult {
  success: boolean;
  events: VisionEvent[];
  eventsCreated: number;
  documentType: string;
  error?: string;
  clarificationNeeded?: boolean;
  clarificationQuestion?: string;
}

// ===========================================
// OpenAI Client (for fallback)
// ===========================================

let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiInstance;
}

// ===========================================
// Gemini Vision Processing (Primary)
// ===========================================

let geminiModule: typeof import('@google/generative-ai') | null = null;

async function getGeminiModel() {
  if (!geminiModule) {
    geminiModule = await import('@google/generative-ai');
  }
  
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  
  const genAI = new geminiModule.GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ 
    model: 'gemini-3-flash-preview',
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 4000,
    },
  });
}

async function extractWithGemini(
  imageBuffer: Buffer,
  mimeType: string = 'image/jpeg'
): Promise<VisionExtractionResponse | null> {
  const model = await getGeminiModel();
  
  if (!model) {
    console.log('[Vision] Gemini not available, skipping');
    return null;
  }

  const base64Image = imageBuffer.toString('base64');
  const systemPrompt = buildVisionAgentPrompt();

  try {
    const result = await model.generateContent([
      systemPrompt + '\n\nBitte analysiere dieses Bild und extrahiere alle Kalendertermine. Antworte NUR mit JSON.',
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Image,
        },
      },
    ]);

    const response = await result.response;
    let content = response.text();

    if (!content) {
      console.error('[Vision] No response from Gemini');
      return null;
    }

    // Clean up response (remove markdown code blocks if present)
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const parsed = JSON.parse(content);
    const validated = VisionExtractionResponseSchema.safeParse(parsed);

    if (validated.success) {
      console.log(`[Vision] Gemini extracted ${validated.data.events.length} events`);
      return validated.data;
    }

    console.error('[Vision] Gemini validation failed:', validated.error);
    return null;
  } catch (error) {
    console.error('[Vision] Gemini error:', error);
    return null;
  }
}

// ===========================================
// OpenAI Vision Processing (Fallback)
// ===========================================

async function extractWithOpenAI(
  imageBuffer: Buffer,
  mimeType: string = 'image/jpeg'
): Promise<VisionExtractionResponse> {
  const base64Image = imageBuffer.toString('base64');
  const dataUri = `data:${mimeType};base64,${base64Image}`;
  const systemPrompt = buildVisionAgentPrompt();

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Bitte analysiere dieses Bild und extrahiere alle Kalendertermine. Antworte NUR mit JSON.' },
          { type: 'image_url', image_url: { url: dataUri, detail: 'high' } },
        ],
      },
    ],
    max_tokens: 4000,
    temperature: 0,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    console.error('[Vision] No response from OpenAI');
    return NO_EVENTS_RESPONSE;
  }

  try {
    const parsed = JSON.parse(content);
    const validated = VisionExtractionResponseSchema.safeParse(parsed);

    if (validated.success) {
      console.log(`[Vision] OpenAI extracted ${validated.data.events.length} events`);
      return validated.data;
    }

    console.error('[Vision] OpenAI validation failed:', validated.error);
    return NO_EVENTS_RESPONSE;
  } catch (parseError) {
    console.error('[Vision] JSON parse error:', parseError);
    return NO_EVENTS_RESPONSE;
  }
}

// ===========================================
// Unified Vision Processing
// ===========================================

async function extractEvents(
  imageBuffer: Buffer,
  mimeType: string = 'image/jpeg'
): Promise<VisionExtractionResponse> {
  // Try Gemini first (free/cheap)
  const geminiResult = await extractWithGemini(imageBuffer, mimeType);
  if (geminiResult) {
    return geminiResult;
  }

  // Fallback to OpenAI
  console.log('[Vision] Falling back to OpenAI');
  return await extractWithOpenAI(imageBuffer, mimeType);
}

// ===========================================
// Main Function
// ===========================================

export async function processVisionMessage(
  input: ProcessVisionInput
): Promise<ProcessVisionResult> {
  const { imageBuffer, userId, householdId, mimeType } = input;

  console.log(`[Vision] Processing image for user ${userId}: ${imageBuffer.length} bytes`);

  try {
    // Extract events using AI vision
    const extraction = await extractEvents(imageBuffer, mimeType);

    if (!extraction.success || extraction.events.length === 0) {
      return {
        success: true,
        events: [],
        eventsCreated: 0,
        documentType: extraction.document_type,
        clarificationNeeded: extraction.needs_clarification,
        clarificationQuestion: extraction.clarification_question ?? undefined,
      };
    }

    // Save events to database
    const createdEvents = await createEventsBulk(
      householdId,
      userId,
      extraction.events.map((event) => ({
        title: event.title,
        event_date: event.event_date,
        event_time: event.event_time ?? undefined,
        end_time: event.end_time ?? undefined,
        is_all_day: event.is_all_day,
        family_member: event.family_member ?? undefined,
        location: event.location ?? undefined,
        description: event.description ?? undefined,
      }))
    );

    const createdFingerprints = new Set(
      createdEvents.map((event) => `${event.title}::${event.event_date}::${event.event_time ?? ''}`)
    );
    const savedEvents = extraction.events.filter((event) =>
      createdFingerprints.has(`${event.title}::${event.event_date}::${event.event_time ?? ''}`)
    );

    console.log(`[Vision] Created ${createdEvents.length} events`);

    return {
      success: true,
      events: savedEvents,
      eventsCreated: createdEvents.length,
      documentType: extraction.document_type,
      clarificationNeeded: extraction.needs_clarification,
      clarificationQuestion: extraction.clarification_question ?? undefined,
    };

  } catch (error) {
    console.error('[Vision] Processing error:', error);
    return {
      success: false,
      events: [],
      eventsCreated: 0,
      documentType: 'other',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

