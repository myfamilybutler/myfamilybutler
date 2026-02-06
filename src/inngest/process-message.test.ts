import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sendMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
}));

vi.mock('@/lib/inngest', () => ({
  inngest: {
    createFunction: vi.fn(() => ({})),
    send: sendMock,
  },
}));

vi.mock('@/lib/core/gateway', () => ({
  processMessage: vi.fn(),
  registerAdapter: vi.fn(),
}));

vi.mock('@/lib/channels/whatsapp/adapter', () => ({ whatsappAdapter: { channel: 'whatsapp' } }));
vi.mock('@/lib/channels/telegram/adapter', () => ({ telegramAdapter: { channel: 'telegram' } }));
vi.mock('@/lib/channels/360dialog/adapter', () => ({ dialog360Adapter: { channel: '360dialog' } }));
vi.mock('@/lib/core/dead-letter-queue', () => ({ addToDeadLetterQueue: vi.fn() }));

import { enqueueMessage } from './process-message';

describe('enqueueMessage idempotency', () => {
  beforeEach(() => {
    sendMock.mockReset();
    sendMock.mockResolvedValue(undefined);
  });

  it('produces stable idempotency key for same channel + body', async () => {
    const payload = { a: 1 };
    const rawBody = '{"a":1}';

    const first = await enqueueMessage('telegram', payload, rawBody, null);
    const second = await enqueueMessage('telegram', payload, rawBody, null);

    expect(first.queued).toBe(true);
    expect(second.queued).toBe(true);
    expect(first.idempotencyKey).toBe(second.idempotencyKey);
  });

  it('produces different idempotency key when body changes', async () => {
    const first = await enqueueMessage('telegram', { a: 1 }, '{"a":1}', null);
    const second = await enqueueMessage('telegram', { a: 2 }, '{"a":2}', null);

    expect(first.idempotencyKey).not.toBe(second.idempotencyKey);
  });
});
