/**
 * Supabase Module - Main Entry Point
 * 
 * Re-exports all database operations from focused modules.
 * 
 * Module structure:
 * - client.ts       - Client configuration
 * - identity.ts     - Unified identity resolution (NEW - use this!)
 * - db-users.ts     - User operations (legacy, being deprecated)
 * - db-messages.ts  - Message operations
 * - db-reminders.ts - Reminder operations
 * - db-events.ts    - Event operations
 * - db-families.ts  - Family operations
 * - magic-tokens.ts - Auth token operations
 * - email-tokens.ts - Email auth operations
 */

// Client
export { getSupabase, getAdminClient } from './client';

// ============================================
// Identity Resolution (NEW - Preferred API)
// ============================================
export {
  normalizePhone,
  findUserByIdentifier,
  findOrCreateUser as unifiedFindOrCreateUser,
  linkIdentifierToUser,
  markPhoneVerified,
  type FindOrCreateResult,
} from './identity';

// ============================================
// Users (Legacy - prefer identity.ts for new code)
// ============================================
/**
 * @deprecated Use unifiedFindOrCreateUser from identity.ts instead
 */
export {
  findOrCreateUser,
  findOrCreateUserByEmail,
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
  updateReminderStatus,
  claimDueReminders,
  completeClaimedReminder,
  claimReminderById,
  type ClaimedReminder,
} from './db-reminders';

// Events
export {
  createEvent,
  createEventsBulk,
  getEventsForHousehold,
  updateEvent,
  deleteEvent,
  createEventReminder,
  createDraftEvent,
  confirmDraftEvent,
  rejectDraftEvent,
  getDraftEvent,
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
  getInviteById,
  createOpenInvite
} from './db-families';

// Magic Tokens (Auth)
export {
  generateDashboardLink,
  generateDashboardLinkForUser,
  validateMagicToken,
  cleanupExpiredTokens
} from './magic-tokens';

// Email Tokens (Auth)
export {
  generateEmailLoginToken,
  validateEmailLoginToken,
  cleanupExpiredEmailTokens,
} from './email-tokens';
