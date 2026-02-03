/**
 * Unified Identity Resolution Module
 * 
 * THE source of truth for finding/creating users across all channels.
 * All auth flows MUST use these functions instead of direct DB queries.
 * 
 * Philosophy:
 * - Phone is the PRIMARY identifier (E.164 normalized)
 * - Email is a SECONDARY identifier (for web login convenience)
 * - telegram_chat_id is a CHANNEL LINK (not an identity)
 * 
 * Phone Verification:
 * - Phones added manually (e.g., in Settings) start as unverified
 * - Phone becomes verified when we receive a WhatsApp/Telegram message from it
 * - This is implicit verification - no SMS costs!
 */
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import type { User, MessageChannel } from '@/types';
import { getAdminClient } from './client';

// ===========================================
// Rate Limiting (In-Memory)
// ===========================================

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // Max 10 requests per identifier per minute

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
let cleanupInterval: ReturnType<typeof setInterval> | null = null;
function ensureRateLimitCleanup() {
  if (cleanupInterval) return;

  // Double-checked locking pattern to prevent race condition
  const newInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap.entries()) {
      if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
        rateLimitMap.delete(key);
      }
    }
  }, RATE_LIMIT_WINDOW_MS);

  // Only assign if still null (second check)
  if (!cleanupInterval) {
    cleanupInterval = newInterval;
    if (cleanupInterval.unref) {
      cleanupInterval.unref();
    }
  } else {
    // Another call already created it
    clearInterval(newInterval);
  }
}

/**
 * Check rate limit for an identifier
 * @returns true if within limit, false if rate limited
 */
function checkRateLimit(identifier: string): boolean {
  ensureRateLimitCleanup();
  
  const now = Date.now();
  const key = `identity:${identifier}`;
  const existing = rateLimitMap.get(key);
  
  if (!existing || now - existing.windowStart > RATE_LIMIT_WINDOW_MS) {
    // New window
    rateLimitMap.set(key, { count: 1, windowStart: now });
    return true;
  }
  
  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    console.warn(`[Identity] Rate limited: ${identifier.slice(0, 10)}***`);
    return false;
  }
  
  existing.count++;
  return true;
}

// ===========================================
// Phone Normalization
// ===========================================

/**
 * Normalize phone number to E.164 format
 * Returns null if phone is invalid
 * 
 * Examples:
 *   "06601234567" → "+436601234567" (Austrian default)
 *   "+49 170 1234567" → "+491701234567"
 *   "00491701234567" → "+491701234567"
 *   "1234" → null (too short)
 */
export function normalizePhone(phone: string): string | null {
  if (!phone || phone.trim().length < 5) {
    return null;
  }

  // Handle 00 prefix (international format without +)
  let cleaned = phone.trim();
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2);
  }
  
  // Try to parse with Austrian default (AT)
  const parsed = parsePhoneNumberFromString(cleaned, 'AT');
  
  if (parsed && parsed.isValid()) {
    return parsed.format('E.164');
  }
  
  // Fallback: If it looks like a phone number with +, return as-is
  // This handles edge cases where libphonenumber doesn't recognize the format
  if (cleaned.startsWith('+') && /^\+\d{10,15}$/.test(cleaned.replace(/\s/g, ''))) {
    return cleaned.replace(/\s/g, '');
  }
  
  return null;
}

/**
 * Find existing user by ANY identifier
 * 
 * Uses a single OR query for efficiency instead of 3 sequential queries.
 * Priority order when multiple matches: phone > email > telegram
 * 
 * Returns null if no user found
 */
