import fs from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import { getDataDir } from '../services/storageService.ts';
import {
  MAX_FILES_PER_SHARE,
  MAX_FILE_SIZE_BYTES,
  validateSingleFile,
} from '../../src/shared/validation.ts';

export async function createUploadMiddleware() {
  const tempDir = path.join(getDataDir(), 'tmp');
  await fs.mkdir(tempDir, { recursive: true });

  return multer({
    dest: tempDir,
    limits: {
      fileSize: MAX_FILE_SIZE_BYTES,
      files: MAX_FILES_PER_SHARE,
    },
    fileFilter: (_req, file, cb) => {
      const check = validateSingleFile({
        name: file.originalname,
        size: 1,
        type: file.mimetype,
      });
      if (!check.valid) {
        cb(new Error(check.error || 'Unsupported file type.'));
        return;
      }
      cb(null, true);
    },
  });
}
