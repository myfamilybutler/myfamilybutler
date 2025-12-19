// ===========================================
// Meta WhatsApp Cloud API Integration
// ===========================================
// Documentation: https://developers.facebook.com/docs/whatsapp/cloud-api

import { fetchWithTimeout } from './fetch-utils';

const GRAPH_API_VERSION = 'v21.0';
const BASE_URL = 'https://graph.facebook.com';

/**
 * Send a text message via Meta WhatsApp Cloud API
 */
export async function sendWhatsAppMessage(
  to: string,
  text: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_ID;
  const accessToken = process.env.WHATSAPP_API_TOKEN;

  if (!phoneNumberId || !accessToken) {
    console.error('Missing Meta WhatsApp configuration');
    return { success: false, error: 'Missing Meta WhatsApp configuration' };
  }

  // Normalize phone number (remove + and non-digits)
  const normalizedTo = to.replace(/\D/g, '');

  console.log(`[WhatsApp] Sending message to ${normalizedTo}`);

  try {
    const response = await fetchWithTimeout(
      `${BASE_URL}/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: normalizedTo,
          type: 'text',
          text: { body: text },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('[WhatsApp] Meta API Error:', JSON.stringify(data, null, 2));
      return {
        success: false,
        error: data?.error?.message || 'Failed to send message',
      };
    }

    console.log('[WhatsApp] Message sent successfully:', data?.messages?.[0]?.id);
    return {
      success: true,
      messageId: data?.messages?.[0]?.id,
    };
  } catch (error) {
    console.error('[WhatsApp] Send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Mark a message as read (optional but good UX)
 */
export async function markMessageAsRead(messageId: string): Promise<boolean> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_ID;
  const accessToken = process.env.WHATSAPP_API_TOKEN;

  if (!phoneNumberId || !accessToken) {
    return false;
  }

  try {
    const response = await fetchWithTimeout(
      `${BASE_URL}/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
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
    console.error('[WhatsApp] Mark read error:', error);
    return false;
  }
}
