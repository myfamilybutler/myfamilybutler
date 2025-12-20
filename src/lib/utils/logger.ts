/**
 * Logger Utilities
 * 
 * Simple logging utilities for the application.
 */

export function logger(...args: unknown[]): void {
  console.log('[MFB]', ...args);
}

export function logError(...args: unknown[]): void {
  console.error('[MFB Error]', ...args);
}

export function logWarn(...args: unknown[]): void {
  console.warn('[MFB Warn]', ...args);
}

export function logDebug(...args: unknown[]): void {
  if (process.env.NODE_ENV === 'development') {
    console.debug('[MFB Debug]', ...args);
  }
}

// Object-style export for backwards compatibility
export const log = {
  info: logger,
  error: logError,
  warn: logWarn,
  debug: logDebug,
};
