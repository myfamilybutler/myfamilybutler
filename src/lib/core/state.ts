/**
 * Conversation State Management
 *
 * Persistent conversation state backed by Supabase so it works
 * reliably across server instances and restarts.
 */

import type { ConversationState, Channel } from './types';
import { getAdminClient } from '@/lib/supabase';

const STATE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const UNDO_TTL_MS = 30 * 1000; // 30 seconds for undo window
const CONVERSATION_STATE_TABLE = 'conversation_state';

function toIsoWithTtl(ttlMs: number): string {
  return new Date(Date.now() + ttlMs).toISOString();
}

function getTtlMs(state: ConversationState): number {
  return state.state === 'awaiting_undo' ? UNDO_TTL_MS : STATE_TTL_MS;
}

function serializeStateData(state: ConversationState): Record<string, unknown> {
  return {
    draftEventId: state.draftEventId ?? null,
    undoableEventId: state.undoableEventId ?? null,
    clarificationContext: state.clarificationContext ?? null,
    attempts: state.attempts ?? 0,
  };
}

function parseStateFromRow(row: {
  state: string;
  data: {
    draftEventId?: string | null;
    undoableEventId?: string | null;
    clarificationContext?: string | null;
    attempts?: number | null;
  } | null;
  expires_at: string;
}): ConversationState {
  const data = row.data ?? {};

  return {
    state: row.state as ConversationState['state'],
    draftEventId: data.draftEventId ?? undefined,
    undoableEventId: data.undoableEventId ?? undefined,
    clarificationContext: data.clarificationContext ?? undefined,
    attempts: typeof data.attempts === 'number' ? data.attempts : undefined,
    expiresAt: new Date(row.expires_at),
  };
}

/**
 * Get current conversation state for a user
 */
export async function getConversationState(
  userId: string,
  channel: Channel
): Promise<ConversationState> {
  const admin = getAdminClient();

  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await admin
      .from(CONVERSATION_STATE_TABLE)
      .select('state, data, expires_at')
      .eq('user_id', userId)
      .eq('channel', channel)
      .gte('expires_at', nowIso)
      .maybeSingle();

    if (error) {
      console.error('[State] Failed to fetch conversation state:', error);
      return { state: 'idle' };
    }

    if (!data) {
      return { state: 'idle' };
    }

    return parseStateFromRow(data);
  } catch (error) {
    console.error('[State] Unexpected fetch error:', error);
    return { state: 'idle' };
  }
}

/**
 * Set conversation state for a user
 */
export async function setConversationState(
  userId: string,
  channel: Channel,
  state: ConversationState
): Promise<void> {
  const admin = getAdminClient();
  const ttlMs = getTtlMs(state);

  try {
    const { error } = await admin
      .from(CONVERSATION_STATE_TABLE)
      .upsert(
        {
          user_id: userId,
          channel,
          state: state.state,
          data: serializeStateData(state),
          expires_at: toIsoWithTtl(ttlMs),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,channel',
        }
      );

    if (error) {
      console.error('[State] Failed to set conversation state:', error);
      return;
    }

    console.log(`[State] Set conv:${userId}:${channel} to ${state.state} (TTL: ${ttlMs / 1000}s)`);
  } catch (error) {
    console.error('[State] Unexpected set error:', error);
  }
}

/**
 * Clear conversation state (reset to idle)
 */
export async function clearConversationState(
  userId: string,
  channel: Channel
): Promise<void> {
  const admin = getAdminClient();

  try {
    const { error } = await admin
      .from(CONVERSATION_STATE_TABLE)
      .delete()
      .eq('user_id', userId)
      .eq('channel', channel);

    if (error) {
      console.error('[State] Failed to clear conversation state:', error);
      return;
    }

    console.log(`[State] Cleared conv:${userId}:${channel}`);
  } catch (error) {
    console.error('[State] Unexpected clear error:', error);
  }
}

/**
 * Set up undo window for a created event
 */
export async function setUndoState(
  userId: string,
  channel: Channel,
  eventId: string
): Promise<void> {
  await setConversationState(userId, channel, {
    state: 'awaiting_undo',
    undoableEventId: eventId,
    expiresAt: new Date(Date.now() + UNDO_TTL_MS),
  });
}

/**
 * Get undoable event ID if still in undo window
 */
export async function getUndoableEventId(
  userId: string,
  channel: Channel
): Promise<string | null> {
  const state = await getConversationState(userId, channel);
  
  if (state.state === 'awaiting_undo' && state.undoableEventId) {
    return state.undoableEventId;
  }
  
  return null;
}

/**
 * Set draft pending state
 */
export async function setDraftPendingState(
  userId: string,
  channel: Channel,
  draftEventId: string
): Promise<void> {
  await setConversationState(userId, channel, {
    state: 'draft_pending',
    draftEventId,
    attempts: 0,
  });
}

/**
 * Get pending draft ID
 */
export async function getPendingDraftId(
  userId: string,
  channel: Channel
): Promise<string | null> {
  const state = await getConversationState(userId, channel);
  
  if (state.state === 'draft_pending' && state.draftEventId) {
    return state.draftEventId;
  }
  
  return null;
}

/**
 * Set clarifying state
 */
export async function setClarifyingState(
  userId: string,
  channel: Channel,
  context: string
): Promise<void> {
  const current = await getConversationState(userId, channel);
  const attempts = (current.attempts ?? 0) + 1;
  
  // Cap at 3 attempts to prevent infinite loops
  if (attempts > 3) {
    console.warn(`[State] Max clarification attempts reached for ${userId}`);
    await clearConversationState(userId, channel);
    return;
  }
  
  await setConversationState(userId, channel, {
    state: 'clarifying',
    clarificationContext: context,
    attempts,
  });
}

/**
 * Get clarification context
 */
export async function getClarificationContext(
  userId: string,
  channel: Channel
): Promise<string | null> {
  const state = await getConversationState(userId, channel);
  
  if (state.state === 'clarifying' && state.clarificationContext) {
    return state.clarificationContext;
  }
  
  return null;
}

/**
 * Cleanup expired conversation states.
 * Useful for scheduled maintenance to keep table size under control.
 */
export async function cleanupExpiredConversationStates(): Promise<number> {
  const admin = getAdminClient();

  try {
    const { count, error } = await admin
      .from(CONVERSATION_STATE_TABLE)
      .delete({ count: 'exact' })
      .lt('expires_at', new Date().toISOString());

    if (error) {
      console.error('[State] Failed to cleanup expired states:', error);
      return 0;
    }

    const deleted = count ?? 0;
    if (deleted > 0) {
      console.log(`[State] Cleaned up ${deleted} expired conversation states`);
    }
    return deleted;
  } catch (error) {
    console.error('[State] Unexpected cleanup error:', error);
    return 0;
  }
}
