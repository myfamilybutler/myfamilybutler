/**
 * Event Fingerprinting for Deduplication
 * 
 * Generates a consistent fingerprint for events to detect duplicates.
 * Two events with the same fingerprint are considered the same event.
 */
import crypto from 'crypto';

export interface FingerprintInput {
  title: string;
  event_date: string;        // YYYY-MM-DD
  event_time?: string | null; // HH:MM or null for all-day
}

/**
 * Generate a fingerprint for deduplication.
 * 
 * Strategy: Normalize and hash title + date + time
 * - Title is lowercased, trimmed, punctuation removed, whitespace collapsed
 * - Date is kept as-is (YYYY-MM-DD)
 * - Time is optional (null for all-day events)
 * 
 * @example
 * generateEventFingerprint({ title: "Dentist Appointment", event_date: "2024-01-15", event_time: "10:00" })
 * // Returns: "a1b2c3d4e5f6g7h8" (16-char hex)
 */
export function generateEventFingerprint(input: FingerprintInput): string {
  // Normalize title: lowercase, trim, remove punctuation, collapse whitespace
  const normalizedTitle = input.title
    .toLowerCase()
    .trim()
    .replace(/[^\w\sÄäÖöÜüß]/g, '')  // Keep German umlauts
    .replace(/\s+/g, ' ');
  
  // Combine date and time
  const dateTime = input.event_time 
    ? `${input.event_date}T${input.event_time}`
    : input.event_date;
  
  // Create hash input
  const hashInput = `${normalizedTitle}|${dateTime}`;
  
  // Generate SHA-256 hash and take first 16 characters
  return crypto
    .createHash('sha256')
    .update(hashInput)
    .digest('hex')
    .slice(0, 16);
}

/**
 * Check if two events would have the same fingerprint.
 * Useful for quick comparison without computing the full hash.
 */
export function wouldMatch(a: FingerprintInput, b: FingerprintInput): boolean {
  return generateEventFingerprint(a) === generateEventFingerprint(b);
}

/**
 * Generate fingerprint from a Google Calendar event object.
 */
export function fingerprintFromGoogleEvent(googleEvent: {
  summary?: string;
  start?: { dateTime?: string; date?: string };
}): string {
  const title = googleEvent.summary || 'Untitled Event';
  
  // Extract date and time from Google event
  let eventDate: string;
  let eventTime: string | null = null;
  
  if (googleEvent.start?.dateTime) {
    // Timed event: "2024-01-15T10:00:00+01:00"
    const [datePart, timePart] = googleEvent.start.dateTime.split('T');
    eventDate = datePart;
    eventTime = timePart?.slice(0, 5) || null; // "10:00"
  } else if (googleEvent.start?.date) {
    // All-day event: "2024-01-15"
    eventDate = googleEvent.start.date;
  } else {
    // Fallback
    eventDate = new Date().toISOString().split('T')[0];
  }
  
  return generateEventFingerprint({ title, event_date: eventDate, event_time: eventTime });
}
