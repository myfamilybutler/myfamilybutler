// ===========================================
// 360dialog WhatsApp Webhook Handler
// ===========================================
// Clean, modular handler using separated channel logic
import { NextRequest, NextResponse } from 'next/server';
import { isProviderEnabled } from '@/lib/channels/providers.config';
import { mark360DialogMessageAsRead, send360DialogMessage } from '@/lib/channels/360dialog/send';
import { processImage, processVoice } from '@/lib/channels/360dialog/media';
import { processCommand } from '@/lib/channels/base/commands';
import { maskPhone } from '@/lib/utils/security';
import { findOrCreateUser, logMessage, getAdminClient } from '@/lib/supabase';
import { generateResponseWithFallback, parseEventWithFallback } from '@/lib/ai';
import { createEvent } from '@/lib/supabase';
import { send360DialogInteractiveMessage } from '@/lib/channels/360dialog/send';

// ===========================================
// Deduplication
// ===========================================
const PROCESSED_MESSAGES = new Map<string, number>();
const MESSAGE_TTL_MS = 5 * 60 * 1000;
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
    if (cleanupInterval.unref) cleanupInterval.unref();
  }
}

function isDuplicateMessage(messageId: string): boolean {
  ensureCleanupInterval();
  if (PROCESSED_MESSAGES.has(messageId)) return true;
  PROCESSED_MESSAGES.set(messageId, Date.now());
  return false;
}

// ===========================================
// Types (360dialog uses Meta Cloud API format)
// ===========================================

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

interface D360WebhookBody {
  object: 'whatsapp_business_account';
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: 'whatsapp';
        metadata: { display_phone_number: string; phone_number_id: string };
        contacts?: D360Contact[];
        messages?: D360Message[];
        statuses?: Array<{ id: string; status: string; timestamp: string; recipient_id: string }>;
      };
      field: 'messages';
    }>;
  }>;
}

// ===========================================
// Webhook Endpoint
// ===========================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Check if provider is enabled
  if (!isProviderEnabled('360dialog')) {
    console.log('[360dialog] Provider disabled, ignoring webhook');
    return NextResponse.json({ success: true });
  }

  try {
    const body = await request.json() as D360WebhookBody;

    // Extract messages from webhook payload
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    if (!value?.messages || value.messages.length === 0) {
      // Status update or no messages - acknowledge
      return NextResponse.json({ success: true });
    }

    // Process each message
    for (const message of value.messages) {
      const contact = value.contacts?.[0];
      await processMessage(message, contact);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[360dialog] Webhook error:', error);
    return NextResponse.json({ success: true, error: 'Processing error' });
  }
}

// ===========================================
// Message Processing (Clean Router)
// ===========================================

