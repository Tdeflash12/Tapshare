import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatBytes,
  formatCountdown,
  buildShareUrl,
  buildGmailComposeUrl,
  buildWhatsAppShareUrl,
  getPreviewCategory,
} from './formatters.ts';

test('formatBytes formats byte sizes cleanly', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(1536), '1.5 KB');
  assert.equal(formatBytes(10 * 1024 * 1024), '10.0 MB');
});

test('formatCountdown calculates remaining time and expiration', () => {
  const now = 1_700_000_000_000;
  const sevenDays = now + 7 * 86400 * 1000 + 2 * 3600 * 1000;
  assert.deepEqual(formatCountdown(sevenDays, now), {
    label: '7d 2h left',
    expired: false,
    remainingMs: sevenDays - now,
  });

  assert.equal(formatCountdown(now - 1000, now).expired, true);
  assert.equal(formatCountdown(now - 1000, now).label, 'Expired');
});

test('buildShareUrl constructs short 5-digit share route', () => {
  assert.equal(
    buildShareUrl('https://tapshare.com/', '48291'),
    'https://tapshare.com/48291',
  );
});

test('buildGmailComposeUrl populates TapShare subject, recipient, and short share URL in body', () => {
  const url = buildGmailComposeUrl({
    to: 'colleague@example.com',
    title: 'Quarterly Report',
    shareUrl: 'https://tapshare.com/48291',
    type: 'file',
    fileCount: 2,
  });
  const parsed = new URL(url);
  assert.equal(parsed.origin, 'https://mail.google.com');
  assert.equal(parsed.searchParams.get('view'), 'cm');
  assert.equal(parsed.searchParams.get('to'), 'colleague@example.com');
  assert.match(parsed.searchParams.get('su') ?? '', /TapShare: Quarterly Report/);
  assert.match(parsed.searchParams.get('body') ?? '', /https:\/\/tapshare\.com\/48291/);
});

test('buildWhatsAppShareUrl encodes short share URL with TapShare label', () => {
  const url = buildWhatsAppShareUrl({
    title: 'Design Spec',
    shareUrl: 'https://tapshare.com/48291',
  });
  assert.match(url, /^https:\/\/wa\.me\/\?text=/);
  assert.match(decodeURIComponent(url), /TapShare: https:\/\/tapshare\.com\/48291/);
});

test('getPreviewCategory classifies common extensions accurately', () => {
  assert.equal(getPreviewCategory('.png', 'image/png'), 'image');
  assert.equal(getPreviewCategory('.pdf', 'application/pdf'), 'pdf');
  assert.equal(getPreviewCategory('.docx', 'application/octet-stream'), 'docx');
  assert.equal(getPreviewCategory('.txt', 'text/plain'), 'text');
  assert.equal(getPreviewCategory('.cpp', 'text/plain'), 'text');
  assert.equal(getPreviewCategory('.yaml', 'text/plain'), 'text');
  assert.equal(getPreviewCategory('.zip', 'application/zip'), 'archive');
});