export async function findUserByIdentifier(opts: {
  phone?: string;
  email?: string;
  telegramChatId?: string;
}): Promise<User | null> {
  const admin = getAdminClient();
  
  // Normalize inputs
  const normalizedPhone = opts.phone ? normalizePhone(opts.phone) : null;
  const normalizedEmail = opts.email?.toLowerCase().trim();
  
  // Build OR conditions for a single query
  const conditions: string[] = [];
  
  if (normalizedPhone) {
    conditions.push(`phone_number.eq.${normalizedPhone}`);
  }
  if (normalizedEmail) {
    conditions.push(`linked_email.eq.${normalizedEmail}`);
  }
  if (opts.telegramChatId) {
    conditions.push(`telegram_chat_id.eq.${opts.telegramChatId}`);
  }
  
  if (conditions.length === 0) {
    return null;
  }
  
  // Single query with OR conditions
  const { data: users, error } = await admin
    .from('users')
    .select('*')
    .or(conditions.join(','));
  
  if (error) {
    console.error('[Identity] Error finding user:', error);
    return null;
  }
  
  if (!users || users.length === 0) {
    return null;
  }
  
  // If multiple matches, prioritize: phone > email > telegram
  let bestMatch: User | null = null;
  
  for (const user of users) {
    const typedUser = user as User;
    
    // Phone match is highest priority
    if (normalizedPhone && typedUser.phone_number === normalizedPhone) {
      console.log(`[Identity] Found user by phone: ${typedUser.id}`);
      return typedUser;
    }
    
    // Email match is second priority
    if (normalizedEmail && typedUser.linked_email === normalizedEmail) {
      if (!bestMatch || (bestMatch && !bestMatch.phone_number)) {
        bestMatch = typedUser;
      }
    }
    
    // Telegram match is lowest priority
    if (opts.telegramChatId && typedUser.telegram_chat_id === opts.telegramChatId) {
      if (!bestMatch) {
        bestMatch = typedUser;
      }
    }
  }
  
  if (bestMatch) {
    console.log(`[Identity] Found user by ${bestMatch.linked_email === normalizedEmail ? 'email' : 'telegram'}: ${bestMatch.id}`);
    return bestMatch;
  }
  
  return null;
}

// ===========================================
// User Creation & Linking
// ===========================================

export interface FindOrCreateResult {
  user: User | null;
  isNewUser: boolean;
  wasLinked: boolean;  // True if we linked a new identifier to existing user
  error?: string;
}

/**
 * Find OR Create user - THE ONLY function that should create users
 * 
 * Rules:
 * 1. ALWAYS normalize phone to E.164
 * 2. ALWAYS check for existing user first
 * 3. If phone provided and user exists by email, LINK them (add phone)
 * 4. If email provided and user exists by phone, LINK them (add email)
 * 5. Only create new user if no match found
 * 
 * @param opts.phone - Phone number (will be normalized)
 * @param opts.email - Email address (will be lowercased)
 * @param opts.telegramChatId - Telegram chat ID
 * @param opts.displayName - Display name for new users
 * @param opts.channel - Source channel (whatsapp/telegram)
 * @param opts.verifyPhone - If true, marks phone as verified (came from messaging channel)
 */
