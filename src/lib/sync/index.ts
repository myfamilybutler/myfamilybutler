/**
 * Sync Module - Barrel Export
 * 
 * Clean re-exports for Google Calendar sync functionality.
 */

// Google OAuth
export {
  getGoogleOAuthUrl,
  exchangeCodeForTokens,
  completeGoogleOAuth,
  fetchAndUpdateProfile,
} from './google-oauth';

// Google Calendar API
export {
  fetchGoogleEvents,
  fetchGoogleEventsIncremental,
  syncEventToGoogle,
  updateGoogleEvent,
  deleteGoogleEvent,
  type GoogleCalendarEvent,
  type IncrementalSyncResult,
} from './google-calendar';

// Google Sync Service
export {
  pullFromGoogle,
  pushCreateToGoogle,
  pushUpdateToGoogle,
  pushDeleteToGoogle,
  checkDuplicateEvent,
  type SyncResult,
  type PushResult,
} from './google-sync-service';

// Event Fingerprinting
export {
  generateEventFingerprint,
  fingerprintFromGoogleEvent,
} from './event-fingerprint';

// Re-export from google.ts
export * from './google';
