export interface SharePayload {
  readonly title: string;
  readonly text: string;
  readonly url: string;
}

export interface SharePlatformLink {
  readonly id: 'whatsapp' | 'x' | 'telegram';
  readonly label: string;
  readonly href: string;
}

/**
 * Resolves a relative route path or URL string to an absolute URL safe for
 * external share intents, falling back to `currentHref` when empty.
 */
export function resolveShareUrl(
  pathOrUrl: string | undefined,
  currentHref: string,
  origin: string,
): string {
  const trimmed = pathOrUrl?.trim() ?? '';
  if (!trimmed) return currentHref;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${origin.replace(/\/$/, '')}${normalizedPath}`;
}

export function buildSharePlatformLinks(payload: SharePayload): readonly SharePlatformLink[] {
  const summary = payload.text ? `${payload.title} — ${payload.text}` : payload.title;
  const whatsappText = `${summary} ${payload.url}`.trim();
  return [
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      href: `https://wa.me/?text=${encodeURIComponent(whatsappText)}`,
    },
    {
      id: 'x',
      label: 'X / Twitter',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(summary)}&url=${encodeURIComponent(payload.url)}`,
    },
    {
      id: 'telegram',
      label: 'Telegram',
      href: `https://t.me/share/url?url=${encodeURIComponent(payload.url)}&text=${encodeURIComponent(summary)}`,
    },
  ];
}
