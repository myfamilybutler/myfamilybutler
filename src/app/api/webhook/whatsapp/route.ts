// ===========================================
// Meta WhatsApp Cloud API Webhook Handler
// ===========================================
import { NextRequest, NextResponse } from 'next/server';
import type { MetaWebhookBody, MetaMessage } from '@/types';
import {
  findOrCreateUser,
  logMessage,
  checkPendingInvite,
  acceptInvite
} from '@/lib/supabase';
import { getAdminClient } from '@/lib/supabase';
import { sendWhatsAppMessage, markMessageAsRead } from '@/lib/channels/whatsapp';
import { handleCommand } from '@/lib/channels/whatsapp-commands';
import { processIntents } from '@/lib/channels/whatsapp-intents';

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

/**
 * GET - Meta Webhook Verification
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  console.log('[Webhook] GET verification request:', { mode, token: token?.slice(0, 10) + '...', challenge });

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[Webhook] Verification successful!');
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  console.log('[Webhook] Verification failed - token mismatch');
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

/**
 * POST - Handle incoming Meta WhatsApp webhook events
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: MetaWebhookBody = await request.json();

    console.log('[Webhook] Received:', JSON.stringify(body, null, 2));

    if (body.object !== 'whatsapp_business_account') {
      console.log('[Webhook] Not a WhatsApp event, ignoring');
      return NextResponse.json({ success: true });
    }

    for (const entry of body.entry) {
      for (const change of entry.changes) {
        if (change.field !== 'messages') continue;

        const value = change.value;

        // Handle status updates
        if (value.statuses) {
          for (const status of value.statuses) {
            console.log(`[Webhook] Status update: ${status.id} -> ${status.status}`);
          }
          continue;
        }

        // Handle incoming messages
        if (value.messages) {
          for (const message of value.messages) {
            await processMessage(message, value.contacts?.[0]);
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Webhook] POST error:', error);
    return NextResponse.json({ success: true, error: 'Processing error' });
  }
}

/**
 * Process a single incoming message
 */
async function processMessage(
  message: MetaMessage,
  contact?: { profile: { name: string }; wa_id: string }
): Promise<void> {
  try {
    const phoneNumber = message.from;
    const messageId = message.id;
    const contactName = contact?.profile?.name;

    console.log(`[Webhook] Processing message from ${phoneNumber} (${contactName || 'Unknown'})`);

    // Deduplication check
    if (isDuplicateMessage(messageId)) {
      console.log(`[Webhook] Duplicate message ignored: ${messageId}`);
      return;
    }

    // Mark message as read (async, don't wait)
    markMessageAsRead(messageId).catch(() => { });

    // Extract message content
    const { text: userMessage, type: messageType } = extractMessageContent(message);

    if (!userMessage) {
      console.warn('[Webhook] Empty message content');
      return;
    }

    console.log(`[Webhook] Message content: "${userMessage}" (${messageType})`);

    // Find or create user
    const { user, isNewUser } = await findOrCreateUser(phoneNumber, 'whatsapp');

    if (!user) {
      console.error(`[Webhook] Failed to find/create user: ${phoneNumber}`);
      await sendWhatsAppMessage(
        phoneNumber,
        'Sorry, there was an error. Please try again later.'
      );
      return;
    }

    // Send welcome message to brand new users
    if (isNewUser) {
      await handleNewUser(user.id, phoneNumber, userMessage, messageType, messageId);
      return;
    }

    // Check for pending invite and auto-link to family
    if (!user.household_id) {
      await checkAndAcceptInvite(user, phoneNumber);
    }

    // Log user message
    await logMessage(user.id, 'user', userMessage, messageType, messageId);

    // Handle special commands
    const commandResult = await handleCommand(userMessage, {
      userId: user.id,
      phoneNumber,
    });

    if (commandResult.handled) {
      return;
    }

    // Process intents (reminders, events, or AI fallback)
    await processIntents(userMessage, {
      userId: user.id,
      phoneNumber,
      householdId: user.household_id ?? null,
      messageId,
    });
  } catch (err) {
    console.error('[Webhook] Critical error processing message:', err);
  }
}

/**
 * Handle new user registration
 */
async function handleNewUser(
  userId: string,
  phoneNumber: string,
  userMessage: string,
  messageType: 'text' | 'image' | 'voice',
  messageId: string
): Promise<void> {
  console.log(`[Webhook] New user detected, sending welcome message`);
  const welcomeMessage =
    '🎉 Willkommen bei My Family Butler!\n\n' +
    'Ich bin dein Familienkalender-Assistent.\n' +
    'Schick mir Termine, Erinnerungen, oder Fotos von Briefen!\n\n' +
    '📅 "Zahnarzt am Montag um 10"\n' +
    '⏰ "Erinnere mich morgen an..."\n' +
    '📸 Foto von Schulbrief senden\n\n' +
    '💡 Tippe "dashboard" für dein Online-Dashboard!\n\n' +
    '📌 *Tipp:* Speichere den Dashboard-Link als Lesezeichen – du bleibst 90 Tage eingeloggt!';

  await sendWhatsAppMessage(phoneNumber, welcomeMessage);
  await logMessage(userId, 'assistant', welcomeMessage, 'text');
  await logMessage(userId, 'user', userMessage, messageType, messageId);
}

/**
 * Check for pending invite and auto-link user to family
 */
async function checkAndAcceptInvite(
  user: { id: string; household_id?: string | null },
  phoneNumber: string
): Promise<void> {
  const pendingInvite = await checkPendingInvite(phoneNumber);
  if (!pendingInvite) return;

  console.log(`[Webhook] Auto-linking user ${phoneNumber} to family`);
  await acceptInvite(user.id, pendingInvite.inviteId, pendingInvite.householdId);

  const admin = getAdminClient();
  const { data: updatedUser } = await admin
    .from('users')
    .select('household_id')
    .eq('id', user.id)
    .single();

  if (updatedUser) {
    user.household_id = updatedUser.household_id;
  }

  await sendWhatsAppMessage(
    phoneNumber,
    '🎉 Willkommen bei My Family Butler! Du wurdest zur Familie hinzugefügt. Schreib mir, um Termine und Erinnerungen zu erstellen!'
  );
}

/**
 * Extract message content from Meta message object
 */
function extractMessageContent(message: MetaMessage): {
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

    case 'video':
      return {
        text: message.video?.caption || '[Video received]',
        type: 'text'
      };

    case 'document':
      return {
        text: `[Document received: ${message.document?.filename || 'file'}]`,
        type: 'text'
      };

    default:
      return { text: '', type: 'text' };
  }
}
