// ===========================================
// Telegram Bot Webhook Handler
// ===========================================
import { NextRequest, NextResponse } from 'next/server';
import type { TelegramUpdate } from '@/types';
import { unifiedFindOrCreateUser, findUserByIdentifier } from '@/lib/supabase';
import { handleTelegramPhoneReceived } from '@/lib/channels/telegram/onboarding';
import { gateway } from '@/lib/core';
import { enqueueMessage } from '@/inngest/process-message';
import { requestPhoneNumber, sendTelegramMessage } from '@/lib/channels/telegram/send';
import { telegramAdapter } from '@/lib/channels/telegram/adapter';
import { isProviderEnabled } from '@/lib/channels/providers.config';
import { verifyTelegramSecretToken, maskChatId } from '@/lib/utils/security';
import { trackIdentityLinked, trackUserCreated, trackDuplicatePrevented } from '@/lib/analytics';
import { log, logError, logWarn } from '@/lib/utils/logger';

// Ensure adapter registered once
let telegramAdapterRegistered = false;
function ensureTelegramAdapter() {
  if (!telegramAdapterRegistered) {
    gateway.registerAdapter(telegramAdapter);
    telegramAdapterRegistered = true;
  }
}

// Temporary storage for pending phone verifications.
// NOTE: This is in-memory only and is not shared across serverless instances.
// It is bounded below to avoid unbounded memory growth.
const PENDING_PHONE_REQUESTS = new Map<number, { timestamp: number }>();
const PENDING_TTL_MS = 30 * 60 * 1000; // 30 minutes
const PENDING_MAX_SIZE = 1000;

function cleanupPendingRequests(): void {
  const now = Date.now();
  for (const [id, data] of PENDING_PHONE_REQUESTS.entries()) {
    if (now - data.timestamp > PENDING_TTL_MS) {
      PENDING_PHONE_REQUESTS.delete(id);
    }
  }
  // If still too large, evict oldest entries.
  while (PENDING_PHONE_REQUESTS.size > PENDING_MAX_SIZE) {
    const oldest = PENDING_PHONE_REQUESTS.entries().next().value;
    if (oldest) {
      PENDING_PHONE_REQUESTS.delete(oldest[0]);
    } else {
      break;
    }
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isProviderEnabled('telegram')) {
    log.info('[Telegram Webhook] Provider disabled, ignoring webhook');
    return NextResponse.json({ ok: true });
  }

  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const receivedToken = request.headers.get('x-telegram-bot-api-secret-token');

  if (!webhookSecret && process.env.NODE_ENV === 'production') {
    logError('[Telegram Webhook] TELEGRAM_WEBHOOK_SECRET is required in production');
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  if (webhookSecret) {
    if (!verifyTelegramSecretToken(receivedToken, webhookSecret)) {
      logError('[Telegram Webhook] Invalid secret token - possible spoofed request');
      return NextResponse.json({ ok: false }, { status: 403 });
    }
    log.info('[Telegram Webhook] Secret token verified ✓');
  } else {
    logWarn('[Telegram Webhook] TELEGRAM_WEBHOOK_SECRET not set (non-production mode)');
  }

  try {
    const update: TelegramUpdate = await request.json();

    const message = update.message || update.edited_message;
    if (!message) {
      log.info('[Telegram Webhook] No message in update, ignoring');
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
        logError('[Telegram Webhook] Failed to create/find user for phone:', error);
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
      log.info(`[Telegram Webhook] User ${maskChatId(chatId)} not linked, requesting phone`);

      PENDING_PHONE_REQUESTS.set(chatId, { timestamp: Date.now() });
      cleanupPendingRequests();

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

    // Enqueue to Inngest for async processing so the webhook responds quickly.
    // This avoids Telegram timeouts and reduces the chance of duplicate side
    // effects from webhook retries. The gateway dedup layer still protects
    // against exact duplicate message IDs.
    const { queued } = await enqueueMessage('telegram', update, rawBody, signature);

    if (!queued) {
      // Fallback: process synchronously only if Inngest is unavailable.
      logWarn('[Telegram Webhook] Inngest enqueue failed, falling back to synchronous processing');
      await gateway.processMessage('telegram', update, rawBody, signature);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logError('[Telegram Webhook] Error:', error);
    return NextResponse.json({ ok: false, error: 'Processing error' }, { status: 500 });
  }
}
