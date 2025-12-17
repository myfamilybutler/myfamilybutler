// ===========================================
// Telegram Bot API Integration
// ===========================================
// Documentation: https://core.telegram.org/bots/api

const BASE_URL = 'https://api.telegram.org';

/**
 * Send a text message via Telegram Bot API
 */
export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  options?: {
    parseMode?: 'Markdown' | 'HTML';
    replyToMessageId?: number;
  }
): Promise<{ success: boolean; messageId?: number; error?: string }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    console.error('Missing TELEGRAM_BOT_TOKEN environment variable');
    return { success: false, error: 'Missing Telegram bot configuration' };
  }

  console.log(`[Telegram] Sending message to ${chatId}`);

  try {
    const response = await fetch(
      `${BASE_URL}/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: options?.parseMode,
          reply_to_message_id: options?.replyToMessageId,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.ok) {
      console.error('[Telegram] API Error:', JSON.stringify(data, null, 2));
      return {
        success: false,
        error: data?.description || 'Failed to send message',
      };
    }

    console.log('[Telegram] Message sent successfully:', data?.result?.message_id);
    return {
      success: true,
      messageId: data?.result?.message_id,
    };
  } catch (error) {
    console.error('[Telegram] Send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Request phone number from user via contact button
 */
export async function requestPhoneNumber(
  chatId: string | number
): Promise<{ success: boolean; error?: string }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    return { success: false, error: 'Missing Telegram bot configuration' };
  }

  try {
    const response = await fetch(
      `${BASE_URL}/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: '📱 Bitte teile deine Telefonnummer, um fortzufahren.\n\nTippe auf den Button unten, um deine Nummer sicher zu teilen.',
          reply_markup: {
            keyboard: [
              [
                {
                  text: '📞 Telefonnummer teilen',
                  request_contact: true,
                },
              ],
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.ok) {
      return { success: false, error: data?.description };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Remove custom keyboard after phone number is received
 */
export async function removeKeyboard(
  chatId: string | number,
  text: string
): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) return;

  try {
    await fetch(
      `${BASE_URL}/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          reply_markup: {
            remove_keyboard: true,
          },
        }),
      }
    );
  } catch {
    // Ignore errors for keyboard removal
  }
}

/**
 * Set webhook URL for the Telegram bot
 */
export async function setTelegramWebhook(
  webhookUrl: string
): Promise<{ success: boolean; error?: string }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    return { success: false, error: 'Missing Telegram bot configuration' };
  }

  try {
    const response = await fetch(
      `${BASE_URL}/bot${botToken}/setWebhook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message'],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.ok) {
      return { success: false, error: data?.description };
    }

    console.log('[Telegram] Webhook set successfully');
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get current webhook info
 */
export async function getTelegramWebhookInfo(): Promise<{
  url?: string;
  pendingUpdateCount?: number;
  lastErrorMessage?: string;
} | null> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) return null;

  try {
    const response = await fetch(
      `${BASE_URL}/bot${botToken}/getWebhookInfo`
    );

    const data = await response.json();

    if (data.ok) {
      return {
        url: data.result.url,
        pendingUpdateCount: data.result.pending_update_count,
        lastErrorMessage: data.result.last_error_message,
      };
    }

    return null;
  } catch {
    return null;
  }
}
