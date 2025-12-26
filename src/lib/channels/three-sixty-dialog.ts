// ===========================================
// 360dialog WhatsApp API Integration
// ===========================================
// Documentation: https://docs.360dialog.com
// Uses same WhatsApp Cloud API format as Meta

import { fetchWithTimeout } from '../utils/fetch';
import { maskPhone, truncateMessage, MAX_MESSAGE_LENGTH } from '../utils/security';

const DEFAULT_BASE_URL = 'https://waba.360dialog.io';

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
    console.error('[360dialog] Missing D360_API_KEY configuration');
    return { success: false, error: 'Missing 360dialog configuration' };
  }

  // Normalize phone number (remove + and non-digits)
  const normalizedTo = to.replace(/\D/g, '');
  
  // Truncate message to prevent API errors
  const truncatedText = truncateMessage(text, MAX_MESSAGE_LENGTH);

  console.log(`[360dialog] Sending message to ${maskPhone(normalizedTo)}`);

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
      console.error('[360dialog] API Error:', JSON.stringify(data, null, 2));
      return {
        success: false,
        error: data?.error?.message || data?.message || 'Failed to send message',
      };
    }

    console.log('[360dialog] Message sent successfully:', data?.messages?.[0]?.id);
    return {
      success: true,
      messageId: data?.messages?.[0]?.id,
    };
  } catch (error) {
    console.error('[360dialog] Send error:', error);
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
    console.error('[360dialog] Mark read error:', error);
    return false;
  }
}
