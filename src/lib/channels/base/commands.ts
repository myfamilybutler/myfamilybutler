/**
 * Base Command Handlers
 * 
 * Shared command handling logic for all messaging channels.
 * Each channel can use these directly or wrap them with channel-specific behavior.
 */

import { generateDashboardLink } from '@/lib/supabase';

// ===========================================
// Types
// ===========================================

export interface CommandContext {
  userId: string;
  phoneNumber: string;
  channel: 'whatsapp' | '360dialog' | 'telegram';
  telegramChatId?: number;
}

export interface CommandResult {
  handled: boolean;
  response?: string;
}

// ===========================================
// Command Messages
// ===========================================

export const COMMAND_MESSAGES = {
  welcome: 
    `👋 *Willkommen bei My Family Butler!*\n\n` +
    `Ich bin dein persönlicher Familienassistent. Ich kann dir helfen mit:\n\n` +
    `📅 *Termine erstellen* - "Zahnarzt am Montag um 10 Uhr"\n` +
    `⏰ *Erinnerungen* - "Erinnere mich morgen an Milch kaufen"\n` +
    `🔗 *Dashboard öffnen* - "Dashboard" oder "Link"\n\n` +
    `Probiere es aus! Schreib mir einfach eine Nachricht.`,

  help: 
    `ℹ️ *My Family Butler Hilfe*\n\n` +
    `*Termine:*\n` +
    `• "Zahnarzt am Montag um 10 Uhr"\n` +
    `• "Meeting morgen 14:00"\n\n` +
    `*Erinnerungen:*\n` +
    `• "Erinnere mich in 1 Stunde an..."\n` +
    `• "Reminder: Milch kaufen morgen"\n\n` +
    `*Befehle:*\n` +
    `• dashboard - Dashboard öffnen\n` +
    `• help - Diese Hilfe anzeigen`,

  newEvent: 
    `📅 *Neuen Termin erstellen*\n\n` +
    `Schreib mir einfach, was du eintragen möchtest. Zum Beispiel:\n\n` +
    `• "Zahnarzt am Freitag um 14 Uhr"\n` +
    `• "Elternabend nächsten Dienstag 19:00"\n` +
    `• "Fußballtraining jeden Mittwoch 16:30"\n\n` +
    `Ich erkenne automatisch Datum, Uhrzeit und Details. 🎯`,

  dashboardError: (error: string) => `❌ Fehler: ${error}`,
  
  dashboardSuccess: (link: string) =>
    `🔗 *Dein sicherer Dashboard-Link*\n\n` +
    `Klicke auf den folgenden Link, um dein Dashboard zu öffnen:\n\n` +
    `${link}\n\n` +
    `⏱️ Der Link ist 15 Minuten gültig.`,
};

// ===========================================
// Command Detection
// ===========================================

const DASHBOARD_COMMANDS = ['dashboard', 'link', 'login'];
const START_COMMANDS = ['start', 'hallo', 'hi', 'hello'];
const HELP_COMMANDS = ['help', 'hilfe', '?'];
const NEW_EVENT_COMMANDS = ['new_event'];

export function detectCommand(message: string): 'dashboard' | 'start' | 'help' | 'new_event' | null {
  const lower = message.toLowerCase().trim();
  
  if (DASHBOARD_COMMANDS.includes(lower)) return 'dashboard';
  if (START_COMMANDS.includes(lower)) return 'start';
  if (HELP_COMMANDS.includes(lower)) return 'help';
  if (NEW_EVENT_COMMANDS.includes(lower)) return 'new_event';
  
  return null;
}

// ===========================================
// Command Handlers (Return response text, don't send)
// ===========================================

/**
 * Handle dashboard/login command
 * Returns the response message to send
 */
export async function handleDashboard(context: CommandContext): Promise<string> {
  console.log(`[${context.channel}] Dashboard command from ${context.phoneNumber}`);
  
  const result = await generateDashboardLink(context.phoneNumber, context.channel);
  
  if (result.success && result.link) {
    return COMMAND_MESSAGES.dashboardSuccess(result.link);
  }
  
  return COMMAND_MESSAGES.dashboardError(result.error || 'Unbekannter Fehler');
}

/**
 * Handle start/welcome command
 */
export function handleStart(): string {
  return COMMAND_MESSAGES.welcome;
}

/**
 * Handle help command
 */
export function handleHelp(): string {
  return COMMAND_MESSAGES.help;
}

/**
 * Handle new_event button click
 */
export function handleNewEvent(context: CommandContext): string {
  console.log(`[${context.channel}] New Event command from ${context.phoneNumber}`);
  return COMMAND_MESSAGES.newEvent;
}

// ===========================================
// Unified Command Handler
// ===========================================

/**
 * Process a command and return the response
 * Returns null if not a command
 */
export async function processCommand(
  message: string,
  context: CommandContext
): Promise<CommandResult> {
  const command = detectCommand(message);
  
  if (!command) {
    return { handled: false };
  }
  
  let response: string;
  
  switch (command) {
    case 'dashboard':
      response = await handleDashboard(context);
      break;
    case 'start':
      response = handleStart();
      break;
    case 'help':
      response = handleHelp();
      break;
    case 'new_event':
      response = handleNewEvent(context);
      break;
    default:
      return { handled: false };
  }
  
  return { handled: true, response };
}
