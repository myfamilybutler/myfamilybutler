// ===========================================
// Telegram Bot Webhook Handler
// ===========================================
import { NextRequest, NextResponse } from 'next/server';
import type { TelegramUpdate } from '@/types';
import { unifiedFindOrCreateUser, findUserByIdentifier } from '@/lib/supabase';
import { handleTelegramPhoneReceived } from '@/lib/channels/telegram/onboarding';
import { isMessageProcessed, gateway } from '@/lib/core';
import { requestPhoneNumber, sendTelegramMessage } from '@/lib/channels/telegram/send';
import { telegramAdapter } from '@/lib/channels/telegram/adapter';
import { enqueueMessage } from '@/inngest/process-message';
import { isProviderEnabled } from '@/lib/channels/providers.config';
import { verifyTelegramSecretToken, maskChatId } from '@/lib/utils/security';
import { trackIdentityLinked, trackUserCreated, trackDuplicatePrevented } from '@/lib/analytics';

// Ensure adapter registered once
let telegramAdapterRegistered = false;
function ensureTelegramAdapter() {
  if (!telegramAdapterRegistered) {
    gateway.registerAdapter(telegramAdapter);
    telegramAdapterRegistered = true;
  }
}

// Temporary storage for pending phone verifications
const PENDING_PHONE_REQUESTS = new Map<number, { timestamp: number }>();
const PENDING_TTL_MS = 30 * 60 * 1000; // 30 minutes

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isProviderEnabled('telegram')) {
    console.log('[Telegram Webhook] Provider disabled, ignoring webhook');
    return NextResponse.json({ ok: true });
  }

  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const receivedToken = request.headers.get('x-telegram-bot-api-secret-token');

  if (webhookSecret) {
    if (!verifyTelegramSecretToken(receivedToken, webhookSecret)) {
      console.error('[Telegram Webhook] Invalid secret token - possible spoofed request');
      return NextResponse.json({ ok: true });
    }
    console.log('[Telegram Webhook] Secret token verified ✓');
  } else {
    console.warn('[Telegram Webhook] TELEGRAM_WEBHOOK_SECRET not set - skipping verification');
  }

  try {
    const update: TelegramUpdate = await request.json();

    if (await isMessageProcessed(`tg_${update.update_id}`, 'telegram')) {
      console.log(`[Telegram Webhook] Duplicate update ignored: ${update.update_id}`);
      return NextResponse.json({ ok: true });
    }

    const message = update.message || update.edited_message;
    if (!message) {
      console.log('[Telegram Webhook] No message in update, ignoring');
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const firstName = message.from?.first_name || 'User';

    if (message.contact) {
      const phoneNumber = message.contact.phone_number;
      const { user, isNewUser, wasLinked, error } = await unifiedFindOrCreateUser({
        phone: phoneNumber,
        telegramChatId: chatId.toString(),
        displayName: firstName,
        channel: 'telegram',
        verifyPhone: true,
      });

      if (!user) {
        console.error('[Telegram Webhook] Failed to create/find user for phone:', error);
        await sendTelegramMessage(chatId, '❌ Fehler bei der Registrierung. Bitte versuche es später erneut.');
        return NextResponse.json({ ok: true });
      }

      PENDING_PHONE_REQUESTS.delete(chatId);

      if (wasLinked && !isNewUser) {
        trackIdentityLinked(user.id, 'telegram', 'telegram');
        await sendTelegramMessage(
          chatId,
          '✅ *Telegram verbunden!*\n\nDein Telegram wurde mit deinem bestehenden Account verknüpft. Schreib "dashboard" für deinen Dashboard-Link!',
          { parseMode: 'Markdown' }
        );
      } else if (isNewUser) {
        trackUserCreated(user.id, 'telegram', !!user.phone_number, !!user.linked_email, true);
        await handleTelegramPhoneReceived(chatId, firstName);
      } else {
        trackDuplicatePrevented(user.id, 'telegram', 'telegram');
        await sendTelegramMessage(chatId, `👋 Willkommen zurück, ${firstName}!`);
      }

      return NextResponse.json({ ok: true });
    }

    const linkedUser = await findUserByIdentifier({ telegramChatId: chatId.toString() });
    if (!linkedUser) {
      console.log(`[Telegram Webhook] User ${maskChatId(chatId)} not linked, requesting phone`);

      PENDING_PHONE_REQUESTS.set(chatId, { timestamp: Date.now() });
      const now = Date.now();
      for (const [id, data] of PENDING_PHONE_REQUESTS.entries()) {
        if (now - data.timestamp > PENDING_TTL_MS) {
          PENDING_PHONE_REQUESTS.delete(id);
        }
      }

      await requestPhoneNumber(chatId);
      return NextResponse.json({ ok: true });
    }

    if (!linkedUser.phone_number) {
      await requestPhoneNumber(chatId);
      return NextResponse.json({ ok: true });
    }

    ensureTelegramAdapter();

    const rawBody = JSON.stringify(update);
    const signature = request.headers.get('x-telegram-bot-api-secret-token');

    const queued = await enqueueMessage('telegram', update, rawBody, signature);
    if (!queued.queued) {
      console.warn('[Telegram Webhook] Queue unavailable, processing synchronously');
    }

    // Telegram expects near-real-time replies. Always process synchronously,
    // while queueing remains best-effort for retry/backfill resilience.
    await gateway.processMessage('telegram', update, rawBody, signature);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Telegram Webhook] Error:', error);
    return NextResponse.json({ ok: true });
  }
}
