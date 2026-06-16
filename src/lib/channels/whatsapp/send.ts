// ===========================================
// Meta WhatsApp Cloud API Integration
// ===========================================
// Documentation: https://developers.facebook.com/docs/whatsapp/cloud-api

import { fetchWithTimeout } from '../../utils/fetch';
import { maskPhone, truncateMessage, MAX_MESSAGE_LENGTH } from '../../utils/security';
import { log, logError } from '@/lib/utils/logger';

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
    logError('Missing Meta WhatsApp configuration');
    return { success: false, error: 'Missing Meta WhatsApp configuration' };
  }

  // Normalize phone number (remove + and non-digits)
  const normalizedTo = to.replace(/\D/g, '');
  
  // Truncate message to prevent API errors
  const truncatedText = truncateMessage(text, MAX_MESSAGE_LENGTH);

  log.info(`[WhatsApp] Sending message to ${maskPhone(normalizedTo)}`);

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
          text: { body: truncatedText },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      logError('[WhatsApp] Meta API Error:', JSON.stringify(data, null, 2));
      return {
        success: false,
        error: data?.error?.message || 'Failed to send message',
      };
    }

    log.info('[WhatsApp] Message sent successfully:', data?.messages?.[0]?.id);
    return {
      success: true,
      messageId: data?.messages?.[0]?.id,
    };
  } catch (error) {
    logError('[WhatsApp] Send error:', error);
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
    logError('[WhatsApp] Mark read error:', error);
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
export async function sendInteractiveMessage(
  to: string,
  bodyText: string,
  buttons: QuickReplyButton[]
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_ID;
  const accessToken = process.env.WHATSAPP_API_TOKEN;

  if (!phoneNumberId || !accessToken) {
    logError('Missing Meta WhatsApp configuration');
    return { success: false, error: 'Missing Meta WhatsApp configuration' };
  }

  // WhatsApp allows max 3 buttons
  const limitedButtons = buttons.slice(0, 3);

  // Normalize phone number (remove + and non-digits)
  const normalizedTo = to.replace(/\D/g, '');
  
  // Truncate body text
  const truncatedBody = truncateMessage(bodyText, MAX_MESSAGE_LENGTH);

  log.info(`[WhatsApp] Sending interactive message to ${maskPhone(normalizedTo)}`);

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
      logError('[WhatsApp] Interactive API Error:', JSON.stringify(data, null, 2));
      // Fallback to text message if interactive fails
      return sendWhatsAppMessage(to, bodyText);
    }

    log.info('[WhatsApp] Interactive message sent:', data?.messages?.[0]?.id);
    return {
      success: true,
      messageId: data?.messages?.[0]?.id,
    };
  } catch (error) {
    logError('[WhatsApp] Interactive send error:', error);
    // Fallback to text message
    return sendWhatsAppMessage(to, bodyText);
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
 * Unlike Quick Reply buttons which echo text, CTA URL buttons open the URL directly.
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/messages/interactive-cta-url-messages
 */
export async function sendMessageWithUrlButton(
  to: string,
  bodyText: string,
  button: UrlButton
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_ID;
  const accessToken = process.env.WHATSAPP_API_TOKEN;

  if (!phoneNumberId || !accessToken) {
    logError('Missing Meta WhatsApp configuration');
    return { success: false, error: 'Missing Meta WhatsApp configuration' };
  }

  const normalizedTo = to.replace(/\D/g, '');
  const truncatedBody = truncateMessage(bodyText, MAX_MESSAGE_LENGTH);

  log.info(`[WhatsApp] Sending CTA URL message to ${maskPhone(normalizedTo)}`);

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
      logError('[WhatsApp] CTA URL API Error:', JSON.stringify(data, null, 2));
      // Fallback to text message with link
      return sendWhatsAppMessage(to, `${bodyText}\n\n🔗 ${button.url}`);
    }

    log.info('[WhatsApp] CTA URL message sent:', data?.messages?.[0]?.id);
    return {
      success: true,
      messageId: data?.messages?.[0]?.id,
    };
  } catch (error) {
    logError('[WhatsApp] CTA URL send error:', error);
    // Fallback to text message with link
    return sendWhatsAppMessage(to, `${bodyText}\n\n🔗 ${button.url}`);
  }
}
