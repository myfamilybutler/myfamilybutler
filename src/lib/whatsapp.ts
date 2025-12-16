// ===========================================
// WaSenderAPI Integration
// ===========================================
// Documentation: https://wasenderapi.com
// This replaces the Meta WhatsApp Business Cloud API

const WASENDER_API_URL = process.env.WASENDER_API_URL || 'https://www.wasenderapi.com/api';

/**
 * Send a text message via WaSenderAPI
 */
// Request timeout for serverless environment (30 seconds)
const REQUEST_TIMEOUT_MS = 30000;

export async function sendWhatsAppMessage(
  to: string,
  text: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.WASENDER_API_KEY;

  if (!apiKey) {
    console.error('Missing WaSenderAPI configuration');
    return { success: false, error: 'Missing WaSenderAPI configuration' };
  }

  // Normalize phone number (remove + and ensure proper format)
  const normalizedTo = to.replace(/\D/g, '');

  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${WASENDER_API_URL}/send-message`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: normalizedTo,
        text: text,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok) {
      console.error('WaSenderAPI error:', data);
      return {
        success: false,
        error: data?.message || data?.error || 'Failed to send message',
      };
    }

    return {
      success: true,
      messageId: data?.messageId || data?.key?.id,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Handle abort specifically
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('WaSenderAPI request timed out');
      return { success: false, error: 'Request timed out' };
    }
    
    console.error('WaSenderAPI send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
