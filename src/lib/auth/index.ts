/**
 * Auth Module - Main Entry Point
 * 
 * Re-exports authentication and security utilities.
 */

// Session validation helpers
export { validateSession } from './helpers';

// Secure token storage (Supabase Vault)
export { 
  storeGoogleToken,
  getGoogleToken,
  deleteGoogleToken,
  hasGoogleToken,
  isTokenExpired,
  refreshGoogleToken,
  getValidGoogleToken,
  type GoogleToken,
} from './vault';
