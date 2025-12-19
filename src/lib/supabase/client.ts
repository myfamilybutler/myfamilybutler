/**
 * Supabase Client Configuration
 * 
 * Provides singleton instances of Supabase clients:
 * - getSupabase(): Public client for client-side usage
 * - getAdminClient(): Admin client for server-side with elevated privileges
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Public client singleton (lazy initialization)
let publicClient: SupabaseClient | null = null;

/**
 * Get public Supabase client (for client-side usage)
 * Uses lazy initialization to prevent build-time errors
 */
export function getSupabase(): SupabaseClient {
  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }
  if (!supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
  }
  
  if (!publicClient) {
    publicClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  
  return publicClient;
}

// Admin client singleton
let adminClient: SupabaseClient | null = null;

/**
 * Get admin Supabase client (for server-side usage with elevated privileges)
 */
export function getAdminClient(): SupabaseClient {
  if (!supabaseServiceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }
  
  if (!adminClient) {
    adminClient = createClient(supabaseUrl!, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  
  return adminClient;
}
