/**
 * Google Calendar Sync - Barrel Export
 * 
 * This file re-exports all Google Calendar related functions from specialized modules.
 * Use this for backwards compatibility or import directly from the specific modules.
 */

// OAuth functions
export {
  getGoogleOAuthUrl,
  exchangeCodeForTokens,
  completeGoogleOAuth,
  fetchAndUpdateProfile,
} from './google-oauth';

// Calendar API functions
export {
  syncEventToGoogle,
  updateGoogleEvent,
  deleteGoogleEvent,
  fetchGoogleEvents,
  fetchGoogleEventsIncremental,
  type GoogleCalendarEvent,
  type GoogleCalendarEventWithStatus,
  type IncrementalSyncResult,
} from './google-calendar';
