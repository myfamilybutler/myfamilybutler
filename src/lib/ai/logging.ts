/**
 * AI Interactions Logging
 * 
 * Logs all AI calls for LLMOps observability and continuous improvement.
 * Used by message-processor to track:
 * - Input/output of every AI call
 * - Success/failure rates
 * - User feedback
 * - Performance metrics
 */

import { getAdminClient } from '@/lib/supabase';

// ===========================================
// Types
// ===========================================

export interface AIInteractionInput {
  userId?: string;
  channel: string;
  userMessage: string;
  messageType: 'text' | 'image' | 'voice';
  contextMessageCount: number;
  familyMembers: string[];
}

export interface AIInteractionOutput {
  promptVersion: string;
  model: string;
  aiOutput: unknown;
  intentDetected: string;
  eventsExtracted: number;
  actionTaken: string;
  entityCreatedId?: string;
  wasSuccessful: boolean;
  errorMessage?: string;
  latencyMs: number;
  tokensInput?: number;
  tokensOutput?: number;
  costUsd?: number;
}

export interface AIInteraction extends AIInteractionInput, AIInteractionOutput {
  id: string;
  createdAt: string;
  userFeedback?: 'positive' | 'negative';
  userCorrected: boolean;
}

// Prompt version tracking
export const PROMPT_VERSIONS = {
  eventExtraction: 'event-v1.0',
  reminderDetection: 'reminder-v1.0',
  responseGeneration: 'response-v1.0',
} as const;

// ===========================================
// Logging Functions
// ===========================================

/**
 * Log an AI interaction to the database
 */
export async function logAIInteraction(
  input: AIInteractionInput,
  output: AIInteractionOutput
): Promise<string | null> {
  const admin = getAdminClient();

  try {
    const { data, error } = await admin
      .from('ai_interactions')
      .insert({
        user_id: input.userId,
        channel: input.channel,
        user_message: input.userMessage,
        message_type: input.messageType,
        context_message_count: input.contextMessageCount,
        family_members: input.familyMembers,
        prompt_version: output.promptVersion,
        model: output.model,
        ai_output: output.aiOutput,
        intent_detected: output.intentDetected,
        events_extracted: output.eventsExtracted,
        action_taken: output.actionTaken,
        entity_created_id: output.entityCreatedId,
        was_successful: output.wasSuccessful,
        error_message: output.errorMessage,
        latency_ms: output.latencyMs,
        tokens_input: output.tokensInput,
        tokens_output: output.tokensOutput,
        cost_usd: output.costUsd,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[AI Logging] Failed to log interaction:', error);
      return null;
    }

    return data?.id || null;
  } catch (err) {
    console.error('[AI Logging] Error:', err);
    return null;
  }
}

/**
 * Update user feedback for an interaction
 * Called when user clicks 👍/👎 Quick Reply button
 */
export async function updateInteractionFeedback(
  interactionId: string,
  feedback: 'positive' | 'negative'
): Promise<boolean> {
  const admin = getAdminClient();

  try {
    const { error } = await admin
      .from('ai_interactions')
      .update({ user_feedback: feedback })
      .eq('id', interactionId);

    if (error) {
      console.error('[AI Logging] Failed to update feedback:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[AI Logging] Feedback error:', err);
    return false;
  }
}

/**
 * Mark an interaction as corrected by user
 * Called when user edits an event that was created by AI
 */
export async function markInteractionCorrected(
  entityId: string
): Promise<boolean> {
  const admin = getAdminClient();

  try {
    const { error } = await admin
      .from('ai_interactions')
      .update({ user_corrected: true })
      .eq('entity_created_id', entityId);

    if (error) {
      console.error('[AI Logging] Failed to mark corrected:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[AI Logging] Correction error:', err);
    return false;
  }
}

/**
 * Get recent interaction for a user (for feedback button mapping)
 */
export async function getRecentInteraction(
  userId: string,
  withinMinutes: number = 5
): Promise<string | null> {
  const admin = getAdminClient();

  try {
    const { data, error } = await admin
      .from('ai_interactions')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - withinMinutes * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[AI Logging] Failed to get recent:', error);
      return null;
    }

    return data?.id || null;
  } catch (err) {
    console.error('[AI Logging] Recent error:', err);
    return null;
  }
}

// ===========================================
// Helper: Measure AI call timing
// ===========================================

export function createTimer(): { stop: () => number } {
  const start = performance.now();
  return {
    stop: () => Math.round(performance.now() - start),
  };
}

// ===========================================
// Helper: Calculate token cost (approximate)
// ===========================================

const TOKEN_COSTS: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 }, // per 1K tokens
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gemini-2.0-flash': { input: 0.0, output: 0.0 }, // Free tier
  'gemini-1.5-pro': { input: 0.00125, output: 0.005 },
};

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const costs = TOKEN_COSTS[model];
  if (!costs) return 0;
  
  return (inputTokens / 1000) * costs.input + (outputTokens / 1000) * costs.output;
}
