import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseIsGdResponse,
  parseTinyUrlResponse,
  validatePublicUrlForShortener,
} from './shortenerService';

test('validatePublicUrlForShortener accepts public https TapShare URLs', () => {
  const res = validatePublicUrlForShortener(
    'https://ais-dev-ivon7ybqh36d2trt4eycem-949340754016.asia-east1.run.app/48116',
  );
  assert.equal(res.valid, true);
  assert.equal(
    res.normalizedUrl,
    'https://ais-dev-ivon7ybqh36d2trt4eycem-949340754016.asia-east1.run.app/48116',
  );
});

test('validatePublicUrlForShortener rejects localhost and private IPv4 URLs', () => {
  const local = validatePublicUrlForShortener('http://localhost:3000/12345');
  assert.equal(local.valid, false);
  assert.equal(local.isLocalhost, true);

  const priv = validatePublicUrlForShortener('http://192.168.1.50/12345');
  assert.equal(priv.valid, false);
  assert.equal(priv.isLocalhost, true);

  const jsScheme = validatePublicUrlForShortener('javascript:alert(1)');
  assert.equal(jsScheme.valid, false);
});

test('parseIsGdResponse extracts valid shorturl JSON field', () => {
  assert.equal(parseIsGdResponse('{"shorturl":"https://is.gd/ygmKTG"}'), 'https://is.gd/ygmKTG');
  assert.equal(parseIsGdResponse('{"errormessage":"Invalid URL"}'), null);
  assert.equal(parseIsGdResponse('not json'), null);
});

test('parseTinyUrlResponse validates tinyurl text response', () => {
  assert.equal(parseTinyUrlResponse('https://tinyurl.com/2634hs2a\n'), 'https://tinyurl.com/2634hs2a');
  assert.equal(parseTinyUrlResponse('Error'), null);
});
