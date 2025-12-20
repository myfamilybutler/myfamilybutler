/**
 * Phone Utilities
 * 
 * Phone number formatting and validation helpers.
 */

/**
 * Normalize a phone number by removing non-digits
 * and ensuring it starts with a country code
 */
export function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters except leading +
  let normalized = phone.replace(/[^\d+]/g, '');
  
  // If no + at start, assume Austrian number
  if (!normalized.startsWith('+')) {
    if (normalized.startsWith('00')) {
      normalized = '+' + normalized.slice(2);
    } else if (normalized.startsWith('0')) {
      normalized = '+43' + normalized.slice(1);
    } else {
      normalized = '+43' + normalized;
    }
  }
  
  return normalized;
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  const normalized = normalizePhoneNumber(phone);
  
  // Simple formatting: +43 XXX XXXXXXX
  if (normalized.startsWith('+43')) {
    const rest = normalized.slice(3);
    if (rest.length >= 10) {
      return `+43 ${rest.slice(0, 3)} ${rest.slice(3)}`;
    }
  }
  
  return normalized;
}

/**
 * Validate phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);
  // Must start with + and have at least 10 digits
  return /^\+\d{10,15}$/.test(normalized);
}
