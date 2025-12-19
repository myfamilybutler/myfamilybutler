import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

/**
 * Normalize phone number to E.164 format.
 * Handles various input formats:
 * - International with + prefix: +491234567890
 * - International with 00 prefix: 00491234567890
 * - Local German numbers: 01234567890
 * Returns null if invalid.
 */
export function normalizePhone(phone: string): string | null {
  try {
    if (!phone) return null;
    
    let p = phone.trim();
    
    // Handle 00 international prefix (replace with +)
    if (p.startsWith('00')) {
      p = '+' + p.substring(2);
    }
    
    // First try to parse as-is (may already have country code)
    if (isValidPhoneNumber(p)) {
      const parsed = parsePhoneNumber(p);
      return parsed?.number?.toString() || null;
    }
    
    // Try with German country code as default
    if (isValidPhoneNumber(p, 'DE')) {
      const parsed = parsePhoneNumber(p, 'DE');
      return parsed?.number?.toString() || null;
    }
    
    // Try with Austrian country code
    if (isValidPhoneNumber(p, 'AT')) {
      const parsed = parsePhoneNumber(p, 'AT');
      return parsed?.number?.toString() || null;
    }
    
    return null;
  } catch {
    return null;
  }
}
