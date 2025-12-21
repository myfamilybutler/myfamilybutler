/**
 * Auth Module - Main Entry Point
 * 
 * Re-exports authentication and security utilities.
 */

// Session validation helpers
export { validateSession } from './helpers';

// Secure OAuth token storage (database with RLS)
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
