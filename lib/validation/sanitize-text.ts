const UNSAFE_CONTROL_AND_BIDI_RE =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;

/**
 * Strips null bytes, control characters, and directional spoofing markers from
 * multi-line user text while preserving intentional line breaks.
 */
export function sanitizeUserText(input: unknown, maxLength: number): string {
  if (typeof input !== 'string') return '';
  const limit = Math.max(0, Math.floor(maxLength));
  const cleaned = input
    .replace(/\r\n?/g, '\n')
    .replace(UNSAFE_CONTROL_AND_BIDI_RE, '')
    .trim();
  return limit > 0 ? cleaned.slice(0, limit) : cleaned;
}

/**
 * Collapses whitespace to single spaces and removes control/bidi characters for
 * single-line titles, labels, and short comments.
 */
export function sanitizeSingleLineText(input: unknown, maxLength: number): string {
  return sanitizeUserText(input, maxLength).replace(/\s+/g, ' ').trim();
}
