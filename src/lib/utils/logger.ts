/**
 * Logger Utilities
 * 
 * Environment-aware logging utilities for the application.
 * - debug/info: Only logs in development
 * - warn/error: Always logs (important for production debugging)
 */

const isDev = process.env.NODE_ENV === 'development';

/**
 * Log info messages (development only)
 */
export function logger(...args: unknown[]): void {
  if (isDev) {
    console.log('[MFB]', ...args);
  }
}

/**
 * Log error messages (always)
 */
export function logError(...args: unknown[]): void {
  console.error('[MFB Error]', ...args);
}

/**
 * Log warning messages (always)
 */
export function logWarn(...args: unknown[]): void {
  console.warn('[MFB Warn]', ...args);
}

/**
 * Log debug messages (development only)
 */
export function logDebug(...args: unknown[]): void {
  if (isDev) {
    console.debug('[MFB Debug]', ...args);
  }
}

// Object-style export for structured usage
export const log = {
  /** Info level - development only */
  info: logger,
  /** Error level - always logs */
  error: logError,
  /** Warning level - always logs */
  warn: logWarn,
  /** Debug level - development only */
  debug: logDebug,
};