async function processMessage(message: D360Message, contact?: D360Contact): Promise<void> {
  try {
    const phoneNumber = message.from;
    const messageId = message.id;
    const contactName = contact?.profile?.name;

    console.log(`[360dialog] Processing ${message.type} from ${maskPhone(phoneNumber)} (${contactName || 'Unknown'})`);

    // Deduplication
    if (isDuplicateMessage(messageId)) {
      console.log(`[360dialog] Duplicate message ignored: ${messageId}`);
      return;
    }

    // Mark as read (fire and forget)
    mark360DialogMessageAsRead(messageId).catch(() => { /* ignored */ });

    // Find or create user
    const { user } = await findOrCreateUser(phoneNumber, '360dialog');
    if (!user) {
      console.error(`[360dialog] Failed to find/create user: ${phoneNumber}`);
      await send360DialogMessage(phoneNumber, 'Es gab einen Fehler. Bitte versuche es später erneut.');
      return;
    }

    // Mark user as WhatsApp verified
    if (!user.whatsapp_verified) {
      const admin = getAdminClient();
      await admin.from('users').update({ whatsapp_verified: true }).eq('id', user.id);
    }

    const context = {
      userId: user.id,
      phoneNumber,
      householdId: user.household_id ?? null,
      messageId,
    };

    // ===== ROUTE BY MESSAGE TYPE =====

    // 1. Image messages → Vision AI
    if (message.type === 'image' && message.image?.id) {
      await processImage(
        message.image.id,
        message.image.mime_type || 'image/jpeg',
        message.image.caption,
        context
      );
      return;
    }

    // 2. Voice messages → Whisper + AI
    if (message.type === 'audio' && message.audio?.id) {
      await processVoice(
        message.audio.id,
        message.audio.mime_type || 'audio/ogg',
        context
      );
      return;
    }

    // 3. Text/Interactive → Extract text and process
    const messageText = extractTextContent(message);
    if (!messageText) {
      console.warn('[360dialog] Empty message content');
      return;
    }

    console.log(`[360dialog] Text: "${messageText}"`);

    // 4. Check for commands (dashboard, help, start, new_event)
    const commandResult = await processCommand(messageText, {
      userId: user.id,
      phoneNumber,
      channel: '360dialog',
    });

    if (commandResult.handled && commandResult.response) {
      await send360DialogMessage(phoneNumber, commandResult.response);
      await logMessage(user.id, 'user', messageText, 'text', messageId, '360dialog');
      await logMessage(user.id, 'assistant', commandResult.response, 'text', undefined, '360dialog');
      return;
    }

    // 5. AI processing for regular text
    await logMessage(user.id, 'user', messageText, 'text', messageId, '360dialog');

    if (!user.household_id) {
      // Send welcome with interactive buttons for new users
      await send360DialogInteractiveMessage(phoneNumber,
        `👋 *Willkommen bei My Family Butler!*\n\nIch bin dein Familienassistent. Um loszulegen, erstelle zuerst dein Dashboard.`,
        [{ id: 'dashboard', title: '📅 Dashboard' }, { id: 'help', title: '❓ Hilfe' }]
      );
      return;
    }

    // Parse for events
    const extraction = await parseEventWithFallback(messageText, undefined, []);

    if (extraction.events.length > 0 && (extraction.confidence ?? 0.75) >= 0.70) {
      // Save events
      const savedEvents: string[] = [];
      for (const event of extraction.events) {
        const created = await createEvent(user.household_id, user.id, {
          title: event.title,
          event_date: event.event_date,
          event_time: event.event_time ?? undefined,
          end_time: event.end_time ?? undefined,
          is_all_day: event.is_all_day,
          family_member: event.family_member ?? undefined,
          location: event.location ?? undefined,
          description: event.description ?? undefined,
        });
        if (created) savedEvents.push(`• ${event.title} (${event.event_date})`);
      }

      if (savedEvents.length > 0) {
        const response = `✅ *${savedEvents.length} Termin(e) erstellt!*\n\n${savedEvents.join('\n')}`;
        await send360DialogInteractiveMessage(phoneNumber, response, [
          { id: 'dashboard', title: '📅 Kalender' },
          { id: 'new_event', title: '➕ Neuer Termin' },
        ]);
        await logMessage(user.id, 'assistant', response, 'text', undefined, '360dialog');
        return;
      }
    }

    // Fall back to AI chat response
    const aiResponse = await generateResponseWithFallback([], messageText);
    await send360DialogMessage(phoneNumber, aiResponse);
    await logMessage(user.id, 'assistant', aiResponse, 'text', undefined, '360dialog');

  } catch (err) {
    console.error('[360dialog] Critical error:', err);
  }
}

// ===========================================
// Helpers
// ===========================================

function extractTextContent(message: D360Message): string {
  switch (message.type) {
    case 'text':
      return message.text?.body || '';
    case 'interactive':
      if (message.interactive?.button_reply) {
        const { id, title } = message.interactive.button_reply;
        console.log(`[360dialog] Button reply: "${title}" (id: ${id})`);
        return id;
      }
      if (message.interactive?.list_reply) {
        const { id, title } = message.interactive.list_reply;
        console.log(`[360dialog] List reply: "${title}" (id: ${id})`);
        return id;
      }
      return '';
    default:
      return '';
  }
}
