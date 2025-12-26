// ===========================================
// 360dialog WhatsApp Webhook Handler
// ===========================================
// 360dialog uses the same payload format as Meta Cloud API
import { NextRequest, NextResponse } from 'next/server';
import { processIncomingMessage } from '@/lib/channels/message-processor';
import { isProviderEnabled } from '@/lib/channels/providers.config';
import { mark360DialogMessageAsRead } from '@/lib/channels/three-sixty-dialog';
import { maskPhone } from '@/lib/utils/security';

// ===========================================
// Deduplication: Prevent processing same message twice
// ===========================================
const PROCESSED_MESSAGES = new Map<string, number>();
const MESSAGE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CLEANUP_INTERVAL_MS = 60 * 1000;

let cleanupInterval: ReturnType<typeof setInterval> | null = null;
function ensureCleanupInterval() {
  if (!cleanupInterval) {
    cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [id, timestamp] of PROCESSED_MESSAGES.entries()) {
        if (now - timestamp > MESSAGE_TTL_MS) {
          PROCESSED_MESSAGES.delete(id);
        }
      }
    }, CLEANUP_INTERVAL_MS);
    if (cleanupInterval.unref) {
      cleanupInterval.unref();
    }
  }
}

function isDuplicateMessage(messageId: string): boolean {
  ensureCleanupInterval();
  if (PROCESSED_MESSAGES.has(messageId)) {
    return true;
  }
  PROCESSED_MESSAGES.set(messageId, Date.now());
  return false;
}

// ===========================================
// Types (360dialog uses Meta Cloud API format)
// ===========================================

interface D360WebhookBody {
  object: 'whatsapp_business_account';
  entry: D360Entry[];
}

interface D360Entry {
  id: string;
  changes: D360Change[];
}

interface D360Change {
  value: D360Value;
  field: 'messages';
}

interface D360Value {
  messaging_product: 'whatsapp';
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: D360Contact[];
  messages?: D360Message[];
  statuses?: D360Status[];
}

interface D360Message {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'contacts' | 'interactive';
  text?: { body: string };
  image?: { caption?: string; mime_type: string; id: string };
  audio?: { mime_type: string; id: string };
  interactive?: {
    type: 'button_reply' | 'list_reply';
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
  };
}

interface D360Contact {
  profile: { name: string };
  wa_id: string;
}

interface D360Status {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
}

/**
 * GET - Webhook verification
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const challenge = searchParams.get('hub.challenge');

  if (challenge) {
    console.log('[360dialog] Webhook verification request');
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return NextResponse.json({ status: 'ok', provider: '360dialog' });
}

/**
 * POST - Handle incoming 360dialog webhook events
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Provider on/off switch
  if (!isProviderEnabled('360dialog')) {
    console.log('[360dialog] Provider disabled, returning 404');
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const body: D360WebhookBody = await request.json();

    console.log('[360dialog] Webhook received');

    if (body.object !== 'whatsapp_business_account') {
      console.log('[360dialog] Not a WhatsApp event, ignoring');
      return NextResponse.json({ success: true });
    }

    // Parse Meta-style nested structure
    for (const entry of body.entry) {
      for (const change of entry.changes) {
        if (change.field !== 'messages') continue;

        const value = change.value;

        // Handle status updates
        if (value.statuses) {
          for (const status of value.statuses) {
            console.log(`[360dialog] Status update: ${status.id} -> ${status.status}`);
          }
        }

        // Handle incoming messages
        if (value.messages) {
          console.log(`[360dialog] Processing ${value.messages.length} message(s)`);
          for (const message of value.messages) {
            await processMessage(message, value.contacts?.[0]);
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[360dialog] Webhook error:', error);
    return NextResponse.json({ success: true, error: 'Processing error' });
  }
}

/**
 * Process a single incoming message
 */
async function processMessage(
  message: D360Message,
  contact?: D360Contact
): Promise<void> {
  try {
    const phoneNumber = message.from;
    const messageId = message.id;
    const contactName = contact?.profile?.name;

    console.log(`[360dialog] Processing message from ${maskPhone(phoneNumber)} (${contactName || 'Unknown'})`);

    // Deduplication check
    if (isDuplicateMessage(messageId)) {
      console.log(`[360dialog] Duplicate message ignored: ${messageId}`);
      return;
    }

    // Mark message as read (async, don't wait)
    mark360DialogMessageAsRead(messageId).catch(() => { /* ignored */ });

    // Extract message content
    const { text: userMessage, type: messageType } = extractMessageContent(message);

    if (!userMessage) {
      console.warn('[360dialog] Empty message content');
      return;
    }

    console.log(`[360dialog] Message content: "${userMessage}" (${messageType})`);

    // Use unified message processor
    await processIncomingMessage({
      phoneNumber,
      userMessage,
      messageType,
      messageId,
      contactName,
      channel: '360dialog',
    });
  } catch (err) {
    console.error('[360dialog] Critical error processing message:', err);
  }
}

/**
 * Extract message content from 360dialog message object
 */
function extractMessageContent(message: D360Message): {
  text: string;
  type: 'text' | 'image' | 'voice';
} {
  switch (message.type) {
    case 'text':
      return { text: message.text?.body || '', type: 'text' };

    case 'image':
      return {
        text: message.image?.caption || '[Image received]',
        type: 'image'
      };

    case 'audio':
      return { text: '[Voice message received]', type: 'voice' };

    case 'interactive':
      // Handle button replies - use the button ID as the command
      if (message.interactive?.button_reply) {
        const buttonId = message.interactive.button_reply.id;
        const buttonTitle = message.interactive.button_reply.title;
        console.log(`[360dialog] Button reply received: "${buttonTitle}" (id: ${buttonId})`);
        return { text: buttonId, type: 'text' };
      }
      // Handle list replies
      if (message.interactive?.list_reply) {
        const listId = message.interactive.list_reply.id;
        const listTitle = message.interactive.list_reply.title;
        console.log(`[360dialog] List reply received: "${listTitle}" (id: ${listId})`);
        return { text: listId, type: 'text' };
      }
      return { text: '', type: 'text' };

    default:
      return { text: '', type: 'text' };
  }
}
