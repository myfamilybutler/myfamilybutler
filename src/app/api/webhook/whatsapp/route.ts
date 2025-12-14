// ===========================================
// WhatsApp Webhook Handler
// ===========================================
import { NextRequest, NextResponse } from 'next/server';
import type { WhatsAppWebhookBody, WhatsAppMessage, ChatMessage } from '@/types';
import { findOrCreateUser, logMessage, getMessageHistory } from '@/lib/supabase';
import { generateAIResponse, parseReminderIntent } from '@/lib/openai';
import { sendWhatsAppMessage, markMessageAsRead } from '@/lib/whatsapp';
import { createReminder } from '@/lib/supabase';

// Verify token for Meta webhook validation
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

/**
 * GET - Handle Meta Hub Challenge verification
 * This is called by Meta when you set up the webhook
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Check if this is a webhook verification request
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified successfully');
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn('Webhook verification failed:', { mode, token: token?.slice(0, 5) + '...' });
  return new NextResponse('Forbidden', { status: 403 });
}

/**
 * POST - Handle incoming WhatsApp messages
 * IMPORTANT: Return 200 immediately, then process async
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: WhatsAppWebhookBody = await request.json();

    // Validate this is a WhatsApp webhook
    if (body.object !== 'whatsapp_business_account') {
      return new NextResponse('Not a WhatsApp webhook', { status: 400 });
    }

    // Process messages asynchronously
    // We return 200 immediately to prevent Meta timeout
    processWebhookAsync(body).catch(console.error);

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook POST error:', error);
    // Still return 200 to prevent Meta from retrying
    return new NextResponse('OK', { status: 200 });
  }
}

/**
 * Process webhook messages asynchronously
 */
async function processWebhookAsync(body: WhatsAppWebhookBody): Promise<void> {
  for (const entry of body.entry) {
    for (const change of entry.changes) {
      const value = change.value;
      
      // Only process actual messages, not status updates
      if (!value.messages || value.messages.length === 0) {
        continue;
      }

      for (const message of value.messages) {
        await handleIncomingMessage(message);
      }
    }
  }
}

/**
 * Handle a single incoming message
 */
async function handleIncomingMessage(message: WhatsAppMessage): Promise<void> {
  const phoneNumber = message.from;
  const messageId = message.id;

  console.log(`Processing message from ${phoneNumber}:`, message.type);

  // Mark message as read
  await markMessageAsRead(messageId);

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

  // Extract message content based on type
  let userMessage = '';
  let messageType: 'text' | 'image' | 'voice' = 'text';

  switch (message.type) {
    case 'text':
      userMessage = message.text?.body ?? '';
      messageType = 'text';
      break;
    
    case 'image':
      // For MVP, we note that an image was received
      // Full image processing would require downloading and analyzing
      userMessage = message.image?.caption ?? '[Image received]';
      messageType = 'image';
      break;
    
    case 'audio':
      userMessage = '[Voice message received]';
      messageType = 'voice';
      break;
    
    default:
      userMessage = `[${message.type} message received]`;
      break;
  }

  if (!userMessage) {
    console.warn('Empty message content');
    return;
  }

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
