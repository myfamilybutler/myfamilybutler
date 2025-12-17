// ===========================================
// Meta WhatsApp Cloud API Webhook Handler
// ===========================================
import { NextRequest, NextResponse } from 'next/server';
import type { MetaWebhookBody, MetaMessage, ChatMessage } from '@/types';
import { 
  findOrCreateUser, 
  logMessage, 
  getMessageHistory,
  checkPendingInvite,
  acceptInvite 
} from '@/lib/supabase';
import { getAdminClient } from '@/lib/supabase';
import { generateAIResponse, parseReminderIntent, parseEventIntent } from '@/lib/openai';
import { sendWhatsAppMessage, markMessageAsRead } from '@/lib/whatsapp';
import { createReminder, createEvent } from '@/lib/supabase';
import { APP_CONFIG } from '@/lib/config';

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
 * Meta sends a GET request to verify the webhook URL
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  
  console.log('[Webhook] GET verification request:', { mode, token: token?.slice(0, 10) + '...', challenge });
  
  // Verify the token matches
  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[Webhook] Verification successful!');
    // Must return ONLY the challenge value
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
    
    // Validate this is from WhatsApp
    if (body.object !== 'whatsapp_business_account') {
      console.log('[Webhook] Not a WhatsApp event, ignoring');
      return NextResponse.json({ success: true });
    }
    
    // Process each entry (usually just one)
    for (const entry of body.entry) {
      for (const change of entry.changes) {
        if (change.field !== 'messages') continue;
        
        const value = change.value;
        
        // Handle status updates (delivery receipts)
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
    // Return 200 to prevent Meta from retrying
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
    markMessageAsRead(messageId).catch(() => {});
    
    // Extract message content
    const { text: userMessage, type: messageType } = extractMessageContent(message);
    
    if (!userMessage) {
      console.warn('[Webhook] Empty message content');
      return;
    }
    
    console.log(`[Webhook] Message content: "${userMessage}" (${messageType})`);
    
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
    
    // Check for pending invite and auto-link to family
    if (!user.household_id) {
      const pendingInvite = await checkPendingInvite(phoneNumber);
      if (pendingInvite) {
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
          '🎉 Willkommen bei FamilyButler! Du wurdest zur Familie hinzugefügt. Schreib mir, um Termine und Erinnerungen zu erstellen!'
        );
      }
    }
    
    // Log user message
    await logMessage(user.id, 'user', userMessage, messageType, messageId);
    
    // Check for reminder intent
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
    
    // Check for event intent (if user has a family)
    const eventIntent = await parseEventIntent(userMessage);
    if (user.household_id && eventIntent) {
      const event = await createEvent(
        user.household_id,
        user.id,
        {
          ...eventIntent,
          source_message_id: messageId
        }
      );
      
      if (event) {
        const dateObj = new Date(event.event_date);
        const formattedDate = dateObj.toLocaleDateString(APP_CONFIG.localization.locale, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        });
        
        const timeStr = event.event_time ? ` um ${event.event_time}` : ' (ganztägig)';
        const memberStr = event.family_member ? ` für ${event.family_member}` : '';
        const locationStr = event.location ? `\n📍 ${event.location}` : '';
        
        const confirmationMessage = `📅 Termin erstellt!\n\n*${event.title}*${memberStr}\n🗓️ ${formattedDate}${timeStr}${locationStr}`;
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
    
    // Send response
    const sendResult = await sendWhatsAppMessage(phoneNumber, aiResponse);
    
    if (sendResult.success) {
      await logMessage(user.id, 'assistant', aiResponse, 'text', sendResult.messageId);
      console.log('[Webhook] Response sent successfully');
    } else {
      console.error('[Webhook] Failed to send response:', sendResult.error);
    }
  } catch (err) {
    console.error('[Webhook] Critical error processing message:', err);
  }
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
