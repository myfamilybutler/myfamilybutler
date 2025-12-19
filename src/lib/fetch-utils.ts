// ===========================================
// Shared Fetch Utilities
// ===========================================

const DEFAULT_TIMEOUT_MS = 10000; // 10 seconds

/**
 * Fetch with timeout using AbortController.
 * Prevents hung requests to external APIs.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}
