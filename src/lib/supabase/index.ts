/**
 * Supabase Module - Main Entry Point
 *
 * Re-exports all database operations from focused modules.
 *
 * Module structure:
 * - client.ts       - Browser/admin client configuration
 * - server.ts       - SSR server client
 * - middleware.ts   - SSR middleware session refresh
 * - identity.ts     - Unified identity resolution
 * - db-users.ts     - User operations
 * - db-messages.ts  - Message operations
 * - db-reminders.ts - Reminder operations
 * - db-events.ts    - Event operations
 * - db-families.ts  - Family operations
 */

// Client
export { getSupabase, getAdminClient } from './client';

// NOTE: Server and middleware clients are intentionally NOT re-exported here.
// Import them directly from '@/lib/supabase/server' or '@/lib/supabase/middleware'
// to avoid bundling server-only modules into client bundles.

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
  createDraftBundle,
  getDraftBundle,
  getLatestPendingDraftBundle,
  getLatestPendingDraftEvent,
  confirmDraftBundle,
  rejectDraftBundle,
  applyDraftBundleModifications,
  applyDraftEventModifications,
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
  resolveInviteByToken,
  createEmailInvite,
  getInviteById,
  createOpenInvite,
  declineInvite,
  revokeInvite
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
