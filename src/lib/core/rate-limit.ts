import { getAdminClient } from '@/lib/supabase';

const WINDOW_MS = 60 * 1000;
const MAX_COUNT = 30;

export async function checkRateLimit(key: string): Promise<boolean> {
  const admin = getAdminClient();
  const now = new Date();

  const { data } = await admin
    .from('rate_limits')
    .select('count, window_start')
    .eq('key', key)
    .maybeSingle();

  if (!data) {
    await admin.from('rate_limits').insert({
      key,
      count: 1,
      window_start: now.toISOString(),
      expires_at: new Date(Date.now() + WINDOW_MS * 2).toISOString(),
    });
    return true;
  }

  const windowStart = new Date(data.window_start);
  if (now.getTime() - windowStart.getTime() > WINDOW_MS) {
    await admin.from('rate_limits').update({
      count: 1,
      window_start: now.toISOString(),
      expires_at: new Date(Date.now() + WINDOW_MS * 2).toISOString(),
    }).eq('key', key);
    return true;
  }

  if (data.count >= MAX_COUNT) {
    return false;
  }

  await admin.from('rate_limits').update({
    count: data.count + 1,
    expires_at: new Date(Date.now() + WINDOW_MS * 2).toISOString(),
  }).eq('key', key);

  return true;
}
