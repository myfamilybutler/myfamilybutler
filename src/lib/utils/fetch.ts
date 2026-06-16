/**
 * Fetch Utilities
 *
 * Enhanced fetch with timeout support and SSRF-safe URL validation.
 */

/**
 * Fetch with timeout wrapper
 *
 * Prevents hanging requests by aborting after `timeoutMs`. If the caller passes
 * an external AbortSignal, both the external signal and the timeout signal are
 * linked so an abort from either side cancels the request.
 */
export async function fetchWithTimeout(
  url: string,
  options?: RequestInit,
  timeoutMs: number = 30000
): Promise<Response> {
  const controller = new AbortController();
  const externalSignal = options?.signal;

  let onExternalAbort: (() => void) | null = null;
  if (externalSignal) {
    onExternalAbort = () => controller.abort();
    externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(id);
    if (externalSignal && onExternalAbort) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}

/**
 * Check whether an IPv4 or IPv6 address belongs to a private, loopback,
 * link-local or otherwise internal range.
 */
function isPrivateIp(ip: string): boolean {
  // IPv4
  const ipv4Match = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const octets = ipv4Match.slice(1).map(Number);
    if (octets.some((o) => o > 255)) return false;
    const [a, b, c, d] = octets;
    const numeric = (a << 24) | (b << 16) | (c << 8) | d;

    // 127.0.0.0/8
    if ((numeric >>> 24) === 127) return true;
    // 10.0.0.0/8
    if ((numeric >>> 24) === 10) return true;
    // 172.16.0.0/12
    if ((numeric >>> 20) >= 0xac10 && (numeric >>> 20) <= 0xac1f) return true;
    // 192.168.0.0/16
    if ((numeric >>> 16) === 0xc0a8) return true;
    // 169.254.0.0/16 (link-local)
    if ((numeric >>> 16) === 0xa9fe) return true;

    return false;
  }

  // IPv6
  if (ip.includes(':')) {
    let expanded = ip.toLowerCase();

    // ::1 shorthand
    if (expanded === '::1') return true;

    // Expand :: abbreviation
    if (expanded.includes('::')) {
      const [leftRaw, rightRaw] = expanded.split('::');
      const left = leftRaw ? leftRaw.split(':') : [];
      const right = rightRaw ? rightRaw.split(':') : [];
      const missing = 8 - left.length - right.length;
      const middle = new Array(missing).fill('0');
      expanded = [...left, ...middle, ...right].join(':');
    }

    const groups = expanded.split(':');
    if (groups.length !== 8) return false;

    const first = parseInt(groups[0], 16);
    if (Number.isNaN(first)) return false;

    // fc00::/7 (unique local)
    if ((first & 0xfe00) === 0xfc00) return true;
    // fe80::/10 (link-local)
    if ((first & 0xffc0) === 0xfe80) return true;

    // IPv4-mapped IPv6 ::ffff:x.x.x.x / ::ffff:0:x.x.x.x
    if (
      groups.slice(0, 5).every((g) => g === '0') &&
      (groups[5] === 'ffff' || groups[5] === '0')
    ) {
      const embedded = groups.slice(6).join(':');
      if (embedded.includes('.')) {
        return isPrivateIp(embedded);
      }
      const high = parseInt(groups[6], 16);
      const low = parseInt(groups[7], 16);
      if (!Number.isNaN(high) && !Number.isNaN(low)) {
        const mapped = `${(high >> 8) & 0xff}.${high & 0xff}.${(low >> 8) & 0xff}.${low & 0xff}`;
        return isPrivateIp(mapped);
      }
    }

    return false;
  }

  return false;
}

/**
 * Validate that a media download URL is safe to fetch.
 *
 * - Must use HTTPS.
 * - Must not contain embedded credentials.
 * - Hostname must not be localhost or a *.localhost suffix.
 * - Hostnames that are literal IP addresses must not be loopback, link-local,
 *   or RFC1918 private ranges.
 *
 * This prevents SSRF when downloading media from URLs supplied by webhook providers.
 * Note: we avoid DNS resolution so this helper stays safe to import in both Node
 * and Edge/browser bundles.
 */
export function isAllowedMediaUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:') return false;
  if (parsed.username || parsed.password) return false;

  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === 'localhost.localdomain'
  ) {
    return false;
  }

  // Reject literal private/loopback IPs in the hostname.
  if (isPrivateIp(hostname)) {
    return false;
  }

  return true;
}
