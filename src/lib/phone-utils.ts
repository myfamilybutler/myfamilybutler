import { parsePhoneNumber, isValidPhoneNumber, type CountryCode } from 'libphonenumber-js';

/**
 * Default countries to try when parsing phone numbers without country code.
 * Austria first (primary market), Germany second.
 */
const DEFAULT_COUNTRIES: CountryCode[] = ['AT', 'DE'];

/**
 * Normalize phone number to E.164 format.
 * Handles various input formats:
 * - International with + prefix: +491234567890
 * - International with 00 prefix: 00491234567890
 * - Local numbers: 01234567890
 * Returns null if invalid.
 */
export function normalizePhone(phone: string): string | null {
  if (!phone) return null;
  
  // Normalize 00 prefix to + (common European format)
  const cleaned = phone.trim().replace(/^00/, '+');
  
  // Try parsing as-is first (might already have country code)
  if (isValidPhoneNumber(cleaned)) {
    try {
      const parsed = parsePhoneNumber(cleaned);
      return parsed?.number ?? null;
    } catch {
      // Fall through to try with country codes
    }
  }
  
  // Try with default country codes
  for (const country of DEFAULT_COUNTRIES) {
    if (isValidPhoneNumber(cleaned, country)) {
      try {
        const parsed = parsePhoneNumber(cleaned, country);
        return parsed?.number ?? null;
      } catch {
        continue;
      }
    }
  }
  
  return null;
}

