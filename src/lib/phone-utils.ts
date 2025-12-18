import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

/**
 * Normalize phone number to E.164 format.
 * Defaults to DE (Germany) if country code is missing, as per typical user base.
 * Returns null if invalid.
 */
export function normalizePhone(phone: string): string | null {
  try {
    if (!phone) return null;
    
    // Add + prefix if missing (heuristic)
    const p = phone.trim();
    if (!p.startsWith('+') && !p.startsWith('00')) {
      // Assume local number? Or international without +?
      // Best practice: Use parsing library with default country
      // If starts with 00, replace with +
    }

    if (!isValidPhoneNumber(p, 'DE')) {
       // Try 'US' or generic?
       // Let's stick to strict validation.
       if (isValidPhoneNumber(p)) {
         const parsed = parsePhoneNumber(p);
         return parsed?.number?.toString() || null;
       }
       return null;
    }

    const parsed = parsePhoneNumber(p, 'DE');
    return parsed?.number?.toString() || null;
  } catch (_error) {
    return null;
  }
}
