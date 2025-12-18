// ===========================================
// Telegram Bot Webhook Handler
// ===========================================
import { NextRequest, NextResponse } from 'next/server';
import type { TelegramUpdate } from '@/types';
import { getAdminClient } from '@/lib/supabase';
import { processIncomingMessage, handleTelegramPhoneReceived } from '@/lib/message-processor';
import { requestPhoneNumber, sendTelegramMessage } from '@/lib/telegram';

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

function isDuplicateMessage(updateId: number): boolean {
  ensureCleanupInterval();
  const key = `tg_${updateId}`;
  if (PROCESSED_MESSAGES.has(key)) {
    return true;
  }
  PROCESSED_MESSAGES.set(key, Date.now());
  return false;
}

// ===========================================
// Temporary storage for pending phone verifications
// ===========================================
const PENDING_PHONE_REQUESTS = new Map<number, { timestamp: number }>();
const PENDING_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * POST - Handle incoming Telegram webhook updates
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const update: TelegramUpdate = await request.json();
    
    console.log('[Telegram Webhook] Received:', JSON.stringify(update, null, 2));
    
    // Deduplication check
    if (isDuplicateMessage(update.update_id)) {
      console.log(`[Telegram Webhook] Duplicate update ignored: ${update.update_id}`);
      return NextResponse.json({ ok: true });
    }
    
    const message = update.message || update.edited_message;
    
    if (!message) {
      console.log('[Telegram Webhook] No message in update, ignoring');
      return NextResponse.json({ ok: true });
    }
    
    const chatId = message.chat.id;
    const firstName = message.from?.first_name || 'User';
    
    // Handle contact (phone number) sharing
    if (message.contact) {
      console.log(`[Telegram Webhook] Received phone number from ${chatId}`);
      const phoneNumber = message.contact.phone_number;
      
      // Normalize phone number
      const normalizedPhone = phoneNumber.startsWith('+') 
        ? phoneNumber 
        : `+${phoneNumber}`;
      
      // Store the telegram_chat_id on the user record
      const admin = getAdminClient();
      
      // Check if user exists with this phone
      const { data: existingUser } = await admin
        .from('users')
        .select('id, telegram_chat_id')
        .eq('phone_number', normalizedPhone)
        .single();
      
      if (existingUser) {
        // Update user with telegram_chat_id
        await admin
          .from('users')
          .update({ telegram_chat_id: chatId.toString() })
          .eq('id', existingUser.id);
      } else {
        // Create new user with phone and telegram_chat_id
        await admin
          .from('users')
          .insert({
            phone_number: normalizedPhone,
            telegram_chat_id: chatId.toString(),
            subscription_status: 'free',
          });
      }
      
      // Remove from pending
      PENDING_PHONE_REQUESTS.delete(chatId);
      
      // Send confirmation
      await handleTelegramPhoneReceived(chatId, normalizedPhone, firstName);
      
      return NextResponse.json({ ok: true });
    }
    
    // Check if user is linked (has shared phone number)
    const admin = getAdminClient();
    const { data: linkedUser } = await admin
      .from('users')
      .select('*')
      .eq('telegram_chat_id', chatId.toString())
      .single();
    
    if (!linkedUser) {
      // User not linked - request phone number
      console.log(`[Telegram Webhook] User ${chatId} not linked, requesting phone`);
      
      // Add to pending
      PENDING_PHONE_REQUESTS.set(chatId, { timestamp: Date.now() });
      
      // Clean up old pending requests
      const now = Date.now();
      for (const [id, data] of PENDING_PHONE_REQUESTS.entries()) {
        if (now - data.timestamp > PENDING_TTL_MS) {
          PENDING_PHONE_REQUESTS.delete(id);
        }
      }
      
      await requestPhoneNumber(chatId);
      return NextResponse.json({ ok: true });
    }
    
    // Extract message content
    const { text, type } = extractMessageContent(message);
    
    if (!text) {
      console.warn('[Telegram Webhook] Empty message content');
      return NextResponse.json({ ok: true });
    }
    
    // ===========================================
    // Handle Special Commands
    // ===========================================
    const lowerText = text.toLowerCase().trim();
    
    // Dashboard/Login command - generate magic link
    if (['dashboard', 'link', 'login', '/dashboard', '/link', '/login'].includes(lowerText)) {
      console.log(`[Telegram Webhook] Dashboard command from ${chatId}`);
      
      const { generateDashboardLink } = await import('@/lib/supabase');
      const result = await generateDashboardLink(linkedUser.phone_number || '', 'telegram');
      
      if (result.success && result.link) {
        await sendTelegramMessage(
          chatId,
          `🔗 *Dein sicherer Dashboard-Link*\n\n` +
          `Klicke auf den folgenden Link, um dein Dashboard zu öffnen:\n\n` +
          `${result.link}\n\n` +
          `⏱️ Der Link ist 15 Minuten gültig.`,
          { parseMode: 'Markdown' }
        );
      } else {
        await sendTelegramMessage(
          chatId,
          `❌ Fehler beim Erstellen des Links: ${result.error || 'Unbekannter Fehler'}`,
          { parseMode: 'Markdown' }
        );
      }
      
      return NextResponse.json({ ok: true });
    }
    
    // Start command - welcome message
    if (['start', '/start', 'hallo', 'hi', 'hello'].includes(lowerText)) {
      console.log(`[Telegram Webhook] Start command from ${chatId}`);
      
      await sendTelegramMessage(
        chatId,
        `👋 *Willkommen bei FamilyButler, ${firstName}!*\n\n` +
        `Ich bin dein persönlicher Familienassistent. Ich kann dir helfen mit:\n\n` +
        `📅 *Termine erstellen* - "Zahnarzt am Montag um 10 Uhr"\n` +
        `⏰ *Erinnerungen* - "Erinnere mich morgen an Milch kaufen"\n` +
        `🔗 *Dashboard öffnen* - "Dashboard" oder "Link"\n\n` +
        `Probiere es aus! Schreib mir einfach eine Nachricht.`,
        { parseMode: 'Markdown' }
      );
      
      return NextResponse.json({ ok: true });
    }
    
    // Help command
    if (['help', '/help', 'hilfe', '?'].includes(lowerText)) {
      await sendTelegramMessage(
        chatId,
        `ℹ️ *FamilyButler Hilfe*\n\n` +
        `*Termine:*\n` +
        `• "Zahnarzt am Montag um 10 Uhr"\n` +
        `• "Meeting morgen 14:00"\n\n` +
        `*Erinnerungen:*\n` +
        `• "Erinnere mich in 1 Stunde an..."\n` +
        `• "Reminder: Milch kaufen morgen"\n\n` +
        `*Befehle:*\n` +
        `• /dashboard - Dashboard öffnen\n` +
        `• /help - Diese Hilfe anzeigen`,
        { parseMode: 'Markdown' }
      );
      
      return NextResponse.json({ ok: true });
    }
    
    // ===========================================
    // Process general messages via AI
    // ===========================================
    await processIncomingMessage({
      phoneNumber: linkedUser.phone_number || '',
      userMessage: text,
      messageType: type,
      messageId: `tg_${message.message_id}`,
      contactName: firstName,
      channel: 'telegram',
      telegramChatId: chatId,
    });
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Telegram Webhook] Error:', error);
    // Return 200 to prevent Telegram from retrying
    return NextResponse.json({ ok: true });
  }
}

/**
 * Extract message content from Telegram message
 */
function extractMessageContent(message: TelegramUpdate['message']): {
  text: string;
  type: 'text' | 'image' | 'voice';
} {
  if (!message) {
    return { text: '', type: 'text' };
  }
  
  if (message.text) {
    return { text: message.text, type: 'text' };
  }
  
  if (message.photo && message.photo.length > 0) {
    return { 
      text: message.caption || '[Image received]', 
      type: 'image' 
    };
  }
  
  if (message.voice) {
    return { text: '[Voice message received]', type: 'voice' };
  }
  
  if (message.document) {
    return { 
      text: `[Document received: ${message.document.file_name || 'file'}]`, 
      type: 'text' 
    };
  }
  
  return { text: '', type: 'text' };
}
