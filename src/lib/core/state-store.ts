import type { ConversationState, Channel } from './types';
import { getAdminClient } from '@/lib/supabase';

const STATE_TTL_MS = 15 * 60 * 1000;
const UNDO_TTL_MS = 30 * 1000;

function buildStateData(state: ConversationState): Record<string, unknown> {
  const { state: stateType, draftEventId, undoableEventId, clarificationContext, attempts } = state;
  return {
    stateType,
    draftEventId,
    undoableEventId,
    clarificationContext,
    attempts,
  };
}

function hydrateState(stateType: string, data: Record<string, unknown> | null): ConversationState {
  return {
    state: stateType as ConversationState['state'],
    draftEventId: data?.draftEventId as string | undefined,
    undoableEventId: data?.undoableEventId as string | undefined,
    clarificationContext: data?.clarificationContext as string | undefined,
    attempts: data?.attempts as number | undefined,
  };
}

export async function getStoredConversationState(
  userId: string,
  channel: Channel
): Promise<ConversationState | null> {
  const admin = getAdminClient();

  const { data, error } = await admin
    .from('conversation_state')
    .select('state, data, expires_at')
    .eq('user_id', userId)
    .eq('channel', channel)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  if (new Date(data.expires_at) <= new Date()) {
    return null;
  }

  return hydrateState(data.state, data.data as Record<string, unknown> | null);
}

export async function setStoredConversationState(
  userId: string,
  channel: Channel,
  state: ConversationState
): Promise<void> {
  const admin = getAdminClient();
  const ttl = state.state === 'awaiting_undo' ? UNDO_TTL_MS : STATE_TTL_MS;
  const expiresAt = new Date(Date.now() + ttl).toISOString();

  await admin
    .from('conversation_state')
    .upsert({
      user_id: userId,
      channel,
      state: state.state,
      data: buildStateData(state),
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    });
}

export async function clearStoredConversationState(
  userId: string,
  channel: Channel
): Promise<void> {
  const admin = getAdminClient();
  await admin
    .from('conversation_state')
    .delete()
    .eq('user_id', userId)
    .eq('channel', channel);
}
