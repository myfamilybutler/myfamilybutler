// ===========================================
// 360dialog WhatsApp API Integration
// ===========================================
// Documentation: https://docs.360dialog.com
// Uses same WhatsApp Cloud API format as Meta

import { fetchWithTimeout, isAllowedMediaUrl } from '@/lib/utils/fetch';
import { maskPhone, truncateMessage, MAX_MESSAGE_LENGTH } from '../../utils/security';
import { assertDownloadedMediaIsSafe } from '@/lib/utils/media';
import { log, logError } from '@/lib/utils/logger';

const DEFAULT_BASE_URL = 'https://waba.360dialog.io';

/**
 * Download media from 360dialog WhatsApp API
 * @see https://docs.360dialog.com/docs/360dialog-cloud-api/media
 */
export async function download360DialogMedia(
  mediaId: string,
  mimeType: string = 'application/octet-stream'
): Promise<Buffer> {
  const apiKey = process.env.D360_API_KEY;
  const baseUrl = process.env.D360_BASE_URL || DEFAULT_BASE_URL;

  if (!apiKey) {
    throw new Error('Missing D360_API_KEY environment variable');
  }

  // Step 1: Get the media URL from 360dialog
  const mediaInfoResponse = await fetchWithTimeout(
    `${baseUrl}/v1/media/${mediaId}`,
    {
      headers: {
        'D360-API-KEY': apiKey,
      },
    }
  );

  if (!mediaInfoResponse.ok) {
    const errorData = await mediaInfoResponse.text();
    throw new Error(`Failed to get media info: ${errorData}`);
  }

  const mediaInfo = await mediaInfoResponse.json() as { url: string; mime_type?: string };

  if (!mediaInfo.url) {
    throw new Error('No URL in media info response');
  }

  // Validate the media URL to prevent SSRF before following it.
  if (!(await isAllowedMediaUrl(mediaInfo.url))) {
    throw new Error('Media URL is not from an allowed endpoint');
  }

  // Step 2: Download the actual media file
  const mediaResponse = await fetchWithTimeout(mediaInfo.url, {
    headers: {
      'D360-API-KEY': apiKey,
    },
  });

  if (!mediaResponse.ok) {
    throw new Error(`Failed to download media: ${mediaResponse.status}`);
  }

  const arrayBuffer = await mediaResponse.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const validation = assertDownloadedMediaIsSafe(buffer, mimeType || mediaInfo.mime_type || 'application/octet-stream');
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  return buffer;
}

/**
 * Send a text message via 360dialog WhatsApp API
 */
