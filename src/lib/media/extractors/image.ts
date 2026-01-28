/**
 * Image Content Extractor
 * 
 * Extracts events from images using vision AI (Gemini/OpenAI).
 * Returns pre-extracted events rather than raw text.
 */

import type { ExtractionResult, MediaContext } from '../processor';
import type { ParsedEvent } from '@/lib/ai/types';

// Lazy load vision agent to avoid circular dependencies
let visionAgent: typeof import('@/lib/ai/agents/vision-agent') | null = null;

async function getVisionAgent() {
  if (!visionAgent) {
    visionAgent = await import('@/lib/ai/agents/vision-agent');
  }
  return visionAgent;
}

/**
 * Extract events from an image using vision AI
 */
export async function extractImageContent(
  buffer: Buffer,
  mimeType: string,
  context: MediaContext
): Promise<ExtractionResult> {
  void context;
  try {
    const agent = await getVisionAgent();
    
    // Build prompt
    const systemPrompt = agent.buildVisionAgentPrompt();
    
    // Try Gemini first, then OpenAI
    const extraction = await extractWithVision(buffer, mimeType, systemPrompt);
    
    if (!extraction || !extraction.events || extraction.events.length === 0) {
      return {
        text: '',
        documentType: extraction?.document_type || 'image',
        confidence: extraction?.confidence || 0.3,
        error: extraction?.needs_clarification 
          ? extraction.clarification_question || undefined
          : undefined,
      };
    }
    
    // Convert to ParsedEvent format
    const events: ParsedEvent[] = extraction.events.map(e => ({
      title: e.title,
      event_date: e.event_date,
      event_time: e.event_time ?? undefined,
      end_time: e.end_time ?? undefined,
      is_all_day: e.is_all_day,
      family_member: e.family_member ?? undefined,
      location: e.location ?? undefined,
      description: e.description ?? undefined,
    }));
    
    console.log(`[ImageExtractor] Extracted ${events.length} events with confidence ${extraction.confidence}`);
    
    return {
      text: '',
      events,
      documentType: extraction.document_type,
      confidence: extraction.confidence,
    };
    
  } catch (error) {
    console.error('[ImageExtractor] Processing error:', error);
    return {
      text: '',
      documentType: 'image_error',
      error: 'Could not process the image. Is the text clearly visible?',
    };
  }
}

/**
 * Call vision API (Gemini with OpenAI fallback)
 */
async function extractWithVision(
  buffer: Buffer,
  mimeType: string,
  systemPrompt: string
): Promise<{
  events: Array<{
    title: string;
    event_date: string;
    event_time?: string | null;
    end_time?: string | null;
    is_all_day: boolean;
    family_member?: string | null;
    location?: string | null;
    description?: string | null;
  }>;
  document_type: string;
  confidence: number;
  needs_clarification?: boolean;
  clarification_question?: string;
} | null> {
  const base64 = buffer.toString('base64');
  
  // Try Gemini first
  try {
    const geminiResult = await tryGeminiVision(base64, mimeType, systemPrompt);
    if (geminiResult) return geminiResult;
  } catch (error) {
    console.log('[ImageExtractor] Gemini failed, trying OpenAI:', error);
  }
  
  // Fallback to OpenAI
  try {
    return await tryOpenAIVision(base64, mimeType, systemPrompt);
  } catch (error) {
    console.error('[ImageExtractor] OpenAI also failed:', error);
    return null;
  }
}

async function tryGeminiVision(
  base64: string,
  mimeType: string,
  systemPrompt: string
): Promise<ReturnType<typeof extractWithVision> | null> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) return null;
  
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-3-flash-preview',
    generationConfig: { temperature: 0, maxOutputTokens: 4000 },
  });
  
  const result = await model.generateContent([
    systemPrompt + '\n\nBitte analysiere dieses Bild und extrahiere alle Kalendertermine. Antworte NUR mit JSON.',
    { inlineData: { mimeType, data: base64 } },
  ]);
  
  const text = result.response.text();
  if (!text) return null;
  
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}

async function tryOpenAIVision(
  base64: string,
  mimeType: string,
  systemPrompt: string
): Promise<ReturnType<typeof extractWithVision>> {
  const OpenAI = (await import('openai')).default;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Bitte analysiere dieses Bild und extrahiere alle Kalendertermine. Antworte NUR mit JSON.' },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'high' } },
        ],
      },
    ],
    max_tokens: 4000,
    temperature: 0,
    response_format: { type: 'json_object' },
  });
  
  const content = response.choices[0]?.message?.content;
  if (!content) return null;
  
  return JSON.parse(content);
}
