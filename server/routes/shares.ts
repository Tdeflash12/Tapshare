import { Router } from 'express';
import fs from 'node:fs/promises';
import multer from 'multer';
import mammoth from 'mammoth';
import QRCode from 'qrcode';
import { apiLimiter, emailLimiter, uploadLimiter } from '../middleware/rateLimiter.ts';
import { createUploadMiddleware } from '../middleware/upload.ts';
import {
  EmailNotConfiguredError,
  sendShareEmail,
} from '../services/emailService.ts';
import {
  ShortenerValidationError,
  shortenExternalUrl,
} from '../services/shortenerService.ts';
import {
  createFileShareRecord,
  createTextShareRecord,
  deleteShareWithToken,
  getStoredFilePath,
  incrementShareDownload,
  incrementShareView,
  readShareRecord,
  setShareShortUrl,
  toPublicShare,
} from '../services/storageService.ts';
import { buildShareUrl } from '../../src/shared/formatters.ts';
import {
  MAX_BUNDLE_SIZE_BYTES,
  MAX_FILES_PER_SHARE,
  isValidEmail,
  normalizeExpiryDays,
  sanitizeFilename,
  validateFileBundle,
  validateTextShare,
} from '../../src/shared/validation.ts';

const SAFE_INLINE_MIMES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.csv': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.log': 'text/plain; charset=utf-8',
  '.xml': 'text/plain; charset=utf-8',
};