export async function send360DialogMessage(
  to: string,
  text: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.D360_API_KEY;
  const baseUrl = process.env.D360_BASE_URL || DEFAULT_BASE_URL;

  if (!apiKey) {
    logError('[360dialog] Missing D360_API_KEY configuration');
    return { success: false, error: 'Missing 360dialog configuration' };
  }

  // Normalize phone number (remove + and non-digits)
  const normalizedTo = to.replace(/\D/g, '');
  
  // Truncate message to prevent API errors
  const truncatedText = truncateMessage(text, MAX_MESSAGE_LENGTH);

  log.info(`[360dialog] Sending message to ${maskPhone(normalizedTo)}`);

  try {
    const response = await fetchWithTimeout(
      `${baseUrl}/v1/messages`,
      {
        method: 'POST',
        headers: {
          'D360-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: normalizedTo,
          type: 'text',
          text: { body: truncatedText },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      logError('[360dialog] API Error:', JSON.stringify(data, null, 2));
      return {
        success: false,
        error: data?.error?.message || data?.message || 'Failed to send message',
      };
    }

    log.info('[360dialog] Message sent successfully:', data?.messages?.[0]?.id);
    return {
      success: true,
      messageId: data?.messages?.[0]?.id,
    };
  } catch (error) {
    logError('[360dialog] Send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Mark a message as read (optional but good UX)
 */
export async function mark360DialogMessageAsRead(messageId: string): Promise<boolean> {
  const apiKey = process.env.D360_API_KEY;
  const baseUrl = process.env.D360_BASE_URL || DEFAULT_BASE_URL;

  if (!apiKey) {
    return false;
  }

  try {
    const response = await fetchWithTimeout(
      `${baseUrl}/v1/messages`,
      {
        method: 'POST',
        headers: {
          'D360-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        }),
      }
    );

    return response.ok;
  } catch (error) {
    logError('[360dialog] Mark read error:', error);
    return false;
  }
}

/**
 * Quick Reply button for interactive messages
 */
export interface QuickReplyButton {
  id: string;
  title: string;
}

/**
 * Send an interactive message with Quick Reply buttons (max 3 buttons)
 */
export async function send360DialogInteractiveMessage(
  to: string,
  bodyText: string,
  buttons: QuickReplyButton[]
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.D360_API_KEY;
  const baseUrl = process.env.D360_BASE_URL || DEFAULT_BASE_URL;

  if (!apiKey) {
    logError('[360dialog] Missing D360_API_KEY configuration');
    return { success: false, error: 'Missing 360dialog configuration' };
  }

  // WhatsApp allows max 3 buttons
  const limitedButtons = buttons.slice(0, 3);

  // Normalize phone number (remove + and non-digits)
  const normalizedTo = to.replace(/\D/g, '');
  
  // Truncate body text
  const truncatedBody = truncateMessage(bodyText, MAX_MESSAGE_LENGTH);

  log.info(`[360dialog] Sending interactive message to ${maskPhone(normalizedTo)}`);

  try {
    const response = await fetchWithTimeout(
      `${baseUrl}/v1/messages`,
      {
        method: 'POST',
        headers: {
          'D360-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: normalizedTo,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: { text: truncatedBody },
            action: {
              buttons: limitedButtons.map(btn => ({
                type: 'reply',
                reply: { id: btn.id, title: btn.title.slice(0, 20) }, // Max 20 chars
              })),
            },
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      logError('[360dialog] Interactive API Error:', JSON.stringify(data, null, 2));
      // Fallback to text message if interactive fails
      return send360DialogMessage(to, bodyText);
    }

    log.info('[360dialog] Interactive message sent:', data?.messages?.[0]?.id);
    return {
      success: true,
      messageId: data?.messages?.[0]?.id,
    };
  } catch (error) {
    logError('[360dialog] Interactive send error:', error);
    // Fallback to text message
    return send360DialogMessage(to, bodyText);
  }
}

/**
 * URL button for opening links (dashboard, etc.)
 */
export interface UrlButton {
  title: string;
  url: string;
}

/**
 * Send a message with a CTA URL button that opens a link when tapped.
 * @see https://docs.360dialog.com/docs/360dialog-cloud-api/interactive-messages
 */
export async function send360DialogMessageWithUrlButton(
  to: string,
  bodyText: string,
  button: UrlButton
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.D360_API_KEY;
  const baseUrl = process.env.D360_BASE_URL || DEFAULT_BASE_URL;

  if (!apiKey) {
    logError('[360dialog] Missing D360_API_KEY configuration');
    return { success: false, error: 'Missing 360dialog configuration' };
  }

  const normalizedTo = to.replace(/\D/g, '');
  const truncatedBody = truncateMessage(bodyText, MAX_MESSAGE_LENGTH);

  log.info(`[360dialog] Sending CTA URL message to ${maskPhone(normalizedTo)}`);

  try {
    const response = await fetchWithTimeout(
      `${baseUrl}/v1/messages`,
      {
        method: 'POST',
        headers: {
          'D360-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: normalizedTo,
          type: 'interactive',
          interactive: {
            type: 'cta_url',
            body: { text: truncatedBody },
            action: {
              name: 'cta_url',
              parameters: {
                display_text: button.title.slice(0, 20), // Max 20 chars
                url: button.url,
              },
            },
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      logError('[360dialog] CTA URL API Error:', JSON.stringify(data, null, 2));
      // Fallback to text message with link
      return send360DialogMessage(to, `${bodyText}\n\n🔗 ${button.url}`);
    }

    log.info('[360dialog] CTA URL message sent:', data?.messages?.[0]?.id);
    return {
      success: true,
      messageId: data?.messages?.[0]?.id,
    };
  } catch (error) {
    logError('[360dialog] CTA URL send error:', error);
    // Fallback to text message with link
    return send360DialogMessage(to, `${bodyText}\n\n🔗 ${button.url}`);
  }
}
