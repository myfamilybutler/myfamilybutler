// ===========================================
// Meta WhatsApp Cloud API Webhook Handler
// ===========================================
import { NextRequest, NextResponse } from 'next/server';
import type { MetaWebhookBody, MetaMessage } from '@/types';
import {
  findOrCreateUser,
  logMessage,
  checkPendingInvite,
  acceptInvite,
  getFamilyMembers
} from '@/lib/supabase';
import { getAdminClient } from '@/lib/supabase';
import { sendWhatsAppMessage, markMessageAsRead } from '@/lib/channels/whatsapp/send';
import { handleCommand } from '@/lib/channels/whatsapp/commands';
import { processIntents } from '@/lib/channels/whatsapp/intents';
import { processImageMessage, processVoiceMessage as processVoiceMedia } from '@/lib/channels/whatsapp/media';
import { isProviderEnabled } from '@/lib/channels/providers.config';
import { verifyWhatsAppSignature, maskPhone } from '@/lib/utils/security';

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
  // Provider on/off switch - return 200 but don't process if disabled
  if (!isProviderEnabled('whatsapp_business')) {
    console.log('[WhatsApp Webhook] Provider disabled, ignoring webhook');
    return NextResponse.json({ success: true });
  }

  // Get raw body for signature verification
  const rawBody = await request.text();
  
  // Verify webhook signature (skip in development if secret not set)
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  const signature = request.headers.get('x-hub-signature-256');
  
  if (appSecret) {
    if (!verifyWhatsAppSignature(rawBody, signature, appSecret)) {
      console.error('[Webhook] Invalid signature - possible spoofed request');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    console.log('[Webhook] Signature verified ✓');
  } else if (process.env.NODE_ENV === 'production') {
    // SECURITY: Fail closed in production - require signature verification
    console.error('[Webhook] CRITICAL: WHATSAPP_APP_SECRET not set in production');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  } else {
    // Development only: allow without signature for local testing
    console.warn('[Webhook] DEV MODE: Skipping signature verification (WHATSAPP_APP_SECRET not set)');
  }

  try {
    const body: MetaWebhookBody = JSON.parse(rawBody);

    // Log minimal info (not full payload to avoid PII leakage)
    console.log('[Webhook] Received WhatsApp webhook, entries:', body.entry?.length || 0);

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

    console.log(`[Webhook] Processing message from ${maskPhone(phoneNumber)} (${contactName || 'Unknown'})`);

    // Deduplication check
    if (isDuplicateMessage(messageId)) {
      console.log(`[Webhook] Duplicate message ignored: ${messageId}`);
      return;
    }

    // Mark message as read (async, don't wait)
    markMessageAsRead(messageId).catch(() => { });

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

    // Mark user as WhatsApp verified (they've sent us a message)
    if (!user.whatsapp_verified) {
      const admin = getAdminClient();
      await admin
        .from('users')
        .update({ whatsapp_verified: true })
        .eq('id', user.id);
    }

    // Get family members for AI context (if user has a household)
    let familyMemberNames: string[] = [];
    if (user.household_id) {
      const { users: householdUsers, familyMembers: members } = await getFamilyMembers(user.household_id);
      // Combine display names from users and names from family members
      familyMemberNames = [
        ...householdUsers.filter(u => u.display_name).map(u => u.display_name!),
        ...members.map(m => m.name),
      ];
    }

    // Build media context
    const mediaContext = {
      userId: user.id,
      phoneNumber,
      householdId: user.household_id ?? null,
      messageId,
      familyMembers: familyMemberNames,
    };

    // Route based on message type
    switch (message.type) {
      case 'image': {
        // Process image through Brain (Vision AI)
        console.log(`[Webhook] Image message from ${phoneNumber}`);
        
        if (isNewUser) {
          await handleNewUser(user.id, phoneNumber, message.image?.caption || '[Image]', 'image', messageId);
          return;
        }
        
        if (!user.household_id) {
          await checkAndAcceptInvite(user, phoneNumber);
        }
        
        await processImageMessage(
          message.image!.id,
          message.image!.mime_type,
          message.image?.caption,
          mediaContext
        );
        return;
      }

      case 'audio': {
        // Process voice message through Brain (Whisper + Dialect)
        console.log(`[Webhook] Voice message from ${phoneNumber}`);
        
        if (isNewUser) {
          await handleNewUser(user.id, phoneNumber, '[Voice message]', 'voice', messageId);
          return;
        }
        
        if (!user.household_id) {
          await checkAndAcceptInvite(user, phoneNumber);
        }
        
        await processVoiceMedia(
          message.audio!.id,
          message.audio!.mime_type,
          mediaContext
        );
        return;
      }

      default: {
        // Text and other message types - use existing flow
        const { text: userMessage, type: messageType } = extractMessageContent(message);

        if (!userMessage) {
          console.warn('[Webhook] Empty message content');
          return;
        }

        console.log(`[Webhook] Message content: "${userMessage}" (${messageType})`);

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
      }
    }
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

    case 'interactive':
      // Handle button replies - use the button ID as the command
      if (message.interactive?.button_reply) {
        const buttonId = message.interactive.button_reply.id;
        const buttonTitle = message.interactive.button_reply.title;
        console.log(`[Webhook] Button reply received: "${buttonTitle}" (id: ${buttonId})`);
        return { text: buttonId, type: 'text' };
      }
      // Handle list replies
      if (message.interactive?.list_reply) {
        const listId = message.interactive.list_reply.id;
        const listTitle = message.interactive.list_reply.title;
        console.log(`[Webhook] List reply received: "${listTitle}" (id: ${listId})`);
        return { text: listId, type: 'text' };
      }
      return { text: '', type: 'text' };

    default:
      return { text: '', type: 'text' };
  }
}
