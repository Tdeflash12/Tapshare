import type { SharedFileItem, ShareType } from './types.ts';

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let idx = 0;
  let value = bytes;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  const formatted = idx === 0 ? String(Math.round(value)) : value.toFixed(value >= 100 ? 0 : 1);
  return `${formatted} ${units[idx]}`;
}

export function formatCountdown(
  expiresAt: number,
  now: number = Date.now(),
): { label: string; expired: boolean; remainingMs: number } {
  const remainingMs = expiresAt - now;
  if (remainingMs <= 0) {
    return { label: 'Expired', expired: true, remainingMs: 0 };
  }

  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days >= 1) {
    return {
      label: `${days}d ${hours}h left`,
      expired: false,
      remainingMs,
    };
  }

  if (hours >= 1) {
    return {
      label: `${hours}h ${minutes}m left`,
      expired: false,
      remainingMs,
    };
  }

  if (minutes >= 1) {
    return {
      label: `${minutes}m ${seconds}s left`,
      expired: false,
      remainingMs,
    };
  }

  return {
    label: `${seconds}s left`,
    expired: false,
    remainingMs,
  };
}

export function buildShareUrl(origin: string, id: string): string {
  const cleanOrigin = origin.replace(/\/+$/, '');
  return `${cleanOrigin}/${encodeURIComponent(id)}`;
}

export function buildGmailComposeUrl(params: {
  to?: string;
  title?: string;
  shareUrl: string;
  type: ShareType;
  fileCount?: number;
}): string {
  const { to = '', title, shareUrl, type, fileCount = 1 } = params;
  const cleanTitle = title?.trim();
  const itemLabel =
    type === 'text'
      ? cleanTitle
        ? `Text note: "${cleanTitle}"`
        : 'Shared text document'
      : cleanTitle
        ? cleanTitle
        : fileCount > 1
          ? `${fileCount} shared files`
          : 'Shared file';

  const subject = `TapShare: ${itemLabel}`;
  const body = [
    `Hello,`,
    ``,
    `I've shared ${itemLabel} with you via TapShare.`,
    ``,
    `Open or download here (no sign-up required):`,
    shareUrl,
    ``,
    `Note: Anyone with this link can access the shared item until it expires.`,
  ].join('\n');

  const query = new URLSearchParams({
    view: 'cm',
    fs: '1',
    su: subject,
    body,
  });

  if (to.trim()) {
    query.set('to', to.trim());
  }

  return `https://mail.google.com/mail/?${query.toString()}`;
}

export function buildWhatsAppShareUrl(params: { title?: string; shareUrl: string }): string {
  const label = params.title?.trim() ? `"${params.title.trim()}"` : 'a file';
  const text = `Here is ${label} on TapShare: ${params.shareUrl}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function getPreviewCategory(
  extension: string,
  mimeType: string,
): SharedFileItem['previewCategory'] {
  const ext = extension.toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext) || mimeType.startsWith('image/')) {
    return 'image';
  }
  if (ext === '.pdf' || mimeType === 'application/pdf') {
    return 'pdf';
  }
  if (ext === '.docx') {
    return 'docx';
  }
  if (
    [
      '.txt',
      '.md',
      '.csv',
      '.json',
      '.log',
      '.xml',
      '.yaml',
      '.yml',
      '.toml',
      '.ini',
      '.sql',
      '.css',
      '.scss',
      '.c',
      '.cpp',
      '.h',
      '.hpp',
      '.java',
      '.cs',
      '.go',
      '.rs',
      '.swift',
      '.kt',
    ].includes(ext)
  ) {
    return 'text';
  }
  if (ext === '.zip') {
    return 'archive';
  }
  return 'other';
}
