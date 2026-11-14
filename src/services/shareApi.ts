import type {
  CreateShareResponse,
  SessionShareEntry,
  ShareRecordPublic,
} from '../shared/types.ts';

const SESSION_KEY = 'tapshare_recent_shares_v1';

export function getSessionShares(): SessionShareEntry[] {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SessionShareEntry[];
    const now = Date.now();
    return Array.isArray(parsed)
      ? parsed.filter((item) => item && typeof item.id === 'string' && item.expiresAt > now)
      : [];
  } catch {
    return [];
  }
}

export function saveSessionShare(entry: SessionShareEntry): SessionShareEntry[] {
  const existing = getSessionShares().filter((item) => item.id !== entry.id);
  const updated = [entry, ...existing].slice(0, 20);
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage quota errors
  }
  return updated;
}

export function removeSessionShare(id: string): SessionShareEntry[] {
  const updated = getSessionShares().filter((item) => item.id !== id);
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
  return updated;
}

export function getDeleteTokenForShare(id: string): string | undefined {
  return getSessionShares().find((item) => item.id === id)?.deleteToken;
}

export async function createTextShare(payload: {
  title?: string;
  textContent: string;
  textFormat: 'plain' | 'markdown' | 'code';
  expiryDays: number;
}): Promise<CreateShareResponse> {
  const res = await fetch('/api/shares/text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = (await res.json().catch(() => ({}))) as CreateShareResponse & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || 'Failed to create text share.');
  }
  return data;
}

export function uploadFileShare(
  params: {
    files: File[];
    title?: string;
    expiryDays: number;
  },
  onProgress: (percent: number) => void,
  signal?: AbortSignal,
): Promise<CreateShareResponse> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Upload cancelled.', 'AbortError'));
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/shares/files');

    const handleAbortSignal = () => {
      xhr.abort();
    };
    signal?.addEventListener('abort', handleAbortSignal, { once: true });

    const cleanup = () => {
      signal?.removeEventListener('abort', handleAbortSignal);
    };

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        const pct = Math.min(99, Math.round((event.loaded / event.total) * 100));
        onProgress(pct);
      }
    };

    xhr.onload = () => {
      cleanup();
      try {
        const data = JSON.parse(xhr.responseText || '{}') as CreateShareResponse & {
          error?: string;
        };
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress(100);
          resolve(data);
        } else {
          reject(new Error(data.error || 'Upload failed.'));
        }
      } catch {
        reject(new Error('Unexpected server response during upload.'));
      }
    };

    xhr.onerror = () => {
      cleanup();
      reject(new Error('Network error occurred while uploading files.'));
    };

    xhr.onabort = () => {
      cleanup();
      reject(new DOMException('Upload cancelled.', 'AbortError'));
    };

    const formData = new FormData();
    if (params.title?.trim()) {
      formData.append('title', params.title.trim());
    }
    formData.append('expiryDays', String(params.expiryDays));
    for (const file of params.files) {
      formData.append('files', file);
    }

    xhr.send(formData);
  });
}

export async function fetchShare(id: string, peek = false): Promise<ShareRecordPublic> {
  const url = `/api/shares/${encodeURIComponent(id)}${peek ? '?peek=1' : ''}`;
  const res = await fetch(url);
  const data = (await res.json().catch(() => ({}))) as {
    share?: ShareRecordPublic;
    error?: string;
  };
  if (!res.ok || !data.share) {
    throw new Error(data.error || 'This share link has expired or does not exist.');
  }
  return data.share;
}

export async function fetchFilePreview(
  shareId: string,
  fileId: string,
): Promise<{ kind: 'text' | 'docx'; text: string; truncated: boolean }> {
  const res = await fetch(
    `/api/shares/${encodeURIComponent(shareId)}/files/${encodeURIComponent(fileId)}/preview`,
  );
  const data = (await res.json().catch(() => ({}))) as {
    kind?: 'text' | 'docx';
    text?: string;
    truncated?: boolean;
    error?: string;
  };
  if (!res.ok || typeof data.text !== 'string') {
    throw new Error(data.error || 'Preview unavailable.');
  }
  return {
    kind: data.kind || 'text',
    text: data.text,
    truncated: Boolean(data.truncated),
  };
}

export async function deleteShareById(id: string, deleteToken: string): Promise<void> {
  const res = await fetch(`/api/shares/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'x-delete-token': deleteToken,
    },
    body: JSON.stringify({ deleteToken }),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(data.error || 'Failed to delete share.');
  }
}

export async function fetchEmailStatus(): Promise<{
  configured: boolean;
  provider: 'smtp' | 'resend' | null;
}> {
  const res = await fetch('/api/email/status');
  if (!res.ok) {
    return { configured: false, provider: null };
  }
  return (await res.json()) as { configured: boolean; provider: 'smtp' | 'resend' | null };
}

export async function sendShareEmailDirect(params: {
  id: string;
  to: string;
  note?: string;
  origin: string;
}): Promise<{ ok: true; to: string; messageId: string }> {
  const res = await fetch(`/api/shares/${encodeURIComponent(params.id)}/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: params.to,
      note: params.note,
      origin: params.origin,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    to?: string;
    messageId?: string;
    error?: string;
  };
  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'Failed to send email.');
  }
  return {
    ok: true,
    to: data.to || params.to,
    messageId: data.messageId || 'sent',
  };
}

export function isLocalOrigin(origin: string): boolean {
  try {
    const parsed = new URL(origin);
    const host = parsed.hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
  } catch {
    return false;
  }
}

export async function shortenShareLink(params: {
  id: string;
  origin: string;
  force?: boolean;
}): Promise<{ shortUrl: string; provider?: string; cached?: boolean }> {
  const res = await fetch(`/api/shares/${encodeURIComponent(params.id)}/shorten`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      origin: params.origin,
      force: Boolean(params.force),
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    shortUrl?: string;
    provider?: string;
    cached?: boolean;
    error?: string;
  };
  if (!res.ok || !data.shortUrl) {
    throw new Error(data.error || 'Unable to shorten this link right now.');
  }
  return {
    shortUrl: data.shortUrl,
    provider: data.provider,
    cached: data.cached,
  };
}


