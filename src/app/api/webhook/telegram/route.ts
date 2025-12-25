// ===========================================
// Telegram Bot Webhook Handler
// ===========================================
import { NextRequest, NextResponse } from 'next/server';
import type { TelegramUpdate } from '@/types';
import { getAdminClient } from '@/lib/supabase';
import { getFamilyMembers } from '@/lib/supabase';
import { processIncomingMessage, handleTelegramPhoneReceived } from '@/lib/channels/message-processor';
import { requestPhoneNumber, sendTelegramMessage, downloadTelegramFile } from '@/lib/channels/telegram';
import { processLocalImage } from '@/actions/process-vision';
import { processTelegramVoiceMessage } from '@/lib/channels/telegram-media';
import { isProviderEnabled } from '@/lib/channels/providers.config';
import { verifyTelegramSecretToken, maskChatId } from '@/lib/utils/security';

// ===========================================
// Deduplication: Prevent processing same message twice
// ===========================================
// NOTE: In-memory Maps don't persist across serverless cold starts.
// This provides "best effort" deduplication within a single instance.
// Worst case = duplicate processing (handled gracefully by the app).
// For scale, consider Redis-based deduplication.
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
  // Provider on/off switch - return 200 but don't process if disabled
  if (!isProviderEnabled('telegram')) {
    console.log('[Telegram Webhook] Provider disabled, ignoring webhook');
    return NextResponse.json({ ok: true });
  }

  // Verify secret token (skip in development if not set)
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const receivedToken = request.headers.get('x-telegram-bot-api-secret-token');
  
  if (webhookSecret) {
    if (!verifyTelegramSecretToken(receivedToken, webhookSecret)) {
      console.error('[Telegram Webhook] Invalid secret token - possible spoofed request');
      return NextResponse.json({ ok: true }); // Return 200 to avoid Telegram retrying
    }
    console.log('[Telegram Webhook] Secret token verified ✓');
  } else {
    console.warn('[Telegram Webhook] TELEGRAM_WEBHOOK_SECRET not set - skipping verification');
  }

  try {
    const update: TelegramUpdate = await request.json();
    
    console.log('[Telegram Webhook] Received update_id:', update.update_id);
    
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
      console.log(`[Telegram Webhook] Received phone number from ${maskChatId(chatId)}`);
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
    const { data: linkedUser, error: linkError } = await admin
      .from('users')
      .select('*')
      .eq('telegram_chat_id', chatId.toString())
      .single();
    
    console.log(`[Telegram Webhook] User lookup for ${chatId}: found=${!!linkedUser}, error=${linkError?.message || 'none'}, phone=${linkedUser?.phone_number || 'none'}`);
    
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
    const { text, type, photoFileId, voiceFileId } = extractMessageContent(message);
    
    // ===========================================
    // Handle Image Messages with Vision Agent
    // ===========================================
    if (type === 'image' && photoFileId && linkedUser.household_id) {
      console.log(`[Telegram Webhook] Processing image from ${chatId}`);
      
      try {
        // Download image from Telegram
        const imageBuffer = await downloadTelegramFile(photoFileId);
        
        if (imageBuffer) {
          // Process with Vision Agent
          const result = await processLocalImage(
            imageBuffer,
            linkedUser.id,
            linkedUser.household_id,
            'image/jpeg'
          );
          
          if (result.success && result.eventsCreated > 0) {
            const eventList = result.events
              .map(e => `• ${e.title} (${e.event_date})`)
              .join('\n');
            
            await sendTelegramMessage(
              chatId,
              `📅 *${result.eventsCreated} Termin(e) erkannt und gespeichert!*\n\n${eventList}\n\n✅ Check dein Dashboard für Details.`,
              { parseMode: 'Markdown' }
            );
          } else if (result.clarificationNeeded && result.clarificationQuestion) {
            await sendTelegramMessage(
              chatId,
              `🤔 ${result.clarificationQuestion}`,
              { parseMode: 'Markdown' }
            );
          } else {
            await sendTelegramMessage(
              chatId,
              `📷 Bild erhalten! Ich konnte leider keine Termine daraus extrahieren.\n\nTipp: Schick mir Fotos von Schulbriefen, Terminzetteln oder Einladungen.`
            );
          }
          
          return NextResponse.json({ ok: true });
        }
      } catch (visionError) {
        console.error('[Telegram Webhook] Vision processing error:', visionError);
        await sendTelegramMessage(
          chatId,
          `❌ Fehler bei der Bildverarbeitung. Bitte versuche es später erneut.`
        );
        return NextResponse.json({ ok: true });
      }
    }
    
    // ===========================================
    // Handle Voice Messages with Whisper + Dialect
    // ===========================================
    if (type === 'voice' && voiceFileId && linkedUser.household_id) {
      console.log(`[Telegram Webhook] Processing voice message from ${chatId}`);
      
      // Get family members for context
      let familyMemberNames: string[] = [];
      try {
        const { users: householdUsers, familyMembers: members } = await getFamilyMembers(linkedUser.household_id);
        familyMemberNames = [
          ...householdUsers.filter(u => u.display_name).map(u => u.display_name!),
          ...members.map(m => m.name),
        ];
      } catch {
        // Ignore errors fetching family members
      }
      
      await processTelegramVoiceMessage(voiceFileId, {
        userId: linkedUser.id,
        chatId,
        householdId: linkedUser.household_id,
        messageId: `tg_${message.message_id}`,
        familyMembers: familyMemberNames,
      });
      
      return NextResponse.json({ ok: true });
    }
    
    // Handle voice messages for users without household
    if (type === 'voice' && voiceFileId && !linkedUser.household_id) {
      await sendTelegramMessage(
        chatId,
        '🎙️ Um Termine aus Sprachnachrichten zu erstellen, musst du zuerst einer Familie beitreten. Tippe "dashboard" um loszulegen.'
      );
      return NextResponse.json({ ok: true });
    }
    
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
      console.log(`[Telegram Webhook] Dashboard command from ${chatId}, phone: ${linkedUser.phone_number}`);
      
      try {
        // Check if user has phone number
        if (!linkedUser.phone_number) {
          console.log(`[Telegram Webhook] User ${chatId} has no phone number`);
          await sendTelegramMessage(
            chatId,
            `⚠️ Deine Telefonnummer ist nicht hinterlegt. Bitte teile sie zuerst mit dem "📞 Telefonnummer teilen" Button.`,
            { parseMode: 'Markdown' }
          );
          await requestPhoneNumber(chatId);
          return NextResponse.json({ ok: true });
        }
        
        const { generateDashboardLink } = await import('@/lib/supabase');
        const result = await generateDashboardLink(linkedUser.phone_number, 'telegram');
        
        console.log(`[Telegram Webhook] Dashboard link result:`, result);
        
        if (result.success && result.link) {
          await sendTelegramMessage(
            chatId,
            `🔗 Dein sicherer Dashboard-Link\n\n` +
            `Klicke auf den folgenden Link, um dein Dashboard zu öffnen:\n\n` +
            `${result.link}\n\n` +
            `⏱️ Der Link ist 15 Minuten gültig.`
            // Note: No parseMode - URLs with & break Telegram Markdown
          );
        } else {
          console.error(`[Telegram Webhook] Dashboard link error:`, result.error);
          await sendTelegramMessage(
            chatId,
            `❌ Fehler beim Erstellen des Links: ${result.error || 'Unbekannter Fehler'}`,
            { parseMode: 'Markdown' }
          );
        }
      } catch (error) {
        console.error(`[Telegram Webhook] Dashboard command error:`, error);
        await sendTelegramMessage(
          chatId,
          `❌ Ein Fehler ist aufgetreten. Bitte versuche es später erneut.`,
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
        `👋 *Willkommen bei My Family Butler, ${firstName}!*\n\n` +
        `Ich bin dein persönlicher Familienassistent. Ich kann dir helfen mit:\n\n` +
        `📅 *Termine erstellen* - "Zahnarzt am Montag um 10 Uhr"\n` +
        `⏰ *Erinnerungen* - "Erinnere mich morgen an Milch kaufen"\n` +
        `🔗 *Dashboard öffnen* - "Dashboard" oder "Link"\n\n` +
        `Probiere es aus! Schreib mir einfach eine Nachricht.\n\n` +
        `📌 *Tipp:* Speichere den Dashboard-Link als Lesezeichen – du bleibst 90 Tage eingeloggt!`,
        { parseMode: 'Markdown' }
      );
      
      return NextResponse.json({ ok: true });
    }
    
    // Help command
    if (['help', '/help', 'hilfe', '?'].includes(lowerText)) {
      await sendTelegramMessage(
        chatId,
        `ℹ️ *My Family Butler Hilfe*\n\n` +
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
  photoFileId?: string;
  voiceFileId?: string;
} {
  if (!message) {
    return { text: '', type: 'text' };
  }
  
  if (message.text) {
    return { text: message.text, type: 'text' };
  }
  
  if (message.photo && message.photo.length > 0) {
    // Get the largest photo (best quality, last in array)
    const largestPhoto = message.photo[message.photo.length - 1];
    return { 
      text: message.caption || '[Image received]', 
      type: 'image',
      photoFileId: largestPhoto.file_id,
    };
  }
  
  if (message.voice) {
    return { 
      text: '[Voice message received]', 
      type: 'voice',
      voiceFileId: message.voice.file_id,
    };
  }
  
  if (message.document) {
    return { 
      text: `[Document received: ${message.document.file_name || 'file'}]`, 
      type: 'text' 
    };
  }
  
  return { text: '', type: 'text' };
}

