import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAdminClientMock = vi.fn();

vi.mock('@/lib/supabase', () => ({
  getAdminClient: () => getAdminClientMock(),
}));

import { checkRateLimit } from './rate-limit';

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads allowed=false from table-returning RPC shape', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ allowed: false }], error: null });
    getAdminClientMock.mockReturnValue({ rpc });

    const allowed = await checkRateLimit('user:1');

    expect(allowed).toBe(false);
  });

  it('reads allowed=true from object RPC shape', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { allowed: true }, error: null });
    getAdminClientMock.mockReturnValue({ rpc });

    const allowed = await checkRateLimit('user:1');

    expect(allowed).toBe(true);
  });

  it('fails open on RPC errors', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'db down' } });
    getAdminClientMock.mockReturnValue({ rpc });

    const allowed = await checkRateLimit('user:1');

    expect(allowed).toBe(true);
  });
});
