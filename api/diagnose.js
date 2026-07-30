import { GoogleGenAI } from '@google/genai';
import { RESPONSE_SCHEMA } from '../lib/contract.js';
import { verifyDiagnosis } from '../lib/verify.js';
import { SYSTEM_INSTRUCTION, buildUserTurn } from '../lib/prompt.js';
import { validateRequest } from '../lib/validate.js';
import { checkRateLimit, clientKey } from '../lib/rate-limit.js';

const MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.5-flash';
const MODEL_TIMEOUT_MS = 25_000;

let client = null;

/** Created once per instance and reused across warm invocations. */
function getClient() {
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

/**
 * One error shape for every failure, so a caller writes one error handler
 * rather than four. `code` is stable and machine-readable; `message` is for
 * humans; `fields` appears only on validation failures.
 */
function fail(res, status, code, message, extra = {}) {
  return res.status(status).json({ error: { code, message, ...extra } });
}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('MODEL_TIMEOUT')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return fail(res, 405, 'METHOD_NOT_ALLOWED', 'This endpoint accepts POST only.');
  }

  // Vercel parses the body only when the media type says JSON. Checking here
  // turns a confusing crash further down into a clear 415.
  const contentType = req.headers['content-type'] ?? '';
  if (!contentType.includes('application/json')) {
    return fail(res, 415, 'UNSUPPORTED_MEDIA_TYPE', 'Set Content-Type to application/json.');
  }

  const { allowed, retryAfterSeconds } = checkRateLimit(clientKey(req));
  if (!allowed) {
    res.setHeader('Retry-After', String(retryAfterSeconds));
    return fail(res, 429, 'RATE_LIMITED', `Too many audits. Try again in ${retryAfterSeconds}s.`);
  }

  // Fail loudly on misconfiguration rather than letting the SDK fail obscurely.
  if (!process.env.GEMINI_API_KEY) {
    console.error('[diagnose] GEMINI_API_KEY is not set.');
    return fail(res, 500, 'NOT_CONFIGURED', 'The diagnostic engine is unavailable.');
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return fail(res, 400, 'MALFORMED_JSON', 'The request body is not valid JSON.');
    }
  }

  const validation = validateRequest(body);
  if (!validation.ok) {
    return fail(res, 400, 'VALIDATION_FAILED', 'Some answers need attention.', {
      fields: validation.fields,
    });
  }

  let raw;
  try {
    const response = await withTimeout(
      getClient().models.generateContent({
        model: MODEL,
        contents: buildUserTurn(validation.payload),
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.6,
        },
      }),
      MODEL_TIMEOUT_MS,
    );
    raw = response.text;
  } catch (error) {
    // Log the detail; return none of it. Upstream errors carry key state,
    // quota figures and internal paths that a caller has no business reading.
    console.error('[diagnose] model call failed:', error);
    const timedOut = error?.message === 'MODEL_TIMEOUT';
    return fail(
      res,
      timedOut ? 504 : 502,
      timedOut ? 'MODEL_TIMEOUT' : 'MODEL_UNAVAILABLE',
      timedOut
        ? 'The audit took too long. Try again.'
        : 'The diagnostic engine did not respond. Try again shortly.',
    );
  }

  let parsed;
  try {
    // Structured output arrives clean, but a stray code fence costs one line
    // to survive and an outage to debug.
    parsed = JSON.parse(String(raw).replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, ''));
  } catch (error) {
    console.error('[diagnose] unparseable model output:', error, String(raw).slice(0, 500));
    return fail(res, 502, 'MALFORMED_DIAGNOSIS', 'The audit returned an unreadable result. Try again.');
  }

  const diagnosis = verifyDiagnosis(parsed);
  if (!diagnosis) {
    console.error('[diagnose] diagnosis failed verification:', JSON.stringify(parsed).slice(0, 500));
    return fail(res, 502, 'INCOMPLETE_DIAGNOSIS', 'The audit returned an incomplete result. Try again.');
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json(diagnosis);
}
