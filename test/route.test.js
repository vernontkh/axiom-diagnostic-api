import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/diagnose.js';

function mockRes() {
  const res = { statusCode: null, body: null, headers: {} };
  res.setHeader = (k, v) => { res.headers[k] = v; };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  return res;
}
const req = (o = {}) => ({
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-forwarded-for': `1.2.3.${Math.random()}` },
  socket: {},
  ...o,
});

test('405 with Allow header on GET', async () => {
  const res = mockRes();
  await handler(req({ method: 'GET' }), res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.Allow, 'POST');
  assert.equal(res.body.error.code, 'METHOD_NOT_ALLOWED');
});

test('415 when content-type is not JSON', async () => {
  const res = mockRes();
  await handler(req({ headers: { 'content-type': 'text/plain' } }), res);
  assert.equal(res.statusCode, 415);
});

test('400 on malformed JSON string body', async () => {
  process.env.GEMINI_API_KEY = 'test-key';
  const res = mockRes();
  await handler({ ...req(), body: '{not json' }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error.code, 'MALFORMED_JSON');
});

test('400 with field paths on an empty payload', async () => {
  const res = mockRes();
  await handler({ ...req(), body: {} }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error.code, 'VALIDATION_FAILED');
  assert.deepEqual(Object.keys(res.body.error.fields).sort(),
    ['epistemology','ethics','governance','ontology']);
});

test('429 after the window allowance is spent', async () => {
  const headers = { 'content-type': 'application/json', 'x-forwarded-for': '9.9.9.9' };
  let res;
  for (let i = 0; i < 7; i++) {
    res = mockRes();
    await handler({ method: 'POST', headers, socket: {}, body: {} }, res);
  }
  assert.equal(res.statusCode, 429);
  assert.ok(res.headers['Retry-After']);
});

test('500 NOT_CONFIGURED when the key is absent', async () => {
  delete process.env.GEMINI_API_KEY;
  const res = mockRes();
  await handler({ ...req(), body: {} }, res);
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.error.code, 'NOT_CONFIGURED');
});
