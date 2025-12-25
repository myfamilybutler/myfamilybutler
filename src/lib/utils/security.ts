// ===========================================
// Security Utilities
// ===========================================
// Webhook verification, data masking, and input validation

import { createHmac, timingSafeEqual } from 'crypto';

// ===========================================
// Webhook Signature Verification
// ===========================================

/**
 * Verify WhatsApp webhook signature
 * Meta sends X-Hub-Signature-256 header with HMAC-SHA256 of the payload
 * @see https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
 */
export function verifyWhatsAppSignature(
  payload: string,
  signature: string | null,
  appSecret: string
): boolean {
  if (!signature || !appSecret) {
    console.warn('[Security] Missing signature or app secret for WhatsApp verification');
    return false;
  }

  // Signature format: sha256=<hash>
  const expectedPrefix = 'sha256=';
  if (!signature.startsWith(expectedPrefix)) {
    console.warn('[Security] Invalid WhatsApp signature format');
    return false;
  }

  const signatureHash = signature.slice(expectedPrefix.length);
  const expectedHash = createHmac('sha256', appSecret).update(payload).digest('hex');

  try {
    // Use timing-safe comparison to prevent timing attacks
    return timingSafeEqual(Buffer.from(signatureHash), Buffer.from(expectedHash));
  } catch {
    // Lengths don't match
    return false;
  }
}

/**
 * Verify Telegram webhook secret token
 * Telegram sends X-Telegram-Bot-Api-Secret-Token header when secret_token is set
 * @see https://core.telegram.org/bots/api#setwebhook
 */
export function verifyTelegramSecretToken(
  receivedToken: string | null,
  expectedToken: string
): boolean {
  if (!receivedToken || !expectedToken) {
    console.warn('[Security] Missing token for Telegram verification');
    return false;
  }

  try {
    // Use timing-safe comparison to prevent timing attacks
    return timingSafeEqual(Buffer.from(receivedToken), Buffer.from(expectedToken));
  } catch {
    // Lengths don't match
    return false;
  }
}

// ===========================================
// Data Masking (for logging)
// ===========================================

/**
 * Mask phone number for logging
 * @example +4369912345678 -> +43***5678
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '***';
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.length <= 6) return '***';
  return cleaned.slice(0, 3) + '***' + cleaned.slice(-4);
}

/**
 * Mask Telegram chat ID for logging
 * @example 1234567890 -> 12***90
 */
export function maskChatId(chatId: string | number): string {
  const str = String(chatId);
  if (str.length <= 4) return '***';
  return str.slice(0, 2) + '***' + str.slice(-2);
}

// ===========================================
// Input Validation
// ===========================================

/** Maximum message length (both WhatsApp and Telegram) */
export const MAX_MESSAGE_LENGTH = 4096;

/**
 * Truncate message to max length with ellipsis
 * Prevents API errors and DoS via extremely long messages
 */
export function truncateMessage(text: string, maxLength: number = MAX_MESSAGE_LENGTH): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}
