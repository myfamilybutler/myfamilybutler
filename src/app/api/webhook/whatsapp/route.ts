// ===========================================
// WaSenderAPI Webhook Handler
// ===========================================
import { NextRequest, NextResponse } from 'next/server';
import type { WaSenderWebhookBody, ChatMessage } from '@/types';
import { 
  findOrCreateUser, 
  logMessage, 
  getMessageHistory,
  checkPendingInvite,
  acceptInvite 
} from '@/lib/supabase';
import { getAdminClient } from '@/lib/supabase';
import { generateAIResponse, parseReminderIntent } from '@/lib/openai';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { createReminder } from '@/lib/supabase';

// ===========================================
// Deduplication: Prevent processing same message twice
// This handles WaSenderAPI retry scenarios and race conditions
// ===========================================
const PROCESSED_MESSAGES = new Map<string, number>();
const MESSAGE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CLEANUP_INTERVAL_MS = 60 * 1000; // Cleanup every minute

// Periodic cleanup of old message IDs to prevent memory leak
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
    // Don't block process exit
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
 * GET - Health check endpoint
 * WaSenderAPI doesn't use verification like Meta, but we keep this for debugging
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'ok',
    provider: 'WaSenderAPI',
    timestamp: new Date().toISOString(),
  });
}

/**
 * POST - Handle incoming WaSenderAPI webhook events
 * IMPORTANT: Return 200 immediately, then process async
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: WaSenderWebhookBody = await request.json();

    console.log('WaSenderAPI webhook received:', body.event);

    // Only process messages.received events
    if (body.event !== 'messages.received') {
      console.log(`Ignoring event: ${body.event}`);
      return NextResponse.json({ success: true, ignored: true });
    }

    // Process messages asynchronously
    // We await to ensure execution completes in serverless environment
    // Note: This might cause timeouts if AI is too slow, but necessary for debugging/reliability without a queue
    await processWebhookAsync(body);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook POST error:', error);
    // Still return 200 to prevent retries
    return NextResponse.json({ success: true, error: 'Processing error' });
  }
}

/**
 * Extract phone number from WaSenderAPI message key
 * Handles both standard format and LID (Linked ID) addressing mode
 * LID format: uses cleanedSenderPn or senderPn for actual phone number
 * Standard format: "1234567890@s.whatsapp.net" -> "1234567890"
 */
function extractPhoneNumber(
  messageKey: {
    remoteJid: string;
    cleanedSenderPn?: string;
    senderPn?: string;
    addressingMode?: string;
  }
): string {
  // Priority 1: Use cleanedSenderPn if available (already cleaned)
  if (messageKey.cleanedSenderPn) {
    return messageKey.cleanedSenderPn;
  }

  // Priority 2: Use senderPn and clean it
  if (messageKey.senderPn) {
    return messageKey.senderPn.replace('@s.whatsapp.net', '').replace('@g.us', '');
  }

  // Priority 3: Fallback to remoteJid (for non-LID messages)
  return messageKey.remoteJid
    .replace('@s.whatsapp.net', '')
    .replace('@g.us', '')
    .replace('@lid', '');
}

/**
 * Extract message content from WaSenderAPI message
 */
function extractMessageContent(body: WaSenderWebhookBody): {
  text: string;
  type: 'text' | 'image' | 'voice';
} {
  const data = body.data;
  const message = data.messages?.message;

  // Priority 1: messageBody field (normalized by WaSenderAPI)
  if (data.messageBody) {
    return { text: data.messageBody, type: 'text' };
  }

  // Priority 2: Direct message object
  if (message) {
    // Text message (conversation)
    if (message.conversation) {
      return { text: message.conversation, type: 'text' };
    }

    // Extended text message
    if (message.extendedTextMessage?.text) {
      return { text: message.extendedTextMessage.text, type: 'text' };
    }

    // Image message
    if (message.imageMessage) {
      return {
        text: message.imageMessage.caption || '[Image received]',
        type: 'image',
      };
    }

    // Audio/Voice message
    if (message.audioMessage) {
      return { text: '[Voice message received]', type: 'voice' };
    }

    // Document message
    if (message.documentMessage) {
      return {
        text: `[Document received: ${message.documentMessage.fileName || 'file'}]`,
        type: 'text',
      };
    }

    // Video message
    if (message.videoMessage) {
      return {
        text: message.videoMessage.caption || '[Video received]',
        type: 'text',
      };
    }
  }

  return { text: '', type: 'text' };
}

