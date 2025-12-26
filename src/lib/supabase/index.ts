/**
 * Supabase Module - Main Entry Point
 * 
 * Re-exports all database operations from focused modules.
 * 
 * Module structure:
 * - client.ts       - Client configuration
 * - db-users.ts     - User operations
 * - db-messages.ts  - Message operations
 * - db-reminders.ts - Reminder operations
 * - db-events.ts    - Event operations
 * - db-families.ts  - Family operations
 * - magic-tokens.ts - Auth token operations
 * - email-tokens.ts - Email auth operations
 */

// Client
export { getSupabase, getAdminClient } from './client';

// Users
export {
  findOrCreateUser,
  findUserById,
  updateUserDisplayName,
  type FindOrCreateUserResult,
} from './db-users';

// Messages
export { logMessage, getMessageHistory } from './db-messages';

// Reminders
export {
  createReminder,
  getPendingReminders,
  updateReminderStatus
} from './db-reminders';

// Events
export {
  createEvent,
  getEventsForHousehold,
  updateEvent,
  deleteEvent,
  createEventReminder,
  createDraftEvent,
  confirmDraftEvent,
  rejectDraftEvent,
  getDraftEvents,
} from './db-events';

// Families
export {
  createFamilyForUser,
  checkPendingInvite,
  acceptInvite,
  createFamilyInvite,
  addFamilyMember,
  editFamilyMember,
  deleteFamilyMember,
  getFamilyMembers,
  getPendingInvites,
  getInviteByToken,
  createEmailInvite,
  getInviteById
} from './db-families';

// Magic Tokens (Auth)
export {
  generateDashboardLink,
  validateMagicToken,
  cleanupExpiredTokens
} from './magic-tokens';

// Email Tokens (Auth)
export {
  generateEmailLoginToken,
  validateEmailLoginToken,
  cleanupExpiredEmailTokens,
} from './email-tokens';
