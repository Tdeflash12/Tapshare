import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { SharedFileItem, ShareRecordPublic, ShareType } from '../../src/shared/types.ts';
import { getPreviewCategory } from '../../src/shared/formatters.ts';
import {
  getFileExtension,
  normalizeExpiryDays,
  sanitizeFilename,
} from '../../src/shared/validation.ts';

export interface StoredFileEntry extends SharedFileItem {
  storedName: string;
}

export interface StoredShareRecord {
  id: string;
  type: ShareType;
  title: string;
  createdAt: number;
  expiresAt: number;
  downloadCount: number;
  viewCount: number;
  totalSize: number;
  deleteTokenHash: string;
  textContent?: string;
  textFormat?: 'plain' | 'markdown' | 'code';
  shortUrl?: string;
  files: StoredFileEntry[];
}

const DEFAULT_DATA_DIR = process.env.VERCEL
  ? path.join('/tmp', 'tapshare-data')
  : path.resolve(process.cwd(), 'data');

export function getDataDir(): string {
  return process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : DEFAULT_DATA_DIR;
}

function getSharesDir(): string {
  return path.join(getDataDir(), 'shares');
}

function getUploadsDir(): string {
  return path.join(getDataDir(), 'uploads');
}

export async function ensureStorageDirs(): Promise<void> {
  await fs.mkdir(getSharesDir(), { recursive: true });
  await fs.mkdir(getUploadsDir(), { recursive: true });
}

export function generateShareId(): string {
  return String(crypto.randomInt(10000, 100000));
}

async function generateUniqueShareId(): Promise<string> {
  await ensureStorageDirs();
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = generateShareId();
    try {
      await fs.access(shareMetaPath(candidate));
    } catch {
      return candidate;
    }
  }
  throw new Error('Unable to allocate a unique 5-digit share code. Please try again.');
}

