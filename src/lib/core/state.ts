/**
 * Conversation State Management - Simplified
 * 
 * Simple in-memory state management for draft/confirm flow.
 * No persistence needed - states are transient (15 min TTL).
 */

import type { ConversationState, Channel } from './types';

interface StateEntry {
  state: ConversationState;
  expiresAt: number;
}

const stateStore = new Map<string, StateEntry>();

const STATE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const UNDO_TTL_MS = 30 * 1000; // 30 seconds for undo window

// Cleanup interval
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupInterval) return;
  
  // Double-checked locking pattern to prevent race condition
  const newInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of stateStore.entries()) {
      if (now > entry.expiresAt) {
        stateStore.delete(key);
      }
    }
  }, 60 * 1000);
  
  // Only assign if still null (second check)
  if (!cleanupInterval) {
    cleanupInterval = newInterval;
    if (cleanupInterval.unref) {
      cleanupInterval.unref();
    }
  } else {
    // Another call already created it
    clearInterval(newInterval);
  }
}

function getStateKey(userId: string, channel: Channel): string {
  return `conv:${userId}:${channel}`;
}

/**
 * Get current conversation state for a user
 */
export async function getConversationState(
  userId: string,
  channel: Channel
): Promise<ConversationState> {
  ensureCleanup();

  const key = getStateKey(userId, channel);
  const entry = stateStore.get(key);

  if (!entry || Date.now() > entry.expiresAt) {
    return { state: 'idle' };
  }

  return entry.state;
}

/**
 * Set conversation state for a user
 */
export async function setConversationState(
  userId: string,
  channel: Channel,
  state: ConversationState
): Promise<void> {
  ensureCleanup();

  const key = getStateKey(userId, channel);
  const ttl = state.state === 'awaiting_undo' ? UNDO_TTL_MS : STATE_TTL_MS;

  stateStore.set(key, {
    state,
    expiresAt: Date.now() + ttl,
  });

  console.log(`[State] Set ${key} to ${state.state} (TTL: ${ttl / 1000}s)`);
}

/**
 * Clear conversation state (reset to idle)
 */
export async function clearConversationState(
  userId: string,
  channel: Channel
): Promise<void> {
  const key = getStateKey(userId, channel);
  stateStore.delete(key);
  console.log(`[State] Cleared ${key}`);
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
