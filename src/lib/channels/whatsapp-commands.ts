/**
 * WhatsApp Command Handlers
 * 
 * Handles special commands like "dashboard", "help", "start" etc.
 * Extracted from the main webhook route for better organization.
 */

import { sendWhatsAppMessage } from '@/lib/channels/whatsapp';
import { logMessage, generateDashboardLink } from '@/lib/supabase';

interface CommandContext {
  userId: string;
  phoneNumber: string;
}

interface CommandResult {
  handled: boolean;
}

/**
 * Handle special commands from the user.
 * Returns { handled: true } if a command was processed, false otherwise.
 */
export async function handleCommand(
  message: string,
  context: CommandContext
): Promise<CommandResult> {
  const lowerMessage = message.toLowerCase().trim();

  if (await handleDashboardCommand(lowerMessage, context)) {
    return { handled: true };
  }

  if (await handleNewEventCommand(lowerMessage, context)) {
    return { handled: true };
  }

  if (await handleStartCommand(lowerMessage, context)) {
    return { handled: true };
  }

  if (await handleHelpCommand(lowerMessage, context)) {
    return { handled: true };
  }

  return { handled: false };
}

/**
 * Handle dashboard/login command
 */
async function handleDashboardCommand(
  lowerMessage: string,
  { userId, phoneNumber }: CommandContext
): Promise<boolean> {
  if (!['dashboard', 'link', 'login'].includes(lowerMessage)) {
    return false;
  }

  console.log(`[WhatsApp] Dashboard command from ${phoneNumber}`);

  const result = await generateDashboardLink(phoneNumber, 'whatsapp');

  if (result.success && result.link) {
    const dashboardMessage =
      `🔗 *Dein sicherer Dashboard-Link*\n\n` +
      `Klicke auf den folgenden Link, um dein Dashboard zu öffnen:\n\n` +
      `${result.link}\n\n` +
      `⏱️ Der Link ist 15 Minuten gültig.`;

    await sendWhatsAppMessage(phoneNumber, dashboardMessage);
    await logMessage(userId, 'assistant', dashboardMessage, 'text');
  } else {
    const errorMessage = `❌ Fehler: ${result.error || 'Unbekannter Fehler'}`;
    await sendWhatsAppMessage(phoneNumber, errorMessage);
    await logMessage(userId, 'assistant', errorMessage, 'text');
  }

  return true;
}

/**
 * Handle start/hello command
 */
async function handleStartCommand(
  lowerMessage: string,
  { userId, phoneNumber }: CommandContext
): Promise<boolean> {
  if (!['start', 'hallo', 'hi', 'hello'].includes(lowerMessage)) {
    return false;
  }

  const welcomeMessage =
    `👋 *Willkommen bei My Family Butler!*\n\n` +
    `Ich bin dein persönlicher Familienassistent. Ich kann dir helfen mit:\n\n` +
    `📅 *Termine erstellen* - "Zahnarzt am Montag um 10 Uhr"\n` +
    `⏰ *Erinnerungen* - "Erinnere mich morgen an Milch kaufen"\n` +
    `🔗 *Dashboard öffnen* - "Dashboard" oder "Link"\n\n` +
    `Probiere es aus! Schreib mir einfach eine Nachricht.`;

  await sendWhatsAppMessage(phoneNumber, welcomeMessage);
  await logMessage(userId, 'assistant', welcomeMessage, 'text');

  return true;
}

/**
 * Handle help command
 */
async function handleHelpCommand(
  lowerMessage: string,
  { userId, phoneNumber }: CommandContext
): Promise<boolean> {
  if (!['help', 'hilfe', '?'].includes(lowerMessage)) {
    return false;
  }

  const helpMessage =
    `ℹ️ *My Family Butler Hilfe*\n\n` +
    `*Termine:*\n` +
    `• "Zahnarzt am Montag um 10 Uhr"\n` +
    `• "Meeting morgen 14:00"\n\n` +
    `*Erinnerungen:*\n` +
    `• "Erinnere mich in 1 Stunde an..."\n` +
    `• "Reminder: Milch kaufen morgen"\n\n` +
    `*Befehle:*\n` +
    `• dashboard - Dashboard öffnen\n` +
    `• help - Diese Hilfe anzeigen`;

  await sendWhatsAppMessage(phoneNumber, helpMessage);
  await logMessage(userId, 'assistant', helpMessage, 'text');

  return true;
}

/**
 * Handle new_event button click - prompt user to create a new event
 */
async function handleNewEventCommand(
  lowerMessage: string,
  { userId, phoneNumber }: CommandContext
): Promise<boolean> {
  if (lowerMessage !== 'new_event') {
    return false;
  }

  console.log(`[WhatsApp] New Event command from ${phoneNumber}`);

  const newEventMessage =
    `📅 *Neuen Termin erstellen*\n\n` +
    `Schreib mir einfach, was du eintragen möchtest. Zum Beispiel:\n\n` +
    `• "Zahnarzt am Freitag um 14 Uhr"\n` +
    `• "Elternabend nächsten Dienstag 19:00"\n` +
    `• "Fußballtraining jeden Mittwoch 16:30"\n\n` +
    `Ich erkenne automatisch Datum, Uhrzeit und Details. 🎯`;

  await sendWhatsAppMessage(phoneNumber, newEventMessage);
  await logMessage(userId, 'assistant', newEventMessage, 'text');

  return true;
}
