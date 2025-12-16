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
    // We return 200 immediately to prevent timeout
    processWebhookAsync(body).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook POST error:', error);
    // Still return 200 to prevent retries
    return NextResponse.json({ success: true, error: 'Processing error' });
  }
}

/**
 * Extract phone number from WaSenderAPI remoteJid
 * Format: "1234567890@s.whatsapp.net" -> "1234567890"
 */
function extractPhoneNumber(remoteJid: string): string {
  return remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
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
  const data = body.data;
  const messageKey = data.messages?.key || data.key;

  if (!messageKey) {
    console.warn('No message key found in webhook payload');
    return;
  }

  // Skip messages from ourselves
  if (messageKey.fromMe) {
    console.log('Ignoring message from self');
    return;
  }

  // Extract phone number
  const phoneNumber = extractPhoneNumber(messageKey.remoteJid);
  const messageId = messageKey.id;

  console.log(`Processing message from ${phoneNumber}:`, messageId);

  // Find or create user
  const user = await findOrCreateUser(phoneNumber);
  if (!user) {
    console.error('Failed to find/create user for:', phoneNumber);
    await sendWhatsAppMessage(
      phoneNumber,
      'Sorry, there was an error. Please try again later.'
    );
    return;
  }

  // Extract message content
  const { text: userMessage, type: messageType } = extractMessageContent(body);

  if (!userMessage) {
    console.warn('Empty message content');
    return;
  }

  console.log(`User message (${messageType}):`, userMessage);

  // Log user message
  await logMessage(user.id, 'user', userMessage, messageType, messageId);

  // Check for reminder intent
  const reminderIntent = await parseReminderIntent(userMessage);
  if (reminderIntent) {
    // Create the reminder
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
    // Log assistant message
    await logMessage(user.id, 'assistant', aiResponse, 'text', sendResult.messageId);
  } else {
    console.error('Failed to send WhatsApp message:', sendResult.error);
  }
}
