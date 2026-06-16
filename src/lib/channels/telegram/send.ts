// ===========================================
// Telegram Bot API Integration
// ===========================================
// Documentation: https://core.telegram.org/bots/api

import { fetchWithTimeout } from '../../utils/fetch';
import { maskChatId, truncateMessage, MAX_MESSAGE_LENGTH } from '../../utils/security';
import { log, logError } from '@/lib/utils/logger';

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
    logError('Missing TELEGRAM_BOT_TOKEN environment variable');
    return { success: false, error: 'Missing Telegram bot configuration' };
  }

  log.info(`[Telegram] Sending message to ${maskChatId(chatId)}`);
  
  // Truncate message to prevent API errors
  const truncatedText = truncateMessage(text, MAX_MESSAGE_LENGTH);

  try {
    const response = await fetchWithTimeout(
      `${BASE_URL}/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: truncatedText,
          parse_mode: options?.parseMode,
          reply_to_message_id: options?.replyToMessageId,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.ok) {
      logError('[Telegram] API Error:', JSON.stringify(data, null, 2));
      return {
        success: false,
        error: data?.description || 'Failed to send message',
      };
    }

    log.info('[Telegram] Message sent successfully:', data?.result?.message_id);
    return {
      success: true,
      messageId: data?.result?.message_id,
    };
  } catch (error) {
    logError('[Telegram] Send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * URL button for Telegram inline keyboard
 */
export interface TelegramUrlButton {
  text: string;
  url: string;
}

/**
 * Send a message with an inline keyboard URL button that opens a link when tapped.
 * Unlike reply keyboards, inline keyboards appear below the message.
 * @see https://core.telegram.org/bots/api#inlinekeyboardbutton
 */
export async function sendTelegramMessageWithUrlButton(
  chatId: string | number,
  text: string,
  button: TelegramUrlButton,
  options?: {
    parseMode?: 'Markdown' | 'HTML';
  }
): Promise<{ success: boolean; messageId?: number; error?: string }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    logError('Missing TELEGRAM_BOT_TOKEN environment variable');
    return { success: false, error: 'Missing Telegram bot configuration' };
  }

  log.info(`[Telegram] Sending URL button message to ${maskChatId(chatId)}`);
  
  const truncatedText = truncateMessage(text, MAX_MESSAGE_LENGTH);

  try {
    const response = await fetchWithTimeout(
      `${BASE_URL}/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: truncatedText,
          parse_mode: options?.parseMode,
          reply_markup: {
            inline_keyboard: [
              [{ text: button.text, url: button.url }],
            ],
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.ok) {
      logError('[Telegram] URL button API Error:', JSON.stringify(data, null, 2));
      // Fallback to text message with link
      return sendTelegramMessage(chatId, `${text}\n\n🔗 ${button.url}`, options);
    }

    log.info('[Telegram] URL button message sent:', data?.result?.message_id);
    return {
      success: true,
      messageId: data?.result?.message_id,
    };
  } catch (error) {
    logError('[Telegram] URL button send error:', error);
    // Fallback to text message with link
    return sendTelegramMessage(chatId, `${text}\n\n🔗 ${button.url}`);
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
    const response = await fetchWithTimeout(
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
    await fetchWithTimeout(
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
  } catch (error) {
    // Keyboard removal is non-critical, log for debugging only
    log.debug('[Telegram] Keyboard removal failed:', error);
  }
}

/**
 * Set webhook URL for the Telegram bot
 * Optionally includes secret_token for webhook verification
 */
export async function setTelegramWebhook(
  webhookUrl: string
): Promise<{ success: boolean; error?: string }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!botToken) {
    return { success: false, error: 'Missing Telegram bot configuration' };
  }

  try {
    const response = await fetchWithTimeout(
      `${BASE_URL}/bot${botToken}/setWebhook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message'],
          // Include secret_token for webhook verification if configured
          ...(webhookSecret && { secret_token: webhookSecret }),
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.ok) {
      return { success: false, error: data?.description };
    }

    log.info('[Telegram] Webhook set successfully', webhookSecret ? '(with secret_token)' : '');
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
    const response = await fetchWithTimeout(
      `${BASE_URL}/bot${botToken}/getWebhookInfo`,
      { method: 'GET' }
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
  } catch (error) {
    log.debug('[Telegram] getWebhookInfo failed:', error);
    return null;
  }
}

/**
 * Download a file from Telegram servers
 * Uses the Bot API to get file path, then downloads the actual file
 */
export async function downloadTelegramFile(fileId: string): Promise<Buffer | null> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    logError('[Telegram] Missing TELEGRAM_BOT_TOKEN');
    return null;
  }

  try {
    // Step 1: Get file path from Telegram
    const fileInfoResponse = await fetchWithTimeout(
      `${BASE_URL}/bot${botToken}/getFile`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: fileId }),
      }
    );

    const fileInfo = await fileInfoResponse.json();

    if (!fileInfo.ok || !fileInfo.result?.file_path) {
      logError('[Telegram] Failed to get file info:', fileInfo);
      return null;
    }

    const filePath = fileInfo.result.file_path;

    // Step 2: Download the actual file
    const fileResponse = await fetchWithTimeout(
      `${BASE_URL}/file/bot${botToken}/${filePath}`,
      { method: 'GET' }
    );

    if (!fileResponse.ok) {
      logError('[Telegram] Failed to download file:', fileResponse.status);
      return null;
    }

    const arrayBuffer = await fileResponse.arrayBuffer();
    return Buffer.from(arrayBuffer);

  } catch (error) {
    logError('[Telegram] Error downloading file:', error);
    return null;
  }
}
