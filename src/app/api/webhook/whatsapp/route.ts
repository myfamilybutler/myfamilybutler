// ===========================================
// WaSenderAPI Webhook Handler
// ===========================================
import { NextRequest, NextResponse } from 'next/server';
import type { WaSenderWebhookBody, ChatMessage } from '@/types';
import { findOrCreateUser, logMessage, getMessageHistory } from '@/lib/supabase';
import { generateAIResponse, parseReminderIntent } from '@/lib/openai';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { createReminder } from '@/lib/supabase';

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
  console.log('=== DEBUG: processWebhookAsync START ===');
  console.log('DEBUG: Full webhook body:', JSON.stringify(body, null, 2));
  
  try {
    const data = body.data;
    const messageKey = data.messages?.key || data.key;

    if (!messageKey) {
      console.warn('DEBUG: No message key found in webhook payload');
      console.log('DEBUG: data.messages:', data.messages);
      console.log('DEBUG: data.key:', data.key);
      return;
    }

    console.log('DEBUG: messageKey found:', messageKey);

    // Skip messages from ourselves
    if (messageKey.fromMe) {
      console.log('DEBUG: Ignoring message from self');
      return;
    }

    // Extract phone number (handles LID addressing mode)
    const phoneNumber = extractPhoneNumber(messageKey);
    const messageId = messageKey.id;

    console.log(`DEBUG: Processing message from ${phoneNumber}, ID: ${messageId}`);

    // Find or create user
    console.log('DEBUG: Finding/creating user...');
    let user;
    try {
      user = await findOrCreateUser(phoneNumber);
      console.log('DEBUG: findOrCreateUser result:', user ? `User ID: ${user.id}` : 'null');
    } catch (err) {
      console.error('DEBUG: Error in findOrCreateUser:', err);
      throw err;
    }

    if (!user) {
      console.error('DEBUG: Failed to find/create user for:', phoneNumber);
      await sendWhatsAppMessage(
        phoneNumber,
        'Sorry, there was an error. Please try again later.'
      );
      return;
    }
    console.log('DEBUG: User found/created:', user.id);

    // Extract message content
    const { text: userMessage, type: messageType } = extractMessageContent(body);
    console.log(`DEBUG: Extracted message (${messageType}):`, userMessage);

    if (!userMessage) {
      console.warn('DEBUG: Empty message content - aborting');
      return;
    }

    // Log user message
    console.log('DEBUG: Logging user message to database...');
    await logMessage(user.id, 'user', userMessage, messageType, messageId);

    // Check for reminder intent
    console.log('DEBUG: Checking for reminder intent...');
    const reminderIntent = await parseReminderIntent(userMessage);
    console.log('DEBUG: Reminder intent result:', reminderIntent);
    
    if (reminderIntent) {
      console.log('DEBUG: Creating reminder...');
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

        console.log('DEBUG: Sending reminder confirmation...');
        await sendWhatsAppMessage(phoneNumber, confirmationMessage);
        await logMessage(user.id, 'assistant', confirmationMessage, 'text');
        console.log('=== DEBUG: processWebhookAsync END (reminder created) ===');
        return;
      }
    }

    // Get message history for context
    console.log('DEBUG: Getting message history...');
    const history = await getMessageHistory(user.id, 10);
    console.log('DEBUG: History count:', history.length);
    
    const chatHistory: ChatMessage[] = history.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    // Generate AI response
    console.log('DEBUG: Generating AI response...');
    const aiResponse = await generateAIResponse(chatHistory, userMessage);
    console.log('DEBUG: AI response generated:', aiResponse.substring(0, 100) + '...');

    // Send response back via WhatsApp
    console.log('DEBUG: Sending WhatsApp message to:', phoneNumber);
    const sendResult = await sendWhatsAppMessage(phoneNumber, aiResponse);
    console.log('DEBUG: Send result:', sendResult);

    if (sendResult.success) {
      // Log assistant message
      await logMessage(user.id, 'assistant', aiResponse, 'text', sendResult.messageId);
      console.log('=== DEBUG: processWebhookAsync END (success) ===');
    } else {
      console.error('DEBUG: Failed to send WhatsApp message:', sendResult.error);
      console.log('=== DEBUG: processWebhookAsync END (send failed) ===');
    }
  } catch (err) {
    console.error('=== DEBUG: CRITICAL ERROR in processWebhookAsync ===', err);
    // Explicitly trace where it happened if possible
    if (err instanceof Error) {
        console.error('Stack:', err.stack);
    }
  }
}
