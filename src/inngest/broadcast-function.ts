/**
 * Background broadcast function for admin mass-messaging.
 *
 * Mirrors the original synchronous /api/admin/broadcast logic but runs
 * asynchronously via Inngest so the HTTP request returns immediately.
 */

import { inngest } from '@/lib/inngest';
import type { BroadcastRequestedEvent } from '@/lib/inngest';
import { getAdminClient } from '@/lib/supabase';
import { sendWhatsAppMessage } from '@/lib/channels/whatsapp/send';
import { sendTelegramMessage } from '@/lib/channels/telegram/send';
import { logError } from '@/lib/utils/logger';

type BroadcastUser = {
  phone_number?: string | null;
  telegram_chat_id?: string | null;
  onboarding_source?: string | null;
};

const CHUNK_SIZE = 50;
const CHUNK_DELAY_MS = 500;

export const broadcastToAllUsers = inngest.createFunction(
  {
    id: 'broadcast-to-all-users',
    name: 'Broadcast to all users',
    retries: 3,
  },
  { event: 'admin/broadcast.requested' },
  async ({ event, step }) => {
    const {
      message,
      channel = 'all',
      channels,
      testOnly = false,
      requester,
    } = event.data as BroadcastRequestedEvent['data'];

    // Support both the legacy singular `channel` field and the newer `channels`
    // array while preserving the existing single-channel filtering behavior.
    const activeChannel =
      channels && channels.length > 0 ? channels[0] : channel;

    const admin = getAdminClient();

    const targetUsers = await step.run('fetch-recipients', async () => {
      if (testOnly) {
        return [requester] as BroadcastUser[];
      }

      let query = admin
        .from('users')
        .select('phone_number, telegram_chat_id, onboarding_source');

      if (activeChannel !== 'all') {
        query = query.eq('onboarding_source', activeChannel);
      }

      const { data, error } = await query;
      if (error) {
        throw error;
      }
      return (data || []) as BroadcastUser[];
    });

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < targetUsers.length; i += CHUNK_SIZE) {
      const chunk = targetUsers.slice(i, i + CHUNK_SIZE);

      const result = await step.run(`send-chunk-${i / CHUNK_SIZE + 1}`, async () => {
        let chunkSent = 0;
        let chunkFailed = 0;

        await Promise.all(
          chunk.map(async (user) => {
            try {
              let success = false;

              if (
                user.telegram_chat_id &&
                (activeChannel === 'all' || activeChannel === 'telegram')
              ) {
                const res = await sendTelegramMessage(
                  user.telegram_chat_id,
                  message
                );
                if (res.success) success = true;
              }

              if (
                !success &&
                user.phone_number &&
                (activeChannel === 'all' || activeChannel === 'whatsapp')
              ) {
                const res = await sendWhatsAppMessage(
                  user.phone_number,
                  message
                );
                if (res.success) success = true;
              }

              if (success) chunkSent++;
              else chunkFailed++;
            } catch (e) {
              chunkFailed++;
              logError('Broadcast send error', e);
            }
          })
        );

        return { sent: chunkSent, failed: chunkFailed };
      });

      sent += result.sent;
      failed += result.failed;

      // Preserve the original small delay between chunks.
      if (i + CHUNK_SIZE < targetUsers.length) {
        await step.sleep('wait-between-chunks', `${CHUNK_DELAY_MS}ms`);
      }
    }

    return {
      success: true,
      sent,
      failed,
      total: targetUsers.length,
    };
  }
);

export const broadcastFunctions = [broadcastToAllUsers];
