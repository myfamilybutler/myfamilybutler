// ===========================================
// WhatsApp Business Cloud API Integration
// ===========================================

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

/**
 * Send a text message via WhatsApp
 */
export async function sendWhatsAppMessage(
  to: string,
  text: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const token = process.env.WHATSAPP_API_TOKEN;

  if (!phoneId || !token) {
    console.error('Missing WhatsApp configuration');
    return { success: false, error: 'Missing WhatsApp configuration' };
  }

  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${phoneId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: {
            preview_url: false,
            body: text,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('WhatsApp API error:', errorData);
      return { 
        success: false, 
        error: errorData?.error?.message || 'Failed to send message' 
      };
    }

    const data = await response.json();
    return { 
      success: true, 
      messageId: data?.messages?.[0]?.id 
    };
  } catch (error) {
    console.error('WhatsApp send error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Download media from WhatsApp (for images, audio, etc.)
 */
export async function downloadWhatsAppMedia(
  mediaId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  const token = process.env.WHATSAPP_API_TOKEN;

  if (!token) {
    return { success: false, error: 'Missing WhatsApp token' };
  }

  try {
    // First, get the media URL
    const urlResponse = await fetch(
      `${WHATSAPP_API_URL}/${mediaId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!urlResponse.ok) {
      const errorData = await urlResponse.json();
      return { 
        success: false, 
        error: errorData?.error?.message || 'Failed to get media URL' 
      };
    }

    const urlData = await urlResponse.json();
    const mediaUrl = urlData.url;

    // Download the actual media
    const mediaResponse = await fetch(mediaUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!mediaResponse.ok) {
      return { success: false, error: 'Failed to download media' };
    }

    // For now, return the authenticated URL
    // In production, you might want to upload to your own storage
    return { success: true, url: mediaUrl };
  } catch (error) {
    console.error('WhatsApp media download error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Mark a message as read
 */
export async function markMessageAsRead(
  messageId: string
): Promise<boolean> {
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const token = process.env.WHATSAPP_API_TOKEN;

  if (!phoneId || !token) {
    return false;
  }

  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${phoneId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
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
    console.error('Error marking message as read:', error);
    return false;
  }
}

/**
 * Send a message template (for notifications, reminders)
 */
export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  languageCode: string = 'de',
  components?: Array<{
    type: 'header' | 'body' | 'button';
    parameters: Array<{ type: 'text'; text: string }>;
  }>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const token = process.env.WHATSAPP_API_TOKEN;

  if (!phoneId || !token) {
    return { success: false, error: 'Missing WhatsApp configuration' };
  }

  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${phoneId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: languageCode,
            },
            components,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return { 
        success: false, 
        error: errorData?.error?.message || 'Failed to send template' 
      };
    }

    const data = await response.json();
    return { 
      success: true, 
      messageId: data?.messages?.[0]?.id 
    };
  } catch (error) {
    console.error('WhatsApp template send error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
