import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STUDENT_QUOTES,
  getDailyStudentQuote,
  getDailyStudentQuoteIndex,
  getNextQuoteIndex,
} from './dailyQuotes.ts';

test('getDailyStudentQuoteIndex returns stable index within bounds for a given date', () => {
  const d1 = new Date('2026-11-14T10:00:00Z');
  const d2 = new Date('2026-11-14T22:00:00Z');
  const idx1 = getDailyStudentQuoteIndex(d1);
  const idx2 = getDailyStudentQuoteIndex(d2);

  assert.equal(idx1, idx2);
  assert.ok(idx1 >= 0 && idx1 < STUDENT_QUOTES.length);

  const quote = getDailyStudentQuote(d1);
  assert.ok(quote.text.length > 10);
  assert.ok(quote.author.length > 2);
});

test('getNextQuoteIndex wraps cleanly around STUDENT_QUOTES', () => {
  assert.equal(getNextQuoteIndex(0), 1);
  assert.equal(getNextQuoteIndex(STUDENT_QUOTES.length - 1), 0);
});
