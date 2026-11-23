import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateSingleFile,
  validateFileBundle,
  validateTextShare,
  sanitizeFilename,
  normalizeExpiryDays,
  calculateExpiresAt,
  isValidEmail,
  extractShareCode,
  MAX_FILE_SIZE_BYTES,
  MAX_BUNDLE_SIZE_BYTES,
} from './validation.ts';

test('sanitizeFilename strips path traversal and control characters', () => {
  assert.equal(sanitizeFilename('../../etc/passwd'), '.._.._etc_passwd'.replace(/\.\./g, '_'));
  assert.equal(sanitizeFilename('hello\x00world.txt'), 'helloworld.txt');
  assert.equal(sanitizeFilename('   '), 'untitled');
});

test('validateSingleFile accepts supported documents and images', () => {
  assert.equal(validateSingleFile({ name: 'report.pdf', size: 1024 }).valid, true);
  assert.equal(validateSingleFile({ name: 'notes.TXT', size: 512 }).valid, true);
  assert.equal(validateSingleFile({ name: 'photo.png', size: 2048 }).valid, true);
  assert.equal(validateSingleFile({ name: 'proposal.docx', size: 4096 }).valid, true);
  assert.equal(validateSingleFile({ name: 'bundle.zip', size: 8192 }).valid, true);
  assert.equal(validateSingleFile({ name: 'Main.java', size: 1024 }).valid, true);
  assert.equal(validateSingleFile({ name: 'schema.sql', size: 1024 }).valid, true);
});

test('validateSingleFile blocks dangerous executables and SVG/HTML', () => {
  const exe = validateSingleFile({ name: 'payload.exe', size: 100 });
  assert.equal(exe.valid, false);
  assert.match(exe.error ?? '', /security/i);

  const svg = validateSingleFile({ name: 'icon.svg', size: 100 });
  assert.equal(svg.valid, false);

  const html = validateSingleFile({ name: 'index.html', size: 100 });
  assert.equal(html.valid, false);

  const empty = validateSingleFile({ name: 'empty.txt', size: 0 });
  assert.equal(empty.valid, false);

  const huge = validateSingleFile({ name: 'huge.zip', size: MAX_FILE_SIZE_BYTES + 1 });
  assert.equal(huge.valid, false);
});

test('validateFileBundle enforces count and bundle size limits', () => {
  assert.equal(validateFileBundle([]).valid, false);

  const eleven = Array.from({ length: 11 }, (_, i) => ({
    name: `file${i}.txt`,
    size: 100,
  }));
  assert.equal(validateFileBundle(eleven).valid, false);

  const overBundle = [
    { name: 'a.zip', size: 45 * 1024 * 1024 },
    { name: 'b.zip', size: 45 * 1024 * 1024 },
    { name: 'c.zip', size: MAX_BUNDLE_SIZE_BYTES - 80 * 1024 * 1024 },
  ];
  assert.equal(validateFileBundle(overBundle).valid, false);
});

test('validateTextShare validates non-empty text and title length', () => {
  assert.equal(validateTextShare('   ').valid, false);
  assert.equal(validateTextShare('Hello QuickShare').valid, true);
  assert.equal(validateTextShare('Hello', 'x'.repeat(141)).valid, false);
});

test('normalizeExpiryDays defaults to 7 days for unsupported inputs', () => {
  assert.equal(normalizeExpiryDays(1), 1);
  assert.equal(normalizeExpiryDays(3), 3);
  assert.equal(normalizeExpiryDays(7), 7);
  assert.equal(normalizeExpiryDays(30), 30);
  assert.equal(normalizeExpiryDays('14'), 7);
  assert.equal(normalizeExpiryDays(999), 7);
  assert.equal(normalizeExpiryDays(undefined), 7);
});

test('calculateExpiresAt uses exact 24-hour durations for all supported options', () => {
  const createdAt = 1_700_000_000_000;
  const dayMs = 24 * 60 * 60 * 1000;
  assert.equal(calculateExpiresAt(createdAt, 1) - createdAt, dayMs);
  assert.equal(calculateExpiresAt(createdAt, 3) - createdAt, 3 * dayMs);
  assert.equal(calculateExpiresAt(createdAt, 7) - createdAt, 7 * dayMs);
  assert.equal(calculateExpiresAt(createdAt, 30) - createdAt, 30 * dayMs);
});

test('isValidEmail validates optional recipient addresses', () => {
  assert.equal(isValidEmail(''), true);
  assert.equal(isValidEmail('alex@example.com'), true);
  assert.equal(isValidEmail('not-an-email'), false);
});

test('extractShareCode extracts 5-digit codes from raw codes and URLs', () => {
  assert.equal(extractShareCode('81045'), '81045');
  assert.equal(extractShareCode(' #81045 '), '81045');
  assert.equal(
    extractShareCode('https://ais-dev-ivon7ybqh36d2trt4eycem-949340754016.asia-east1.run.app/87244'),
    '87244',
  );
  assert.equal(extractShareCode('http://localhost:3000/share/abc123'), 'abc123');
});
