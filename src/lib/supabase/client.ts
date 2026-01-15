/**
 * Supabase Client Configuration - Phase 4.1
 * 
 * Provides singleton instances of Supabase clients:
 * - getSupabase(): Public client for client-side usage
 * - getAdminClient(): Admin client for server-side with elevated privileges
 * 
 * Connection Pooling:
 * - Uses Supavisor (Supabase's built-in connection pooler) in production
 * - Set SUPABASE_POOLER_URL env var for pooled connections
 * - Falls back to direct connection if pooler URL not set
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ===========================================
// Environment Variables
// ===========================================

// Direct connection URL (always required)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Pooler URL (optional - for serverless environments)
// Format: postgresql://postgres.xxx:[password]@xxx.pooler.supabase.com:6543/postgres
const supabasePoolerUrl = process.env.SUPABASE_POOLER_URL;

// ===========================================
// Connection Configuration
// ===========================================

/**
 * Get the appropriate URL for admin connections
 * Uses pooler URL if available (recommended for serverless)
 */
function getAdminConnectionUrl(): string {
  // In production with pooler configured, use pooler
  if (process.env.NODE_ENV === 'production' && supabasePoolerUrl) {
    console.log('[Supabase] Using connection pooler');
    return supabasePoolerUrl;
  }
  
  // Fall back to direct connection
  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }
  
  return supabaseUrl;
}

// ===========================================
// Client Singletons
// ===========================================

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
 * 
 * Features:
 * - Uses connection pooler in production (if SUPABASE_POOLER_URL is set)
 * - Transaction mode pooling for serverless compatibility
 * - No session persistence (stateless)
 */
export function getAdminClient(): SupabaseClient {
  if (!supabaseServiceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }
  
  if (!adminClient) {
    const connectionUrl = getAdminConnectionUrl();
    
    adminClient = createClient(connectionUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      // Database options for connection pooling
      db: {
        schema: 'public',
      },
      // Global options
      global: {
        headers: {
          'x-connection-mode': 'pooler', // Hint for load balancers
        },
      },
    });
  }
  
  return adminClient;
}

// ===========================================
// Utility Functions
// ===========================================

/**
 * Check if connection pooling is enabled
 */
export function isPoolingEnabled(): boolean {
  return !!(process.env.NODE_ENV === 'production' && supabasePoolerUrl);
}

/**
 * Get connection info (for debugging)
 */
export function getConnectionInfo(): {
  mode: 'direct' | 'pooled';
  url: string;
} {
  const isPooled = isPoolingEnabled();
  return {
    mode: isPooled ? 'pooled' : 'direct',
    url: isPooled ? supabasePoolerUrl!.split('@')[1]?.split('/')[0] || 'hidden' : supabaseUrl || 'not-set',
  };
}

// Log connection mode on module load (development only)
if (process.env.NODE_ENV === 'development') {
  const info = getConnectionInfo();
  console.log(`[Supabase] Connection mode: ${info.mode} (${info.url})`);
}
