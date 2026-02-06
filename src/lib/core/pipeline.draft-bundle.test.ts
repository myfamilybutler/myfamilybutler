import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PipelineContext } from './types';

const mocks = vi.hoisted(() => ({
  parseEventWithFallback: vi.fn(),
  generateResponseWithFallback: vi.fn(),
  processBrain: vi.fn(),
  resolveConfirmationIntent: vi.fn(),
  createDraftBundle: vi.fn(),
  getDraftBundle: vi.fn(),
  getLatestPendingDraftBundle: vi.fn(),
  getLatestPendingDraftEvent: vi.fn(),
  confirmDraftBundle: vi.fn(),
  rejectDraftBundle: vi.fn(),
  applyDraftBundleModifications: vi.fn(),
  applyDraftEventModifications: vi.fn(),
  createEvent: vi.fn(),
  createEventsBulk: vi.fn(),
  createDraftEvent: vi.fn(),
  confirmDraftEvent: vi.fn(),
  rejectDraftEvent: vi.fn(),
  getDraftEvent: vi.fn(),
  deleteEvent: vi.fn(),
  getMessageHistory: vi.fn(),
  generateDashboardLinkForUser: vi.fn(),
  generateDashboardLink: vi.fn(),
  createEventReminder: vi.fn(),
  clearConversationState: vi.fn(),
  setUndoState: vi.fn(),
  setDraftPendingState: vi.fn(),
  setClarifyingState: vi.fn(),
  getAdapter: vi.fn(),
  logAIInteraction: vi.fn(),
}));

vi.mock('@/lib/ai', () => ({
  parseEventWithFallback: mocks.parseEventWithFallback,
  generateResponseWithFallback: mocks.generateResponseWithFallback,
}));

vi.mock('@/lib/ai/brain', () => ({
  processInput: mocks.processBrain,
}));

vi.mock('@/lib/ai/confirmation-resolver', () => ({
  resolveConfirmationIntent: mocks.resolveConfirmationIntent,
}));

vi.mock('@/lib/supabase', () => ({
  createEvent: mocks.createEvent,
  createEventsBulk: mocks.createEventsBulk,
  createDraftBundle: mocks.createDraftBundle,
  getDraftBundle: mocks.getDraftBundle,
  getLatestPendingDraftBundle: mocks.getLatestPendingDraftBundle,
  getLatestPendingDraftEvent: mocks.getLatestPendingDraftEvent,
  confirmDraftBundle: mocks.confirmDraftBundle,
  rejectDraftBundle: mocks.rejectDraftBundle,
  applyDraftBundleModifications: mocks.applyDraftBundleModifications,
  applyDraftEventModifications: mocks.applyDraftEventModifications,
  createDraftEvent: mocks.createDraftEvent,
  confirmDraftEvent: mocks.confirmDraftEvent,
  rejectDraftEvent: mocks.rejectDraftEvent,
  getDraftEvent: mocks.getDraftEvent,
  deleteEvent: mocks.deleteEvent,
  getMessageHistory: mocks.getMessageHistory,
  generateDashboardLinkForUser: mocks.generateDashboardLinkForUser,
  generateDashboardLink: mocks.generateDashboardLink,
  createEventReminder: mocks.createEventReminder,
}));

vi.mock('./gateway', () => ({
  getAdapter: mocks.getAdapter,
}));

vi.mock('./state', () => ({
  clearConversationState: mocks.clearConversationState,
  setUndoState: mocks.setUndoState,
  setDraftPendingState: mocks.setDraftPendingState,
  setClarifyingState: mocks.setClarifyingState,
}));

vi.mock('@/lib/ai/logging', () => ({
  logAIInteraction: mocks.logAIInteraction,
}));

import { processMessage } from './pipeline';

function buildContext(overrides?: Partial<PipelineContext>): PipelineContext {
  return {
    message: {
      id: 'msg-1',
      userId: 'user-1',
      householdId: 'house-1',
      channel: 'telegram',
      type: 'text',
      content: 'training plan for undram',
      mediaRef: null,
      replyTo: null,
      timestamp: new Date('2026-02-06T10:00:00.000Z'),
      metadata: {
        channel: 'telegram',
        recipientId: 'telegram-chat-1',
        senderId: 'telegram-chat-1',
      },
      familyMembers: ['Undram'],
      isNewUser: false,
      wasIdentityLinked: false,
    },
    conversationState: { state: 'idle' },
    startTime: Date.now(),
    requestId: 'req-1',
    ...overrides,
  };
}

