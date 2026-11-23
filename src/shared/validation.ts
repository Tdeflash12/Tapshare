export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB per file
export const MAX_BUNDLE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB total per share
export const MAX_FILES_PER_SHARE = 10;
export const MAX_TEXT_LENGTH = 500_000; // 500k characters (~500 KB - 1 MB)
export const DEFAULT_EXPIRY_DAYS = 7;
export const ALLOWED_EXPIRY_DAYS = [1, 3, 7, 30] as const;
export const EXPIRY_MS_PER_DAY = 24 * 60 * 60 * 1000;

export const ALLOWED_EXTENSIONS = new Set([
  '.txt',
  '.md',
  '.csv',
  '.json',
  '.log',
  '.xml',
  '.rtf',
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
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.zip',
]);

export const BLOCKED_EXTENSIONS = new Set([
  '.exe',
  '.bat',
  '.cmd',
  '.sh',
  '.bash',
  '.ps1',
  '.msi',
  '.dll',
  '.so',
  '.dylib',
  '.vbs',
  '.vbe',
  '.js',
  '.mjs',
  '.cjs',
  '.jsx',
  '.ts',
  '.tsx',
  '.php',
  '.py',
  '.rb',
  '.pl',
  '.jar',
  '.com',
  '.scr',
  '.pif',
  '.hta',
  '.apk',
  '.app',
  '.dmg',
  '.iso',
  '.svg', // block SVG uploads to prevent stored XSS on preview
  '.html',
  '.htm',
]);

export function getFileExtension(filename: string): string {
  const base = sanitizeFilename(filename);
  const lastDot = base.lastIndexOf('.');
  if (lastDot <= 0) return '';
  return base.slice(lastDot).toLowerCase();
}

export function sanitizeFilename(filename: string): string {
  const stripped = filename
    .replace(/[/\\]/g, '_')
    .replace(/\.\./g, '_')
    .replace(/[\x00-\x1f\x7f]/g, '')
    .trim();
  if (!stripped) return 'untitled';
  return stripped.slice(0, 180);
}

export interface FileValidationInput {
  name: string;
  size: number;
  type?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateSingleFile(file: FileValidationInput): ValidationResult {
  const cleanName = sanitizeFilename(file.name);
  const ext = getFileExtension(cleanName);

  if (!ext) {
    return {
      valid: false,
      error: `"${cleanName}" must have a supported file extension (e.g., .txt, .pdf, .docx, .png, .zip).`,
    };
  }

  if (BLOCKED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `File type "${ext}" is blocked for security reasons.`,
    };
  }

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `Unsupported file type "${ext}". Supported types: TXT, PDF, DOCX, PNG, JPG, JPEG, GIF, WEBP, ZIP, CSV, JSON, MD, XLSX, PPTX.`,
    };
  }

  if (file.size <= 0) {
    return {
      valid: false,
      error: `"${cleanName}" is empty (0 bytes).`,
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `"${cleanName}" exceeds the 50 MB per-file limit.`,
    };
  }

  return { valid: true };
}

export function validateFileBundle(files: FileValidationInput[]): ValidationResult {
  if (!files || files.length === 0) {
    return { valid: false, error: 'Please select at least one file to share.' };
  }

  if (files.length > MAX_FILES_PER_SHARE) {
    return {
      valid: false,
      error: `You can upload up to ${MAX_FILES_PER_SHARE} files per share.`,
    };
  }

  let totalBytes = 0;
  for (const file of files) {
    const check = validateSingleFile(file);
    if (!check.valid) return check;
    totalBytes += file.size;
  }

  if (totalBytes > MAX_BUNDLE_SIZE_BYTES) {
    return {
      valid: false,
      error: 'Total upload size exceeds the 100 MB bundle limit.',
    };
  }

  return { valid: true };
}

export function validateTextShare(text: string, title?: string): ValidationResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { valid: false, error: 'Please enter or paste some text to share.' };
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return {
      valid: false,
      error: `Text exceeds the maximum limit of ${MAX_TEXT_LENGTH.toLocaleString()} characters.`,
    };
  }
  if (title && title.length > 140) {
    return {
      valid: false,
      error: 'Title must be 140 characters or fewer.',
    };
  }
  return { valid: true };
}

export function normalizeExpiryDays(days: unknown): number {
  const num = Number(days);
  if ((ALLOWED_EXPIRY_DAYS as readonly number[]).includes(num)) {
    return num;
  }
  return DEFAULT_EXPIRY_DAYS;
}

export function calculateExpiresAt(createdAt: number, expiryDays: unknown): number {
  const days = normalizeExpiryDays(expiryDays);
  return createdAt + days * EXPIRY_MS_PER_DAY;
}

export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed) return true; // optional when opening compose
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export function extractShareCode(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      const parts = parsed.pathname.split('/').filter(Boolean);
      const last = parts[parts.length - 1] || '';
      return last.replace(/[^A-Za-z0-9_-]/g, '');
    } catch {
      // fall through
    }
  }

  return trimmed.replace(/^#/, '').replace(/[^A-Za-z0-9_-]/g, '');
}