/**
 * Process webhook messages asynchronously
 */
async function processWebhookAsync(body: WaSenderWebhookBody): Promise<void> {
  try {
    const data = body.data;
    const messageKey = data.messages?.key || data.key;

    if (!messageKey) {
      console.warn('[Webhook] No message key found in payload');
      return;
    }

    // Skip messages from ourselves
    if (messageKey.fromMe) {
      return;
    }

    // Extract phone number (handles LID addressing mode)
    const phoneNumber = extractPhoneNumber(messageKey);
    const messageId = messageKey.id;

    // RACE CONDITION FIX: Deduplicate messages to prevent double processing
    if (isDuplicateMessage(messageId)) {
      console.log(`[Webhook] Duplicate message ignored: ${messageId}`);
      return;
    }

    console.log(`[Webhook] Processing: ${phoneNumber}, msgId: ${messageId}`);

    // Find or create user
    const user = await findOrCreateUser(phoneNumber);

    if (!user) {
      console.error(`[Webhook] Failed to find/create user: ${phoneNumber}`);
      await sendWhatsAppMessage(
        phoneNumber,
        'Sorry, there was an error. Please try again later.'
      );
      return;
    }
    
    // Check for pending invite and auto-link to household
    if (!user.household_id) {
      const pendingInvite = await checkPendingInvite(phoneNumber);
      if (pendingInvite) {
        console.log(`[Webhook] Auto-linking user ${phoneNumber} to household via pending invite`);
        await acceptInvite(user.id, pendingInvite.inviteId, pendingInvite.householdId);
        
        // Update user object with household
        const admin = getAdminClient();
        const { data: updatedUser } = await admin
          .from('users')
          .select('household_id')
          .eq('id', user.id)
          .single();
        
        if (updatedUser) {
          user.household_id = updatedUser.household_id;
        }
        
        // Welcome message
        await sendWhatsAppMessage(
          phoneNumber,
          '🎉 Willkommen bei FamilyButler! Du wurdest zur Familie hinzugefügt. Schreib mir, um Termine und Erinnerungen zu erstellen!'
        );
      }
    }

    // Extract message content
    const { text: userMessage, type: messageType } = extractMessageContent(body);

    if (!userMessage) {
      console.warn('[Webhook] Empty message content - aborting');
      return;
    }

    // Log user message
    await logMessage(user.id, 'user', userMessage, messageType, messageId);

    // Check for reminder intent first (fast path)
    const reminderIntent = await parseReminderIntent(userMessage);
    
    if (reminderIntent) {
      const reminder = await createReminder(
        user.id,
        reminderIntent.task,
        reminderIntent.datetime
      );

      if (reminder) {
        const formattedDate = reminderIntent.datetime.toLocaleDateString('de-AT', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit',
        });

        const confirmationMessage = `✅ Erinnerung erstellt!\n\n📋 *${reminderIntent.task}*\n📅 ${formattedDate}`;

        await sendWhatsAppMessage(phoneNumber, confirmationMessage);
        await logMessage(user.id, 'assistant', confirmationMessage, 'text');
        return;
      }
    }

    // Get message history for context
    const history = await getMessageHistory(user.id, 10);
    
    const chatHistory: ChatMessage[] = history.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    // Generate AI response
    const aiResponse = await generateAIResponse(chatHistory, userMessage);

    // Send response back via WhatsApp
    const sendResult = await sendWhatsAppMessage(phoneNumber, aiResponse);

    if (sendResult.success) {
      await logMessage(user.id, 'assistant', aiResponse, 'text', sendResult.messageId);
    } else {
      console.error('[Webhook] Failed to send message:', sendResult.error);
    }
  } catch (err) {
    console.error('[Webhook] Critical error:', err);
    if (err instanceof Error) {
      console.error('[Webhook] Stack:', err.stack);
    }
  }
}