export async function findOrCreateUser(opts: {
  phone?: string;
  email?: string;
  telegramChatId?: string;
  displayName?: string;
  channel?: MessageChannel;
  verifyPhone?: boolean;
}): Promise<FindOrCreateResult> {
  const admin = getAdminClient();
  
  // Step 1: Normalize identifiers
  const normalizedPhone = opts.phone ? normalizePhone(opts.phone) : null;
  const normalizedEmail = opts.email?.toLowerCase().trim();
  
  // Validate: at least one identifier required
  if (!normalizedPhone && !normalizedEmail && !opts.telegramChatId) {
    return { 
      user: null, 
      isNewUser: false, 
      wasLinked: false, 
      error: 'Phone, email, or telegram ID required' 
    };
  }
  
  // Step 1.5: Rate limiting check
  const rateLimitKey = normalizedPhone || normalizedEmail || opts.telegramChatId || '';
  if (!checkRateLimit(rateLimitKey)) {
    return {
      user: null,
      isNewUser: false,
      wasLinked: false,
      error: 'Too many requests. Please try again later.',
    };
  }
  
  // Log for debugging (masked)
  const phoneHint = normalizedPhone ? `${normalizedPhone.slice(0, 5)}***` : 'none';
  const emailHint = normalizedEmail ? `${normalizedEmail.split('@')[0].slice(0, 3)}***@***` : 'none';
  console.log(`[Identity] findOrCreateUser - phone: ${phoneHint}, email: ${emailHint}, channel: ${opts.channel || 'unknown'}`);
  
  // Step 2: Use optimized single-query lookup to find existing user
  const existingUser = await findUserByIdentifier({
    phone: normalizedPhone || undefined,
    email: normalizedEmail,
    telegramChatId: opts.telegramChatId,
  });
  
  // Step 5: User exists - maybe link additional identifiers
  if (existingUser) {
    const updates: Record<string, unknown> = {};
    let wasLinked = false;
    
    // Link phone if missing
    if (normalizedPhone && !existingUser.phone_number) {
      updates.phone_number = normalizedPhone;
      updates.phone_verified = opts.verifyPhone ?? false;
      wasLinked = true;
      console.log(`[Identity] Linking phone to user ${existingUser.id}`);
    }
    
    // Update phone verification if coming from messaging channel
    if (normalizedPhone && existingUser.phone_number === normalizedPhone && opts.verifyPhone) {
      updates.phone_verified = true;
    }
    
    // Link email if missing
    if (normalizedEmail && !existingUser.linked_email) {
      updates.linked_email = normalizedEmail;
      updates.email_verified = false; // Email needs verification
      wasLinked = true;
      console.log(`[Identity] Linking email to user ${existingUser.id}`);
    }
    
    // Link telegram if missing
    if (opts.telegramChatId && !existingUser.telegram_chat_id) {
      updates.telegram_chat_id = opts.telegramChatId;
      wasLinked = true;
      console.log(`[Identity] Linking telegram to user ${existingUser.id}`);
    }
    
    // Update display name if provided and missing
    if (opts.displayName && !existingUser.display_name) {
      updates.display_name = opts.displayName;
    }
    
    // Track linking timestamp
    if (wasLinked) {
      updates.identity_linked_at = new Date().toISOString();
    }
    
    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      const { data: updatedUser, error: updateError } = await admin
        .from('users')
        .update(updates)
        .eq('id', existingUser.id)
        .select()
        .single();
      
      if (updateError) {
        console.error(`[Identity] Error updating user ${existingUser.id}:`, updateError);
        // Return existing user even if update failed
        return { user: existingUser, isNewUser: false, wasLinked: false };
      }
      
      return { user: updatedUser as User, isNewUser: false, wasLinked };
    }
    
    return { user: existingUser, isNewUser: false, wasLinked: false };
  }
  
  // Step 6: Create new user
  console.log(`[Identity] Creating new user`);
  
  const insertData: Record<string, unknown> = {
    subscription_status: 'free',
    onboarding_modal_shown: false,
  };
  
  if (normalizedPhone) {
    insertData.phone_number = normalizedPhone;
    insertData.phone_verified = opts.verifyPhone ?? false;
  }
  if (normalizedEmail) {
    insertData.linked_email = normalizedEmail;
    insertData.email_verified = false;
  }
  if (opts.telegramChatId) {
    insertData.telegram_chat_id = opts.telegramChatId;
  }
  if (opts.displayName) {
    insertData.display_name = opts.displayName;
  }
  if (opts.channel) {
    insertData.onboarding_source = opts.channel;
  }
  
  const { data: newUser, error } = await admin
    .from('users')
    .insert(insertData)
    .select()
    .single();
  
  // Handle race condition (another request created user first)
  if (error?.code === '23505') {
    console.log(`[Identity] Race condition - user already exists, retrying lookup`);
    // Unique constraint violation - user was just created, try to find them
    const retryUser = await findUserByIdentifier({
      phone: opts.phone,
      email: opts.email,
      telegramChatId: opts.telegramChatId,
    });
    return { user: retryUser, isNewUser: false, wasLinked: false };
  }
  
  if (error) {
    console.error('[Identity] Error creating user:', error);
    return { user: null, isNewUser: false, wasLinked: false, error: error.message };
  }
  
  console.log(`[Identity] Created new user: ${newUser.id}`);
  return { user: newUser as User, isNewUser: true, wasLinked: false };
}