describe('pipeline draft bundle flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getMessageHistory.mockResolvedValue([]);
    mocks.generateDashboardLinkForUser.mockResolvedValue({ success: false, link: null });
    mocks.generateDashboardLink.mockResolvedValue({ success: false, link: null });
    mocks.logAIInteraction.mockResolvedValue(undefined);
    mocks.generateResponseWithFallback.mockResolvedValue('fallback');
    mocks.getLatestPendingDraftBundle.mockResolvedValue(null);
    mocks.getLatestPendingDraftEvent.mockResolvedValue(null);
  });

  it('creates a draft bundle for multi-event medium-confidence extraction', async () => {
    mocks.parseEventWithFallback.mockResolvedValue({
      events: [
        { title: 'Training (Undram)', event_date: '2026-02-09', event_time: '15:00', is_all_day: false },
        { title: 'Training (Undram)', event_date: '2026-02-10', event_time: '11:00', is_all_day: false },
      ],
      needs_clarification: false,
      intent_type: 'calendar_event',
      confidence: 0.6,
    });
    mocks.createDraftBundle.mockResolvedValue({ bundleId: 'bundle-1', eventCount: 2 });

    const result = await processMessage(buildContext());

    expect(mocks.createDraftBundle).toHaveBeenCalledTimes(1);
    expect(mocks.setDraftPendingState).toHaveBeenCalledWith('user-1', 'telegram', 'bundle-1', { isBundle: true });
    expect(result.success).toBe(true);
    expect(result.eventsCreated).toBe(0);
    expect(result.response.text).toContain('2');
    expect(result.response.buttons?.map((b) => b.id)).toEqual(['confirm', 'modify']);
  });

  it('confirms whole bundle on short yes reply and does not re-parse', async () => {
    mocks.getDraftBundle.mockResolvedValue({
      bundle: { id: 'bundle-1', household_id: 'house-1', created_by: 'user-1', status: 'pending', reason: 'low_confidence', confidence: 0.6, created_at: '', expires_at: '' },
      events: [
        { id: 'd1', bundle_id: 'bundle-1', title: 'Training (Undram)', event_date: '2026-02-09', event_time: '15:00', is_all_day: false, confidence: 0.6, reason: 'low_confidence' },
        { id: 'd2', bundle_id: 'bundle-1', title: 'Training (Undram)', event_date: '2026-02-10', event_time: '11:00', is_all_day: false, confidence: 0.6, reason: 'low_confidence' },
      ],
    });
    mocks.resolveConfirmationIntent.mockResolvedValue({ intent: 'confirm' });
    mocks.confirmDraftBundle.mockResolvedValue([
      { id: 'e1', title: 'Training (Undram)', event_date: '2026-02-09', event_time: '15:00', is_all_day: false },
      { id: 'e2', title: 'Training (Undram)', event_date: '2026-02-10', event_time: '11:00', is_all_day: false },
    ]);

    const result = await processMessage(buildContext({
      message: { ...buildContext().message, content: 'ja' },
      conversationState: { state: 'draft_pending', draftBundleId: 'bundle-1' },
    }));

    expect(mocks.parseEventWithFallback).not.toHaveBeenCalled();
    expect(mocks.confirmDraftBundle).toHaveBeenCalledWith('bundle-1', 'house-1', 'user-1');
    expect(mocks.clearConversationState).toHaveBeenCalledWith('user-1', 'telegram');
    expect(result.eventsCreated).toBe(2);
    expect(result.response.text).toContain('2');
  });

  it('rejects bundle on no reply and avoids draft loop', async () => {
    mocks.getDraftBundle.mockResolvedValue({
      bundle: { id: 'bundle-1', household_id: 'house-1', created_by: 'user-1', status: 'pending', reason: 'low_confidence', confidence: 0.6, created_at: '', expires_at: '' },
      events: [
        { id: 'd1', bundle_id: 'bundle-1', title: 'Training (Undram)', event_date: '2026-02-09', event_time: '15:00', is_all_day: false, confidence: 0.6, reason: 'low_confidence' },
      ],
    });
    mocks.resolveConfirmationIntent.mockResolvedValue({ intent: 'reject' });
    mocks.rejectDraftBundle.mockResolvedValue(true);

    const result = await processMessage(buildContext({
      message: { ...buildContext().message, content: 'no' },
      conversationState: { state: 'draft_pending', draftBundleId: 'bundle-1' },
    }));

    expect(mocks.rejectDraftBundle).toHaveBeenCalledWith('bundle-1', 'house-1');
    expect(mocks.parseEventWithFallback).not.toHaveBeenCalled();
    expect(result.response.text.toLowerCase()).toContain('verworfen');
  });

  it('applies modify_specific patch to bundle and returns updated preview', async () => {
    mocks.getDraftBundle.mockResolvedValue({
      bundle: { id: 'bundle-1', household_id: 'house-1', created_by: 'user-1', status: 'pending', reason: 'low_confidence', confidence: 0.6, created_at: '', expires_at: '' },
      events: [
        { id: 'd1', bundle_id: 'bundle-1', title: 'Training (Undram)', event_date: '2026-02-10', event_time: '11:00', is_all_day: false, confidence: 0.6, reason: 'low_confidence' },
      ],
    });
    mocks.resolveConfirmationIntent.mockResolvedValue({
      intent: 'modify_specific',
      modifications: [{ field: 'time', newValue: '16:30' }],
    });
    mocks.applyDraftBundleModifications.mockResolvedValue({
      ambiguousTarget: false,
      events: [
        { id: 'd1', bundle_id: 'bundle-1', title: 'Training (Undram)', event_date: '2026-02-10', event_time: '16:30', is_all_day: false, confidence: 0.6, reason: 'low_confidence' },
      ],
    });

    const result = await processMessage(buildContext({
      message: { ...buildContext().message, content: 'Dienstag auf 16:30 ändern' },
      conversationState: { state: 'draft_pending', draftBundleId: 'bundle-1' },
    }));

    expect(mocks.applyDraftBundleModifications).toHaveBeenCalled();
    expect(result.response.text).toContain('16:30');
    expect(result.response.buttons?.map((b) => b.id)).toEqual(['confirm', 'modify', 'discard']);
  });

  it('recovers pending bundle when state is missing and user sends short reply', async () => {
    mocks.getLatestPendingDraftBundle.mockResolvedValue({ bundleId: 'bundle-1', eventCount: 2 });
    mocks.getDraftBundle.mockResolvedValue({
      bundle: { id: 'bundle-1', household_id: 'house-1', created_by: 'user-1', status: 'pending', reason: 'low_confidence', confidence: 0.6, created_at: '', expires_at: '' },
      events: [
        { id: 'd1', bundle_id: 'bundle-1', title: 'Training (Undram)', event_date: '2026-02-09', event_time: '15:00', is_all_day: false, confidence: 0.6, reason: 'low_confidence' },
      ],
    });
    mocks.resolveConfirmationIntent.mockResolvedValue({ intent: 'confirm' });
    mocks.confirmDraftBundle.mockResolvedValue([
      { id: 'e1', title: 'Training (Undram)', event_date: '2026-02-09', event_time: '15:00', is_all_day: false },
    ]);

    const result = await processMessage(buildContext({
      message: { ...buildContext().message, content: 'ja' },
      conversationState: { state: 'idle' },
    }));

    expect(mocks.getLatestPendingDraftBundle).toHaveBeenCalledWith('house-1', 'user-1');
    expect(mocks.setDraftPendingState).toHaveBeenCalledWith('user-1', 'telegram', 'bundle-1', { isBundle: true });
    expect(mocks.confirmDraftBundle).toHaveBeenCalledWith('bundle-1', 'house-1', 'user-1');
    expect(mocks.parseEventWithFallback).not.toHaveBeenCalled();
    expect(result.eventsCreated).toBe(1);
  });
});