export async function createSharesRouter(): Promise<Router> {
  const router = Router();
  const upload = await createUploadMiddleware();

  // Create a text share
  router.post('/text', uploadLimiter, async (req, res) => {
    try {
      const { title, textContent, textFormat, expiryDays } = req.body ?? {};
      const check = validateTextShare(String(textContent ?? ''), title ? String(title) : undefined);
      if (!check.valid) {
        res.status(400).json({ error: check.error });
        return;
      }

      const format =
        textFormat === 'markdown' || textFormat === 'code' ? textFormat : 'plain';

      const result = await createTextShareRecord({
        title: typeof title === 'string' ? title : undefined,
        textContent: String(textContent),
        textFormat: format,
        expiryDays: normalizeExpiryDays(expiryDays),
      });

      res.status(201).json({
        share: result.share,
        deleteToken: result.deleteToken,
        sharePath: `/${result.share.id}`,
      });
    } catch (err) {
      console.error('Error creating text share:', err);
      res.status(500).json({ error: 'Failed to create text share.' });
    }
  });

  // Create a file bundle share
  router.post('/files', uploadLimiter, (req, res) => {
    upload.array('files', MAX_FILES_PER_SHARE)(req, res, async (uploadErr) => {
      const uploadedFiles = (req.files as Express.Multer.File[] | undefined) ?? [];

      const cleanupTemp = async () => {
        await Promise.all(uploadedFiles.map((f) => fs.unlink(f.path).catch(() => undefined)));
      };

      if (uploadErr) {
        await cleanupTemp();
        const message =
          uploadErr instanceof multer.MulterError
            ? uploadErr.code === 'LIMIT_FILE_SIZE'
              ? 'One of the files exceeds the 50 MB size limit.'
              : uploadErr.code === 'LIMIT_FILE_COUNT'
                ? `Maximum ${MAX_FILES_PER_SHARE} files allowed per share.`
                : uploadErr.message
            : uploadErr instanceof Error
              ? uploadErr.message
              : 'Upload failed.';
        res.status(400).json({ error: message });
        return;
      }

      try {
        const bundleCheck = validateFileBundle(
          uploadedFiles.map((f) => ({
            name: f.originalname,
            size: f.size,
            type: f.mimetype,
          })),
        );

        if (!bundleCheck.valid) {
          await cleanupTemp();
          res.status(400).json({ error: bundleCheck.error });
          return;
        }

        const totalBytes = uploadedFiles.reduce((acc, f) => acc + f.size, 0);
        if (totalBytes > MAX_BUNDLE_SIZE_BYTES) {
          await cleanupTemp();
          res.status(400).json({ error: 'Total upload size exceeds 100 MB.' });
          return;
        }

        const title = typeof req.body?.title === 'string' ? req.body.title : undefined;
        const expiryDays = normalizeExpiryDays(req.body?.expiryDays);

        const result = await createFileShareRecord({
          title,
          expiryDays,
          files: uploadedFiles.map((f) => ({
            originalName: f.originalname,
            mimeType: f.mimetype,
            size: f.size,
            tempPath: f.path,
          })),
        });

        res.status(201).json({
          share: result.share,
          deleteToken: result.deleteToken,
          sharePath: `/${result.share.id}`,
        });
      } catch (err) {
        await cleanupTemp();
        console.error('Error creating file share:', err);
        res.status(500).json({ error: 'Failed to store uploaded files.' });
      }
    });
  });

  // Get share details (increments viewCount unless ?peek=1)
  router.get('/:id', apiLimiter, async (req, res) => {
    try {
      const { id } = req.params;
      const peek = req.query.peek === '1';
      const record = peek ? await readShareRecord(id) : await incrementShareView(id);

      if (!record) {
        res.status(404).json({
          error: 'This share link has expired or does not exist.',
        });
        return;
      }

      res.json({ share: toPublicShare(record) });
    } catch {
      res.status(404).json({ error: 'Share not found.' });
    }
  });

  // Generate QR code SVG for a share link
  router.get('/:id/qr', apiLimiter, async (req, res) => {
    try {
      const { id } = req.params;
      const record = await readShareRecord(id);
      if (!record) {
        res.status(404).json({ error: 'Share not found or expired.' });
        return;
      }

      const origin =
        typeof req.query.origin === 'string' && req.query.origin.startsWith('http')
          ? req.query.origin
          : process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const url = buildShareUrl(origin, id);

      const svg = await QRCode.toString(url, {
        type: 'svg',
        margin: 1,
        width: 240,
        color: {
          dark: '#0F172A',
          light: '#FFFFFF',
        },
      });
      res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.send(svg);
    } catch (err) {
      console.error('QR generation failed:', err);
      res.status(500).json({ error: 'Failed to generate QR code.' });
    }
  });

  // Download shared text as a .txt file
  router.get('/:id/text-download', apiLimiter, async (req, res) => {
    try {
      const { id } = req.params;
      const record = await incrementShareDownload(id);
      if (!record || record.type !== 'text') {
        res.status(404).json({ error: 'Text share not found or expired.' });
        return;
      }

      const base = sanitizeFilename(record.title || 'tapshare-note').replace(/\.[^.]+$/, '');
      const filename = `${base || 'tapshare-note'}.txt`;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(record.textContent ?? '');
    } catch {
      res.status(404).json({ error: 'Share not found.' });
    }
  });

  // Preview text or DOCX content safely
  router.get('/:id/files/:fileId/preview', apiLimiter, async (req, res) => {
    try {
      const { id, fileId } = req.params;
      const record = await readShareRecord(id);
      if (!record) {
        res.status(404).json({ error: 'Share not found or expired.' });
        return;
      }

      const file = record.files.find((f) => f.id === fileId);
      if (!file) {
        res.status(404).json({ error: 'File not found in this share.' });
        return;
      }

      const filePath = getStoredFilePath(id, file.storedName);

      if (file.previewCategory === 'text') {
        const buffer = await fs.readFile(filePath);
        const maxPreviewBytes = 200 * 1024;
        const truncated = buffer.byteLength > maxPreviewBytes;
        const text = buffer.subarray(0, maxPreviewBytes).toString('utf8');
        res.json({ kind: 'text', text, truncated });
        return;
      }

      if (file.previewCategory === 'docx') {
        const extracted = await mammoth.extractRawText({ path: filePath });
        const rawText = extracted.value || '';
        const maxChars = 100_000;
        const truncated = rawText.length > maxChars;
        res.json({
          kind: 'docx',
          text: truncated ? rawText.slice(0, maxChars) : rawText,
          truncated,
        });
        return;
      }

      res.status(400).json({ error: 'Inline text preview is not available for this file type.' });
    } catch (err) {
      console.error('Preview error:', err);
      res.status(500).json({ error: 'Unable to generate file preview.' });
    }
  });

  // Serve raw image or PDF safely for inline preview
  router.get('/:id/files/:fileId/raw', apiLimiter, async (req, res) => {
    try {
      const { id, fileId } = req.params;
      const record = await readShareRecord(id);
      if (!record) {
        res.status(404).json({ error: 'Share not found or expired.' });
        return;
      }
      const file = record.files.find((f) => f.id === fileId);
      if (!file) {
        res.status(404).json({ error: 'File not found.' });
        return;
      }

      const safeMime = SAFE_INLINE_MIMES[file.extension];
      if (!safeMime || (file.previewCategory !== 'image' && file.previewCategory !== 'pdf')) {
        res.status(403).json({ error: 'Inline viewing is restricted to safe images and PDFs.' });
        return;
      }

      const filePath = getStoredFilePath(id, file.storedName);
      const safeHeaderName = sanitizeFilename(file.originalName).replace(/"/g, '');
      res.setHeader('Content-Type', safeMime);
      res.setHeader('Content-Disposition', `inline; filename="${safeHeaderName}"`);
      res.setHeader(
        'Content-Security-Policy',
        safeMime === 'application/pdf'
          ? "default-src 'self'; object-src 'self'; frame-ancestors 'self'"
          : "default-src 'none'; sandbox",
      );
      res.sendFile(filePath, (err) => {
        if (err && !res.headersSent) {
          res.status(404).json({ error: 'File not found or expired.' });
        }
      });
    } catch {
      res.status(404).json({ error: 'File not found.' });
    }
  });

  // Download file as attachment and increment counter
  router.get('/:id/files/:fileId/download', apiLimiter, async (req, res) => {
    try {
      const { id, fileId } = req.params;
      const record = await incrementShareDownload(id, fileId);
      if (!record) {
        res.status(404).json({ error: 'Share not found or expired.' });
        return;
      }
      const file = record.files.find((f) => f.id === fileId);
      if (!file) {
        res.status(404).json({ error: 'File not found.' });
        return;
      }

      const filePath = getStoredFilePath(id, file.storedName);
      res.download(filePath, file.originalName, (err) => {
        if (err && !res.headersSent) {
          res.status(404).json({ error: 'File download unavailable.' });
        }
      });
    } catch {
      res.status(404).json({ error: 'File download unavailable.' });
    }
  });

  // Send share link directly via server SMTP / Resend without user login
  router.post('/:id/email', emailLimiter, async (req, res) => {
    try {
      const { id } = req.params;
      const to = typeof req.body?.to === 'string' ? req.body.to.trim() : '';
      const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 500) : undefined;

      if (!to || !isValidEmail(to)) {
        res.status(400).json({ error: 'Please enter a valid recipient email address.' });
        return;
      }

      const record = await readShareRecord(id);
      if (!record) {
        res.status(404).json({ error: 'This share link has expired or does not exist.' });
        return;
      }

      const origin =
        typeof req.body?.origin === 'string' && req.body.origin.startsWith('http')
          ? req.body.origin
          : process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const shareUrl = buildShareUrl(origin, id);

      const delivery = await sendShareEmail({
        to,
        title: record.title,
        shareUrl,
        type: record.type,
        fileCount: record.files.length,
        totalSize: record.totalSize,
        expiresAt: record.expiresAt,
        note,
      });

      res.json({
        ok: true,
        to,
        messageId: delivery.messageId,
        provider: delivery.provider,
      });
    } catch (err) {
      if (err instanceof EmailNotConfiguredError) {
        res.status(err.statusCode).json({ error: err.message, notConfigured: true });
        return;
      }
      console.error('Direct email error:', err);
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Unable to deliver email right now.',
      });
    }
  });

  // Delete a share with its deletion token
  router.delete('/:id', apiLimiter, async (req, res) => {
    try {
      const { id } = req.params;
      const token =
        (typeof req.headers['x-delete-token'] === 'string' && req.headers['x-delete-token']) ||
        (typeof req.body?.deleteToken === 'string' && req.body.deleteToken) ||
        (typeof req.query.token === 'string' && req.query.token) ||
        '';

      if (!token) {
        res.status(400).json({ error: 'Deletion token is required.' });
        return;
      }

      const result = await deleteShareWithToken(id, token);
      if (!result.ok) {
        res.status(result.status).json({ error: result.error });
        return;
      }

      res.json({ ok: true, deletedId: id });
    } catch (err) {
      console.error('Delete error:', err);
      res.status(500).json({ error: 'Failed to delete share.' });
    }
  });

  // Shorten a share's public URL via external link shortener and cache it
  router.post('/:id/shorten', apiLimiter, async (req, res) => {
    try {
      const { id } = req.params;
      const record = await readShareRecord(id);
      if (!record) {
        res.status(404).json({ error: 'Share not found or expired.' });
        return;
      }

      const force = Boolean(req.body?.force);
      if (record.shortUrl && !force) {
        res.json({ shortUrl: record.shortUrl, cached: true });
        return;
      }

      const origin =
        typeof req.body?.origin === 'string' && req.body.origin.startsWith('http')
          ? req.body.origin
          : process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const targetUrl = buildShareUrl(origin, id);

      const { shortUrl, provider } = await shortenExternalUrl(targetUrl);
      await setShareShortUrl(id, shortUrl);

      res.json({ shortUrl, provider, cached: false });
    } catch (err) {
      if (err instanceof ShortenerValidationError) {
        res.status(err.statusCode).json({
          error: err.message,
          isLocalhost: err.isLocalhost,
        });
        return;
      }
      console.error('Shorten error:', err);
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Unable to shorten URL right now.',
      });
    }
  });

  return router;
}