// ===========================================
// Identifier Linking
// ===========================================

/**
 * Link a new identifier to an existing user
 * Used by Settings page when user adds email or phone
 * 
 * SECURITY: Caller must verify ownership:
 * - Email: Via verification email (already implemented)
 * - Phone: Via receiving a WhatsApp/Telegram message from that number
 */
export async function linkIdentifierToUser(
  userId: string,
  identifier: { 
    phone?: string; 
    email?: string; 
    telegramChatId?: string;
    verified?: boolean;  // Only for phone - was it verified via messaging channel?
  }
): Promise<{ success: boolean; error?: string }> {
  const admin = getAdminClient();
  
  const updates: Record<string, unknown> = {};
  
  // Handle phone linking
  if (identifier.phone) {
    const normalized = normalizePhone(identifier.phone);
    if (!normalized) {
      return { success: false, error: 'Invalid phone number format' };
    }
    
    // Check if phone is already used by another user
    const { data: existing } = await admin
      .from('users')
      .select('id')
      .eq('phone_number', normalized)
      .neq('id', userId)
      .maybeSingle();
    
    if (existing) {
      return { success: false, error: 'Phone number already in use by another account' };
    }
    
    updates.phone_number = normalized;
    updates.phone_verified = identifier.verified ?? false;
    console.log(`[Identity] Linking phone to user ${userId}: ${normalized.slice(0, 5)}***`);
  }
  
  // Handle email linking
  if (identifier.email) {
    const normalized = identifier.email.toLowerCase().trim();
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalized)) {
      return { success: false, error: 'Invalid email format' };
    }
    
    // Check if email is already used by another user
    const { data: existing } = await admin
      .from('users')
      .select('id')
      .eq('linked_email', normalized)
      .neq('id', userId)
      .maybeSingle();
    
    if (existing) {
      return { success: false, error: 'Email already in use by another account' };
    }
    
    updates.linked_email = normalized;
    updates.email_verified = false; // Needs verification
    console.log(`[Identity] Linking email to user ${userId}`);
  }
  
  // Handle telegram linking
  if (identifier.telegramChatId) {
    // Check if telegram is already used by another user
    const { data: existing } = await admin
      .from('users')
      .select('id')
      .eq('telegram_chat_id', identifier.telegramChatId)
      .neq('id', userId)
      .maybeSingle();
    
    if (existing) {
      return { success: false, error: 'Telegram account already linked to another user' };
    }
    
    updates.telegram_chat_id = identifier.telegramChatId;
    console.log(`[Identity] Linking telegram to user ${userId}`);
  }
  
  // Validate we have something to update
  if (Object.keys(updates).length === 0) {
    return { success: false, error: 'No identifier provided' };
  }
  
  // Track linking timestamp
  updates.identity_linked_at = new Date().toISOString();
  
  // Apply updates
  const { error } = await admin
    .from('users')
    .update(updates)
    .eq('id', userId);
  
  if (error) {
    console.error(`[Identity] Error linking identifier to user ${userId}:`, error);
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

// ===========================================
// Phone Verification Helper
// ===========================================

/**
 * Mark a phone number as verified
 * Called when we receive a message from that phone via WhatsApp/Telegram
 */
export async function markPhoneVerified(
  userId: string,
  phone: string
): Promise<boolean> {
  const admin = getAdminClient();
  const normalized = normalizePhone(phone);
  
  if (!normalized) {
    return false;
  }
  
  const { error } = await admin
    .from('users')
    .update({ phone_verified: true })
    .eq('id', userId)
    .eq('phone_number', normalized);
  
  if (error) {
    console.error(`[Identity] Error marking phone verified for ${userId}:`, error);
    return false;
  }
  
  console.log(`[Identity] Phone verified for user ${userId}`);
  return true;
}
