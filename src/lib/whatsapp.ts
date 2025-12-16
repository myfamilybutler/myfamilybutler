// ===========================================
// WaSenderAPI Integration
// ===========================================
// Documentation: https://wasenderapi.com
// This replaces the Meta WhatsApp Business Cloud API

const WASENDER_API_URL = process.env.WASENDER_API_URL || 'https://www.wasenderapi.com/api';

/**
 * Send a text message via WaSenderAPI
 */
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
    });

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
    console.error('WaSenderAPI send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send an image via WaSenderAPI
 */
export async function sendWhatsAppImage(
  to: string,
  imageUrl: string,
  caption?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.WASENDER_API_KEY;

  if (!apiKey) {
    return { success: false, error: 'Missing WaSenderAPI configuration' };
  }

  const normalizedTo = to.replace(/\D/g, '');

  try {
    const response = await fetch(`${WASENDER_API_URL}/send-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: normalizedTo,
        image: imageUrl,
        caption: caption || '',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('WaSenderAPI image error:', data);
      return {
        success: false,
        error: data?.message || 'Failed to send image',
      };
    }

    return {
      success: true,
      messageId: data?.messageId || data?.key?.id,
    };
  } catch (error) {
    console.error('WaSenderAPI image send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send a document via WaSenderAPI
 */
export async function sendWhatsAppDocument(
  to: string,
  documentUrl: string,
  filename?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.WASENDER_API_KEY;

  if (!apiKey) {
    return { success: false, error: 'Missing WaSenderAPI configuration' };
  }

  const normalizedTo = to.replace(/\D/g, '');

  try {
    const response = await fetch(`${WASENDER_API_URL}/send-document`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: normalizedTo,
        document: documentUrl,
        filename: filename || 'document',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data?.message || 'Failed to send document',
      };
    }

    return {
      success: true,
      messageId: data?.messageId || data?.key?.id,
    };
  } catch (error) {
    console.error('WaSenderAPI document send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Mark a message as read (WaSenderAPI doesn't require this, but keeping for API compatibility)
 */
export async function markMessageAsRead(
  messageId: string
): Promise<boolean> {
  // WaSenderAPI automatically marks messages as read when you respond
  // This function is kept for API compatibility with existing code
  void messageId; // Parameter kept for API compatibility
  return true;
}

/**
 * Get session status from WaSenderAPI
 */
export async function getSessionStatus(): Promise<{
  connected: boolean;
  phone?: string;
  error?: string;
}> {
  const apiKey = process.env.WASENDER_API_KEY;

  if (!apiKey) {
    return { connected: false, error: 'Missing WaSenderAPI configuration' };
  }

  try {
    const response = await fetch(`${WASENDER_API_URL}/session/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        connected: false,
        error: data?.message || 'Failed to get session status',
      };
    }

    return {
      connected: data?.status === 'connected' || data?.connected === true,
      phone: data?.phone || data?.me?.user,
    };
  } catch (error) {
    console.error('WaSenderAPI session status error:', error);
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
