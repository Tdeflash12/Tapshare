import test from 'node:test';
import assert from 'node:assert/strict';
import { buildShareEmailContent, escapeHtml } from './emailService.ts';

test('escapeHtml neutralizes HTML special characters', () => {
  assert.equal(escapeHtml('<script>alert("x")</script>'), '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
});

test('buildShareEmailContent includes short URL, title, and escaped note', () => {
  const email = buildShareEmailContent({
    title: 'Design <Draft>',
    shareUrl: 'https://tapshare.com/48291',
    type: 'file',
    fileCount: 2,
    totalSize: 2048,
    expiresAt: 1_700_000_000_000,
    note: 'Check this out & confirm',
  });

  assert.equal(email.subject, 'TapShare: Design <Draft>');
  assert.match(email.text, /https:\/\/tapshare\.com\/48291/);
  assert.match(email.text, /Check this out & confirm/);
  assert.match(email.html, /Design &lt;Draft&gt;/);
  assert.match(email.html, /Check this out &amp; confirm/);
});
