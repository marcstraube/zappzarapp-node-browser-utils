/**
 * Request URL validation and security utilities.
 * Internal module for URL validation, SSRF protection, and input validation.
 */

import { RequestError } from './RequestInterceptor.js';

/**
 * Check if a hostname is an IPv4 address in a private range.
 */
function isPrivateIPv4(hostname: string): boolean {
  // Match IPv4 address pattern
  const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = ipv4Pattern.exec(hostname);
  if (!match) return false;

  // Extract octets - match groups are guaranteed to exist due to regex
  const octet1 = match[1];
  const octet2 = match[2];
  const octet3 = match[3];
  const octet4 = match[4];

  // Type guard: verify all groups exist
  if (
    octet1 === undefined ||
    octet2 === undefined ||
    octet3 === undefined ||
    octet4 === undefined
  ) {
    return false;
  }

  const octets = [
    parseInt(octet1, 10),
    parseInt(octet2, 10),
    parseInt(octet3, 10),
    parseInt(octet4, 10),
  ];

  // Validate octets are in range 0-255
  if (octets.some((octet) => octet > 255)) {
    return false;
  }

  const first = octets[0];
  const second = octets[1];

  // Type guard: verify octets exist
  if (first === undefined || second === undefined) {
    return false;
  }

  // 127.0.0.0/8 - Loopback
  if (first === 127) return true;

  // 0.0.0.0/8 - Unspecified
  if (first === 0) return true;

  // 10.0.0.0/8 - Private
  if (first === 10) return true;

  // 172.16.0.0/12 - Private (172.16.0.0 - 172.31.255.255)
  if (first === 172 && second >= 16 && second <= 31) return true;

  // 192.168.0.0/16 - Private
  if (first === 192 && second === 168) return true;

  // 169.254.0.0/16 - Link-local
  return first === 169 && second === 254;
}

/**
 * Check if a hostname is an IPv6 address in a private range.
 */
function isPrivateIPv6(hostname: string): boolean {
  // Remove brackets if present (e.g., [::1])
  const cleaned = hostname.replace(/^\[|]$/g, '');

  // Normalize IPv6 address for easier checking
  const lower = cleaned.toLowerCase();

  // ::1 - Loopback
  if (
    lower === '::1' ||
    lower === '0:0:0:0:0:0:0:1' ||
    lower === '0000:0000:0000:0000:0000:0000:0000:0001'
  ) {
    return true;
  }

  // :: - Unspecified
  if (
    lower === '::' ||
    lower === '0:0:0:0:0:0:0:0' ||
    lower === '0000:0000:0000:0000:0000:0000:0000:0000'
  ) {
    return true;
  }

  // fc00::/7 - Unique local addresses (private)
  // Starts with fc or fd
  if (lower.startsWith('fc') || lower.startsWith('fd')) {
    return true;
  }

  // fe80::/10 - Link-local
  // Starts with fe8, fe9, fea, or feb
  return (
    lower.startsWith('fe8') ||
    lower.startsWith('fe9') ||
    lower.startsWith('fea') ||
    lower.startsWith('feb')
  );
}

/**
 * Check if a hostname is a private IP address.
 */
function isPrivateIP(hostname: string): boolean {
  return isPrivateIPv4(hostname) || isPrivateIPv6(hostname);
}

/**
 * Validate URL against allowed protocols and blocked patterns.
 */
export function validateUrl(
  url: string,
  allowedProtocols: readonly string[],
  blockedPatterns: readonly RegExp[],
  blockPrivateIPs: boolean
): void {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw RequestError.invalidUrl(url, 'malformed URL');
  }

  // Check protocol
  if (!allowedProtocols.includes(parsed.protocol)) {
    throw RequestError.invalidUrl(url, `protocol "${parsed.protocol}" is not allowed`);
  }

  // Check blocked patterns
  for (const pattern of blockedPatterns) {
    if (pattern.test(url)) {
      throw RequestError.invalidUrl(url, 'URL matches blocked pattern');
    }
  }

  // Block javascript: and data: URLs (defense in depth)
  if (parsed.protocol === 'javascript:' || parsed.protocol === 'data:') {
    throw RequestError.invalidUrl(url, 'dangerous protocol');
  }

  // SSRF protection: block private IPs if enabled
  if (blockPrivateIPs) {
    const hostname = parsed.hostname;
    if (isPrivateIP(hostname)) {
      throw RequestError.ssrfBlocked(hostname);
    }
  }
}

/**
 * Validate credential origin safety.
 */
export function validateCredentialOrigin(
  url: string,
  baseUrl: string,
  hasAuth: boolean,
  validateOrigin: boolean
): void {
  if (!validateOrigin || !hasAuth || !baseUrl) return;

  const requestUrl = new URL(url);
  const baseUrlParsed = new URL(baseUrl);

  if (requestUrl.origin !== baseUrlParsed.origin) {
    throw RequestError.credentialLeak(
      `Attempted to send credentials to different origin: ${requestUrl.origin} (base: ${baseUrlParsed.origin})`
    );
  }
}

/**
 * Combine multiple AbortSignals into one.
 * When either signal fires, the combined signal aborts and
 * the listener on the other signal is removed to prevent leaks.
 */
export function combineAbortSignals(signal1: AbortSignal, signal2: AbortSignal): AbortSignal {
  const controller = new AbortController();

  if (signal1.aborted || signal2.aborted) {
    controller.abort();
    return controller.signal;
  }

  const onAbort1 = (): void => {
    controller.abort();
    signal2.removeEventListener('abort', onAbort2);
  };

  const onAbort2 = (): void => {
    controller.abort();
    signal1.removeEventListener('abort', onAbort1);
  };

  signal1.addEventListener('abort', onAbort1, { once: true });
  signal2.addEventListener('abort', onAbort2, { once: true });

  return controller.signal;
}
