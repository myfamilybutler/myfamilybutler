/**
 * Validate that a redirect target is a safe, internal, relative path.
 * Rejects external URLs, protocol-relative URLs, and javascript/data URIs.
 */
export function isInternalRedirectPath(path: unknown): path is string {
  if (typeof path !== 'string' || path.length === 0) {
    return false;
  }

  // Must be a relative path starting with a single '/'.
  if (!path.startsWith('/') || path.startsWith('//')) {
    return false;
  }

  // Reject obvious URI schemes embedded in the path.
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) {
    return false;
  }

  return true;
}

/**
 * Sanitize a return URL for use after auth flows. Falls back to the default
 * when the provided value is not a safe internal path.
 */
export function safeReturnUrl(path: unknown, defaultPath: string = '/dashboard'): string {
  return isInternalRedirectPath(path) ? path : defaultPath;
}
