/**
 * Centralized logging utility.
 * Prevents debug logs from leaking to production.
 */
const isDev = process.env.NODE_ENV === 'development';

export const log = {
  /** Info logs - only in development */
  info: (...args: unknown[]) => isDev && console.log(...args),
  
  /** Error logs - always logged */
  error: (...args: unknown[]) => console.error(...args),
  
  /** Debug logs - only in development, prefixed */
  debug: (...args: unknown[]) => isDev && console.log('[DEBUG]', ...args),
  
  /** Warn logs - always logged */
  warn: (...args: unknown[]) => console.warn(...args),
};
