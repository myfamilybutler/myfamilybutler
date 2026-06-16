/**
 * Auth-related validation helpers.
 */

/**
 * Extract the hostname from a URL string safely.
 */
function getHostname(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Build the set of allowed redirect hostnames.
 * Defaults to the hostname of NEXT_PUBLIC_APP_URL and localhost for development.
 */
function buildAllowedHostSet(): Set<string> {
  const allowed = new Set<string>();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    const hostname = getHostname(appUrl);
    if (hostname) {
      allowed.add(hostname);
    }
  }

  // Always allow localhost variants for development.
  allowed.add('localhost');
  allowed.add('127.0.0.1');

  return allowed;
}

/**
 * Check whether a forwarded-host value is allowed for redirects.
 */
export function isAllowedForwardedHost(host: string): boolean {
  const allowed = buildAllowedHostSet();
  const normalized = host.toLowerCase().split(':')[0];
  return allowed.has(normalized);
}

/**
 * Sanitize the `next` redirect path parameter.
 * Only allow relative internal paths that start with `/` and do not contain
 * protocol/hostname injection patterns.
 */
export function sanitizeNextPath(next: string | null | undefined): string {
  if (!next) {
    return '/dashboard';
  }

  const trimmed = next.trim();

  // Reject anything that isn't a relative path.
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    /^(https?:|ftp:|javascript:|data:)/i.test(trimmed)
  ) {
    return '/dashboard';
  }

  // Reject newlines and control characters.
  if (/[\r\n\x00-\x1f\x7f]/.test(trimmed)) {
    return '/dashboard';
  }

  return trimmed;
}