export function generateDeleteToken(): string {
  return crypto.randomBytes(18).toString('base64url');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function shareMetaPath(id: string): string {
  if (!/^[A-Za-z0-9_-]{5,32}$/.test(id)) {
    throw new Error('Invalid share ID');
  }
  return path.join(getSharesDir(), `${id}.json`);
}

export function getStoredFilePath(shareId: string, storedName: string): string {
  if (!/^[A-Za-z0-9_-]{5,32}$/.test(shareId)) {
    throw new Error('Invalid share ID');
  }
  const safeStored = path.basename(storedName);
  return path.join(getUploadsDir(), shareId, safeStored);
}

export function toPublicShare(record: StoredShareRecord): ShareRecordPublic {
  return {
    id: record.id,
    type: record.type,
    title: record.title,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
    downloadCount: record.downloadCount,
    viewCount: record.viewCount,
    totalSize: record.totalSize,
    textContent: record.textContent,
    textFormat: record.textFormat,
    shortUrl: record.shortUrl,
    files: record.files.map((f) => ({
      id: f.id,
      originalName: f.originalName,
      size: f.size,
      mimeType: f.mimeType,
      extension: f.extension,
      previewCategory: f.previewCategory,
      downloadCount: f.downloadCount,
    })),
  };
}

async function writeShareAtomic(record: StoredShareRecord): Promise<void> {
  await ensureStorageDirs();
  const target = shareMetaPath(record.id);
  const tmp = `${target}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(record, null, 2), 'utf8');
  await fs.rename(tmp, target);
}

export async function createTextShareRecord(params: {
  title?: string;
  textContent: string;
  textFormat?: 'plain' | 'markdown' | 'code';
  expiryDays?: number;
}): Promise<{ share: ShareRecordPublic; deleteToken: string }> {
  const id = await generateUniqueShareId();
  const deleteToken = generateDeleteToken();
  const now = Date.now();
  const days = normalizeExpiryDays(params.expiryDays);
  const expiresAt = now + days * 24 * 60 * 60 * 1000;
  const byteSize = Buffer.byteLength(params.textContent, 'utf8');

  const record: StoredShareRecord = {
    id,
    type: 'text',
    title: params.title?.trim() || 'Shared Text Note',
    createdAt: now,
    expiresAt,
    downloadCount: 0,
    viewCount: 0,
    totalSize: byteSize,
    deleteTokenHash: hashToken(deleteToken),
    textContent: params.textContent,
    textFormat: params.textFormat || 'plain',
    files: [],
  };

  await writeShareAtomic(record);
  return { share: toPublicShare(record), deleteToken };
}

export interface UploadedTempFile {
  originalName: string;
  mimeType: string;
  size: number;
  tempPath: string;
}

export async function createFileShareRecord(params: {
  title?: string;
  expiryDays?: number;
  files: UploadedTempFile[];
}): Promise<{ share: ShareRecordPublic; deleteToken: string }> {
  await ensureStorageDirs();
  const id = await generateUniqueShareId();
  const deleteToken = generateDeleteToken();
  const now = Date.now();
  const days = normalizeExpiryDays(params.expiryDays);
  const expiresAt = now + days * 24 * 60 * 60 * 1000;

  const shareUploadDir = path.join(getUploadsDir(), id);
  await fs.mkdir(shareUploadDir, { recursive: true });

  const storedFiles: StoredFileEntry[] = [];
  let totalSize = 0;

  for (const file of params.files) {
    const fileId = crypto.randomBytes(6).toString('base64url');
    const cleanName = sanitizeFilename(file.originalName);
    const ext = getFileExtension(cleanName);
    const storedName = `${fileId}_${cleanName}`;
    const destPath = path.join(shareUploadDir, storedName);

    await fs.rename(file.tempPath, destPath).catch(async () => {
      await fs.copyFile(file.tempPath, destPath);
      await fs.unlink(file.tempPath).catch(() => undefined);
    });

    totalSize += file.size;
    storedFiles.push({
      id: fileId,
      originalName: cleanName,
      storedName,
      size: file.size,
      mimeType: file.mimeType || 'application/octet-stream',
      extension: ext,
      previewCategory: getPreviewCategory(ext, file.mimeType || ''),
      downloadCount: 0,
    });
  }

  const defaultTitle =
    storedFiles.length === 1
      ? storedFiles[0].originalName
      : `${storedFiles.length} Shared Files`;

  const record: StoredShareRecord = {
    id,
    type: 'file',
    title: params.title?.trim() || defaultTitle,
    createdAt: now,
    expiresAt,
    downloadCount: 0,
    viewCount: 0,
    totalSize,
    deleteTokenHash: hashToken(deleteToken),
    files: storedFiles,
  };

  await writeShareAtomic(record);
  return { share: toPublicShare(record), deleteToken };
}

export async function readShareRecord(id: string): Promise<StoredShareRecord | null> {
  try {
    const metaPath = shareMetaPath(id);
    const raw = await fs.readFile(metaPath, 'utf8');
    const parsed = JSON.parse(raw) as StoredShareRecord;
    if (Date.now() > parsed.expiresAt) {
      await purgeShareRecord(id);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function incrementShareView(id: string): Promise<StoredShareRecord | null> {
  const record = await readShareRecord(id);
  if (!record) return null;
  record.viewCount += 1;
  await writeShareAtomic(record);
  return record;
}

export async function incrementShareDownload(
  id: string,
  fileId?: string,
): Promise<StoredShareRecord | null> {
  const record = await readShareRecord(id);
  if (!record) return null;
  record.downloadCount += 1;
  if (fileId) {
    const file = record.files.find((f) => f.id === fileId);
    if (file) {
      file.downloadCount += 1;
    }
  }
  await writeShareAtomic(record);
  return record;
}

export async function setShareShortUrl(
  id: string,
  shortUrl: string,
): Promise<ShareRecordPublic | null> {
  const record = await readShareRecord(id);
  if (!record) return null;
  record.shortUrl = shortUrl;
  await writeShareAtomic(record);
  return toPublicShare(record);
}

export async function purgeShareRecord(id: string): Promise<void> {
  try {
    await fs.unlink(shareMetaPath(id));
  } catch {
    // ignore missing
  }
  try {
    await fs.rm(path.join(getUploadsDir(), id), { recursive: true, force: true });
  } catch {
    // ignore missing
  }
}

export async function deleteShareWithToken(
  id: string,
  token: string,
): Promise<{ ok: boolean; status: number; error?: string }> {
  const record = await readShareRecord(id);
  if (!record) {
    return { ok: false, status: 404, error: 'Share not found or already expired.' };
  }

  const providedHash = hashToken(token.trim());
  const a = Buffer.from(providedHash, 'hex');
  const b = Buffer.from(record.deleteTokenHash, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, status: 403, error: 'Invalid deletion token.' };
  }

  await purgeShareRecord(id);
  return { ok: true, status: 200 };
}

export async function cleanupExpiredShares(): Promise<number> {
  await ensureStorageDirs();
  const dir = getSharesDir();
  let removed = 0;
  try {
    const entries = await fs.readdir(dir);
    for (const entry of entries) {
      if (!entry.endsWith('.json')) continue;
      const id = entry.slice(0, -5);
      try {
        const raw = await fs.readFile(path.join(dir, entry), 'utf8');
        const parsed = JSON.parse(raw) as StoredShareRecord;
        if (Date.now() > parsed.expiresAt) {
          await purgeShareRecord(id);
          removed += 1;
        }
      } catch {
        // ignore partial/corrupted files
      }
    }
  } catch {
    // ignore
  }
  return removed;
}
