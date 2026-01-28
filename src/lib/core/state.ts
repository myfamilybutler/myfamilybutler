/**
 * Conversation State Management - Phase 3.3
 * 
 * Manages conversation state for the draft/confirm flow.
 * Uses Redis when available, falls back to in-memory for development.
 */

import type { ConversationState, ConversationStateType, Channel } from './types';
import { getStoredConversationState, setStoredConversationState, clearStoredConversationState } from './state-store';

// ===========================================
// In-Memory State Store (Redis-ready pattern)
// ===========================================

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
  if (!cleanupInterval) {
    cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of stateStore.entries()) {
        if (now > entry.expiresAt) {
          stateStore.delete(key);
        }
      }
    }, 60 * 1000); // Cleanup every minute
    if (cleanupInterval.unref) {
      cleanupInterval.unref();
    }
  }
}

function getStateKey(userId: string, channel: Channel): string {
  return `conv:${userId}:${channel}`;
}

// ===========================================
// State Operations
// ===========================================

/**
 * Get current conversation state for a user
 */
export async function getConversationState(
  userId: string,
  channel: Channel
): Promise<ConversationState> {
  const stored = await getStoredConversationState(userId, channel);
  if (stored) {
    return stored;
  }

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

  await setStoredConversationState(userId, channel, state);

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
  await clearStoredConversationState(userId, channel);
  console.log(`[State] Cleared ${key}`);
}

/**
 * Transition state with validation
 */
export async function transitionState(
  userId: string,
  channel: Channel,
  newState: ConversationStateType,
  additionalData?: Partial<ConversationState>
): Promise<ConversationState> {
  const current = await getConversationState(userId, channel);
  
  // Validate state transitions
  const validTransitions: Record<ConversationStateType, ConversationStateType[]> = {
    'idle': ['parsing', 'draft_pending', 'clarifying'],
    'parsing': ['idle', 'draft_pending', 'clarifying', 'awaiting_confirmation', 'awaiting_undo'],
    'draft_pending': ['idle', 'awaiting_confirmation', 'clarifying'],
    'clarifying': ['idle', 'draft_pending', 'awaiting_confirmation', 'parsing'],
    'awaiting_confirmation': ['idle', 'draft_pending', 'clarifying'],
    'awaiting_undo': ['idle'],
  };
  
  const allowed = validTransitions[current.state] || ['idle'];
  if (!allowed.includes(newState)) {
    console.warn(`[State] Invalid transition: ${current.state} -> ${newState}, resetting to idle`);
    await clearConversationState(userId, channel);
    return { state: 'idle' };
  }
  
  const updatedState: ConversationState = {
    ...current,
    state: newState,
    ...additionalData,
    attempts: (additionalData?.attempts ?? current.attempts ?? 0),
  };
  
  await setConversationState(userId, channel, updatedState);
  return updatedState;
}

// ===========================================
// Undo State Management
// ===========================================

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

// ===========================================
// Draft State Management
// ===========================================

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

// ===========================================
// Clarification State Management
// ===========================================

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
