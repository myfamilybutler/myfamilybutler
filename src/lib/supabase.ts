/**
 * Supabase Module - Backward Compatible Re-exports
 * 
 * This file re-exports all database operations from focused modules.
 * Existing imports continue to work: import { getSupabase, ... } from '@/lib/supabase'
 * 
 * Module structure:
 * - supabase/client.ts       - Client configuration
 * - supabase/db-users.ts     - User operations
 * - supabase/db-messages.ts  - Message operations
 * - supabase/db-reminders.ts - Reminder operations
 * - supabase/db-events.ts    - Event operations
 * - supabase/db-families.ts  - Family operations
 * - supabase/magic-tokens.ts - Auth token operations
 */

// Client
export { getSupabase, getAdminClient } from './supabase/client';

// Users
export {
  findOrCreateUser,
  findUserById,
  updateUserDisplayName,
  type FindOrCreateUserResult,
} from './supabase/db-users';

// Messages
export { logMessage, getMessageHistory } from './supabase/db-messages';

// Reminders
export {
  createReminder,
  getPendingReminders,
  updateReminderStatus
} from './supabase/db-reminders';

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
} from './supabase/db-events';

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
  getPendingInvites
} from './supabase/db-families';

// Magic Tokens (Auth)
export {
  generateDashboardLink,
  validateMagicToken,
  cleanupExpiredTokens
} from './supabase/magic-tokens';

// Email Tokens (Auth)
export {
  generateEmailLoginToken,
  validateEmailLoginToken,
  cleanupExpiredEmailTokens,
} from './supabase/email-tokens';
