import { AXIOMS, STANCES, LIMITS } from './contract.js';

/** Strips control characters that could smuggle structure into the prompt. */
function clean(text) {
  return String(text)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Validates the request body.
 *
 * Returns every problem at once rather than the first one, keyed by field path,
 * so the interface can mark all four columns in a single pass instead of making
 * the participant resubmit four times to discover four mistakes.
 *
 * Returns { ok: true, payload } or { ok: false, fields }.
 * The returned payload is rebuilt from scratch: unrecognised keys are dropped
 * rather than forwarded to the model.
 */
export function validateRequest(body) {
  const fields = {};

  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, fields: { _body: 'Send a JSON object containing all four axioms.' } };
  }

  const payload = {};

  for (const axiom of AXIOMS) {
    const entry = body[axiom];

    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
      fields[axiom] = 'Missing. Provide stance, conviction and breaking_point.';
      continue;
    }

    const clean_entry = {};

    // Stance — accept lower case, reject anything else.
    const stance = typeof entry.stance === 'string' ? entry.stance.trim().toUpperCase() : '';
    if (!STANCES.includes(stance)) {
      fields[`${axiom}.stance`] = `Choose one stance: ${STANCES.join(', ')}.`;
    } else {
      clean_entry.stance = stance;
    }

    // Conviction — accept a numeric string, require a whole number in range.
    const conviction = Number(entry.conviction);
    if (!Number.isFinite(conviction) || !Number.isInteger(conviction)) {
      fields[`${axiom}.conviction`] = 'Give conviction as a whole number.';
    } else if (conviction < LIMITS.CONVICTION_MIN || conviction > LIMITS.CONVICTION_MAX) {
      fields[`${axiom}.conviction`] =
        `Conviction sits between ${LIMITS.CONVICTION_MIN} and ${LIMITS.CONVICTION_MAX}.`;
    } else {
      clean_entry.conviction = conviction;
    }

    // Fracture point — the field the whole diagnostic rests on, so it is the
    // one field with a real length floor.
    const breaking_point = typeof entry.breaking_point === 'string' ? clean(entry.breaking_point) : '';
    if (breaking_point.length === 0) {
      fields[`${axiom}.breaking_point`] = 'Name the condition that would change your mind.';
    } else if (breaking_point.length < LIMITS.BREAKING_POINT_MIN) {
      fields[`${axiom}.breaking_point`] =
        `Too short to read. Use at least ${LIMITS.BREAKING_POINT_MIN} characters.`;
    } else if (breaking_point.length > LIMITS.BREAKING_POINT_MAX) {
      fields[`${axiom}.breaking_point`] =
        `Trim to ${LIMITS.BREAKING_POINT_MAX} characters or fewer.`;
    } else {
      clean_entry.breaking_point = breaking_point;
    }

    payload[axiom] = clean_entry;
  }

  if (Object.keys(fields).length > 0) return { ok: false, fields };
  return { ok: true, payload };
}
