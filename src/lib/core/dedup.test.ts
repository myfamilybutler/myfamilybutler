import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAdminClientMock = vi.fn();

vi.mock('@/lib/supabase', () => ({
  getAdminClient: () => getAdminClientMock(),
}));

import { isMessageProcessed } from './dedup';

function createAdmin(options: {
  insertResult: { error: { code?: string; message?: string } | null };
  maybeSingleResult?: { data: { message_id: string } | null; error: { message?: string } | null };
}) {
  return {
    from: vi.fn().mockImplementation(() => ({
      insert: vi.fn().mockResolvedValue(options.insertResult),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue(options.maybeSingleResult ?? { data: null, error: null }),
          }),
        }),
      }),
    })),
  };
}

describe('isMessageProcessed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true for unique constraint duplicates', async () => {
    getAdminClientMock.mockReturnValue(
      createAdmin({
        insertResult: { error: { code: '23505' } },
      })
    );

    const isDup = await isMessageProcessed('m1', 'telegram');
    expect(isDup).toBe(true);
  });

  it('returns false for new messages', async () => {
    getAdminClientMock.mockReturnValue(
      createAdmin({
        insertResult: { error: null },
      })
    );

    const isDup = await isMessageProcessed('m2', 'telegram');
    expect(isDup).toBe(false);
  });

  it('fails safe when fallback existence check errors', async () => {
    getAdminClientMock.mockReturnValue(
      createAdmin({
        insertResult: { error: { code: '500', message: 'insert failed' } },
        maybeSingleResult: { data: null, error: { message: 'check failed' } },
      })
    );

    const isDup = await isMessageProcessed('m3', 'telegram');
    expect(isDup).toBe(true);
  });
});
