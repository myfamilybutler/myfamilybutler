'use server';

/**
 * Process Vision Server Action
 * 
 * Handles WhatsApp image messages by:
 * 1. Downloading the image from Meta API
 * 2. Sending to GPT-4o vision for extraction
 * 3. Validating and returning structured event data
 */

import OpenAI from 'openai';
import { 
  buildVisionAgentPrompt, 
  VisionExtractionResponseSchema,
  NO_EVENTS_RESPONSE,
  type VisionExtractionResponse,
  type VisionEvent 
} from '@/lib/ai/agents/vision-agent';
import { createEvent } from '@/lib/supabase';

// ===========================================
// Types
// ===========================================

interface ProcessVisionInput {
  mediaId: string;           // WhatsApp Media ID
  userId: string;            // User who sent the image
  householdId: string;       // User's household for event creation
  mimeType?: string;         // Image MIME type (e.g., image/jpeg)
}

interface ProcessVisionResult {
  success: boolean;
  events: VisionEvent[];
  eventsCreated: number;
  documentType: string;
  error?: string;
  clarificationNeeded?: boolean;
  clarificationQuestion?: string;
}

// ===========================================
// Meta API Image Download
// ===========================================

/**
 * Download image from WhatsApp Media API
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media
 */
async function downloadWhatsAppMedia(mediaId: string): Promise<Buffer> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  
  if (!accessToken) {
    throw new Error('Missing WHATSAPP_ACCESS_TOKEN environment variable');
  }

  // Step 1: Get the media URL from Meta
  const mediaInfoResponse = await fetch(
    `https://graph.facebook.com/v18.0/${mediaId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!mediaInfoResponse.ok) {
    const errorData = await mediaInfoResponse.text();
    throw new Error(`Failed to get media info: ${errorData}`);
  }

  const mediaInfo = await mediaInfoResponse.json() as { url: string };
  
  if (!mediaInfo.url) {
    throw new Error('No URL in media info response');
  }

  // Step 2: Download the actual image
  const imageResponse = await fetch(mediaInfo.url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!imageResponse.ok) {
    throw new Error(`Failed to download image: ${imageResponse.status}`);
  }

  const arrayBuffer = await imageResponse.arrayBuffer();
  return Buffer.from(arrayBuffer);
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

/**
 * Process image with Gemini 1.5 Flash Vision (Primary - Free/Cheap)
 */
async function extractEventsWithGemini(
  imageBuffer: Buffer,
  mimeType: string = 'image/jpeg'
): Promise<VisionExtractionResponse | null> {
  const model = await getGeminiModel();
  
  if (!model) {
    console.log('[VisionAgent] Gemini not available, skipping');
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
      console.error('[VisionAgent] No response from Gemini');
      return null;
    }

    console.log('[VisionAgent] Gemini raw response:', content);

    // Clean up response (remove markdown code blocks if present)
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const parsed = JSON.parse(content);
    const validated = VisionExtractionResponseSchema.safeParse(parsed);

    if (validated.success) {
      console.log(`[VisionAgent] Gemini extracted ${validated.data.events.length} events with confidence ${validated.data.confidence}`);
      return validated.data;
    }

    console.error('[VisionAgent] Gemini schema validation failed:', validated.error);
    return null;
  } catch (error) {
    console.error('[VisionAgent] Gemini processing error:', error);
    return null;
  }
}

// ===========================================
// OpenAI Vision Processing (Fallback)
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

/**
 * Process image with OpenAI GPT-4o-mini Vision (Fallback - Cheap)
 */
async function extractEventsWithOpenAI(
  imageBuffer: Buffer,
  mimeType: string = 'image/jpeg'
): Promise<VisionExtractionResponse> {
  const base64Image = imageBuffer.toString('base64');
  const dataUri = `data:${mimeType};base64,${base64Image}`;

  const systemPrompt = buildVisionAgentPrompt();

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini', // Cheapest OpenAI vision model
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Bitte analysiere dieses Bild und extrahiere alle Kalendertermine. Antworte NUR mit JSON.',
          },
          {
            type: 'image_url',
            image_url: {
              url: dataUri,
              detail: 'high',
            },
          },
        ],
      },
    ],
    max_tokens: 4000,
    temperature: 0,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    console.error('[VisionAgent] No response content from OpenAI');
    return NO_EVENTS_RESPONSE;
  }

  console.log('[VisionAgent] OpenAI raw response:', content);

  try {
    const parsed = JSON.parse(content);
    const validated = VisionExtractionResponseSchema.safeParse(parsed);

    if (validated.success) {
      console.log(`[VisionAgent] OpenAI extracted ${validated.data.events.length} events with confidence ${validated.data.confidence}`);
      return validated.data;
    }

    console.error('[VisionAgent] OpenAI schema validation failed:', validated.error);
    return NO_EVENTS_RESPONSE;
  } catch (parseError) {
    console.error('[VisionAgent] JSON parse error:', parseError);
    return NO_EVENTS_RESPONSE;
  }
}

// ===========================================
// Unified Vision Processing with Fallback
// ===========================================

/**
 * Extract events from image with automatic fallback
 * Primary: Gemini 1.5 Flash | Fallback: OpenAI GPT-4o-mini
 */
async function extractEventsFromImage(
  imageBuffer: Buffer,
  mimeType: string = 'image/jpeg'
): Promise<VisionExtractionResponse> {
  // Try Gemini first (free/cheap)
  console.log('[VisionAgent] Trying Gemini 1.5 Flash (primary)');
  const geminiResult = await extractEventsWithGemini(imageBuffer, mimeType);
  
  if (geminiResult && (geminiResult.events.length > 0 || geminiResult.needs_clarification)) {
    return geminiResult;
  }

  // Fallback to OpenAI
  console.log('[VisionAgent] Falling back to OpenAI GPT-4o-mini');
  return await extractEventsWithOpenAI(imageBuffer, mimeType);
}

// ===========================================
// Main Server Action
// ===========================================

/**
 * Process a WhatsApp image message and extract calendar events
 */
export async function processVisionMessage(
  input: ProcessVisionInput
): Promise<ProcessVisionResult> {
  const { mediaId, userId, householdId, mimeType } = input;

  console.log(`[VisionAgent] Processing image ${mediaId} for user ${userId}`);

  try {
    // Step 1: Download image from WhatsApp
    const imageBuffer = await downloadWhatsAppMedia(mediaId);
    console.log(`[VisionAgent] Downloaded image: ${imageBuffer.length} bytes`);

    // Step 2: Extract events using GPT-4o Vision
    const extraction = await extractEventsFromImage(imageBuffer, mimeType);

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

    // Step 3: Save events to database in parallel (instead of sequential N+1)
    const eventPromises = extraction.events.map(event => 
      createEvent(householdId, userId, {
        title: event.title,
        event_date: event.event_date,
        event_time: event.event_time ?? undefined,
        end_time: event.end_time ?? undefined,
        is_all_day: event.is_all_day,
        family_member: event.family_member ?? undefined,
        location: event.location ?? undefined,
        description: event.description ?? undefined,
      })
    );

    const results = await Promise.allSettled(eventPromises);
    
    const savedEvents: VisionEvent[] = [];
    let eventsCreated = 0;
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        eventsCreated++;
        savedEvents.push(extraction.events[index]);
        console.log(`[VisionAgent] Created event: "${extraction.events[index].title}" on ${extraction.events[index].event_date}`);
      } else if (result.status === 'rejected') {
        console.error(`[VisionAgent] Failed to create event: ${extraction.events[index].title}`, result.reason);
      }
    });

    return {
      success: true,
      events: savedEvents,
      eventsCreated,
      documentType: extraction.document_type,
      clarificationNeeded: extraction.needs_clarification,
      clarificationQuestion: extraction.clarification_question ?? undefined,
    };

  } catch (error) {
    console.error('[VisionAgent] Processing error:', error);
    return {
      success: false,
      events: [],
      eventsCreated: 0,
      documentType: 'other',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process a local image buffer (for testing without WhatsApp)
 */
export async function processLocalImage(
  imageBuffer: Buffer,
  userId: string,
  householdId: string,
  mimeType: string = 'image/jpeg'
): Promise<ProcessVisionResult> {
  console.log(`[VisionAgent] Processing local image for user ${userId}`);

  try {
    const extraction = await extractEventsFromImage(imageBuffer, mimeType);

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

    // Save events to database in parallel
    const eventPromises = extraction.events.map(event =>
      createEvent(householdId, userId, {
        title: event.title,
        event_date: event.event_date,
        event_time: event.event_time ?? undefined,
        end_time: event.end_time ?? undefined,
        is_all_day: event.is_all_day,
        family_member: event.family_member ?? undefined,
        location: event.location ?? undefined,
        description: event.description ?? undefined,
      })
    );

    const results = await Promise.allSettled(eventPromises);
    
    const savedEvents: VisionEvent[] = [];
    let eventsCreated = 0;
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        eventsCreated++;
        savedEvents.push(extraction.events[index]);
      }
    });

    return {
      success: true,
      events: savedEvents,
      eventsCreated,
      documentType: extraction.document_type,
    };

  } catch (error) {
    console.error('[VisionAgent] Local processing error:', error);
    return {
      success: false,
      events: [],
      eventsCreated: 0,
      documentType: 'other',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
