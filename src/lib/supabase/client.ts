import { createBrowserClient } from '@supabase/ssr';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { log } from '@/lib/utils/logger';

// ===========================================
// Environment Variables
// ===========================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabasePoolerUrl = process.env.SUPABASE_POOLER_URL;

// ===========================================
// Browser Client (SSR-aware)
// ===========================================

let browserClient: SupabaseClient | null = null;

/**
 * Get the browser Supabase client (for client-side usage).
 * Uses @supabase/ssr so cookies are managed correctly.
 */
export function getSupabase(): SupabaseClient {
  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }
  if (!supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
  }

  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }

  return browserClient;
}

// ===========================================
// Admin Client (service role, server-side only)
// ===========================================

let adminClient: SupabaseClient | null = null;

function getAdminConnectionUrl(): string {
  if (process.env.NODE_ENV === 'production' && supabasePoolerUrl) {
    log.info('[Supabase] Using connection pooler');
    return supabasePoolerUrl;
  }

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }

  return supabaseUrl;
}

/**
 * Get admin Supabase client (for server-side usage with elevated privileges).
 * Should only be used in server contexts where RLS bypass is required.
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
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'x-connection-mode': 'pooler',
        },
      },
    });
  }

  return adminClient;
}

// ===========================================
// Utility Functions
// ===========================================

export function isPoolingEnabled(): boolean {
  return !!(process.env.NODE_ENV === 'production' && supabasePoolerUrl);
}

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

if (process.env.NODE_ENV === 'development') {
  const info = getConnectionInfo();
  log.info(`[Supabase] Connection mode: ${info.mode} (${info.url})`);
}
