import net from 'node:net';

export interface PublicUrlCheck {
  valid: boolean;
  normalizedUrl?: string;
  isLocalhost?: boolean;
  error?: string;
}

function isPrivateIpv4(host: string): boolean {
  const parts = host.split('.').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return false;
  }
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

export function validatePublicUrlForShortener(rawUrl: string): PublicUrlCheck {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { valid: false, error: 'Please provide a valid URL to shorten.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'URL must start with https:// or http://.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: 'Only http:// and https:// URLs can be shortened.' };
  }

  const host = parsed.hostname.toLowerCase();
  const bareHost = host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;

  if (
    bareHost === 'localhost' ||
    bareHost === '::1' ||
    bareHost.endsWith('.local') ||
    (net.isIPv4(bareHost) && isPrivateIpv4(bareHost))
  ) {
    return {
      valid: false,
      isLocalhost: true,
      error:
        'External link shorteners cannot shorten localhost URLs. Open TapShare via your public URL to generate an external short link.',
    };
  }

  return { valid: true, normalizedUrl: parsed.toString() };
}

export function parseIsGdResponse(bodyText: string): string | null {
  try {
    const data = JSON.parse(bodyText) as { shorturl?: string; errormessage?: string };
    if (typeof data.shorturl === 'string' && /^https?:\/\//i.test(data.shorturl)) {
      return data.shorturl.trim();
    }
    return null;
  } catch {
    return null;
  }
}

export function parseTinyUrlResponse(bodyText: string): string | null {
  const trimmed = bodyText.trim();
  if (/^https?:\/\/tinyurl\.com\/[A-Za-z0-9_-]+$/i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

export interface ShortenResult {
  shortUrl: string;
  provider: 'is.gd' | 'tinyurl' | 'v.gd';
}

export class ShortenerValidationError extends Error {
  statusCode: number;
  isLocalhost: boolean;

  constructor(message: string, statusCode = 400, isLocalhost = false) {
    super(message);
    this.statusCode = statusCode;
    this.isLocalhost = isLocalhost;
  }
}

export async function shortenExternalUrl(rawUrl: string): Promise<ShortenResult> {
  const check = validatePublicUrlForShortener(rawUrl);
  if (!check.valid || !check.normalizedUrl) {
    throw new ShortenerValidationError(
      check.error || 'Invalid URL.',
      400,
      Boolean(check.isLocalhost),
    );
  }

  const target = check.normalizedUrl;

  const providers: Array<{
    name: ShortenResult['provider'];
    request: () => Promise<string | null>;
  }> = [
    {
      name: 'is.gd',
      request: async () => {
        const res = await fetch(
          `https://is.gd/create.php?format=json&url=${encodeURIComponent(target)}`,
          { signal: AbortSignal.timeout(5000) },
        );
        if (!res.ok) return null;
        return parseIsGdResponse(await res.text());
      },
    },
    {
      name: 'tinyurl',
      request: async () => {
        const res = await fetch(
          `https://tinyurl.com/api-create.php?url=${encodeURIComponent(target)}`,
          { signal: AbortSignal.timeout(5000) },
        );
        if (!res.ok) return null;
        return parseTinyUrlResponse(await res.text());
      },
    },
    {
      name: 'v.gd',
      request: async () => {
        const res = await fetch(
          `https://v.gd/create.php?format=json&url=${encodeURIComponent(target)}`,
          { signal: AbortSignal.timeout(5000) },
        );
        if (!res.ok) return null;
        return parseIsGdResponse(await res.text());
      },
    },
  ];

  for (const provider of providers) {
    try {
      const shortUrl = await provider.request();
      if (shortUrl) {
        return { shortUrl, provider: provider.name };
      }
    } catch {
      // try next provider
    }
  }

  throw new Error('Link shortener providers are temporarily unavailable. Please try again.');
}
