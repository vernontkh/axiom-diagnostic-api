# The Portico

A four-axiom self-audit. It asks what you believe, then asks where that belief gives way, and reports the distance between the two answers.

Most self-assessment instruments read the first answer. This one reads the second. A stated principle costs nothing; the condition under which you would abandon it is the operating rule you actually run on.

---

## What it is not

The output is deliberately shaped to resist becoming an identity.

- It describes **one set of answers**, never a fixed type. The model is instructed to write "on these answers" rather than "you are the kind of person who".
- It names friction rather than strengths, because a list of strengths is a horoscope.
- The interface closes with an instruction to discard the result the moment it becomes a reason to stop examining something.

This is the point of difference from the instruments it resembles. A type label is useful as a conversation opener and harmful as an explanation for behaviour. The design tries to make the first use easy and the second use awkward.

It is not a clinical instrument, an assessment tool, or a hiring input, and the prompt forbids diagnostic language.

---

## Architecture

```
public/index.html      Static front end. No build step, no framework, no CDN runtime.
api/diagnose.js        The only route. POST /api/diagnose.
lib/contract.js        Axioms, enums, limits, and the model response schema.
lib/validate.js        Request validation. Returns every error at once.
lib/verify.js          Verifies the model's output before it reaches a reader.
lib/prompt.js          System instruction, kept out of the user turn.
lib/rate-limit.js      Per-instance sliding window.
schema/                Published JSON Schema contract (request, response, error).
test/                  Zero-dependency tests via node:test.
```

`lib/contract.js` is the single source of truth. The validator and the model schema both import from it, so the two cannot drift apart — the failure mode where an API accepts a value its engine rejects.

---

## Decisions worth explaining

**The prompt does not contain the response schema.** It is passed once via `responseSchema`. Duplicating a schema into the prompt when it is already in the config measurably lowers output quality.

**`propertyOrdering` is set explicitly.** Without it the model emits properties alphabetically, which puts `axiom_breakdown` before `composite_archetype` and asks the model to describe a conclusion it has not reached yet.

**The model's output is verified anyway.** Structured output is reliable, not guaranteed. `lib/verify.js` checks the rigidity value against its enum, requires all four axiom labels, and caps the blind-spot list. A malformed response returns 502 rather than rendering "undefined" to someone reading their own result.

**Free text is treated as data.** Fracture-point fields are stripped of control characters, rebuilt into a fresh payload that drops unrecognised keys, and fenced in the user turn. The system instruction tells the model that an embedded attempt to redirect it is itself a finding about how the person handles systems.

**Errors carry no internal detail.** Upstream failures are logged in full and returned as a stable code and a plain sentence. Model errors carry quota figures, key state and internal paths that a caller has no business reading.

**Validation reports everything at once.** Four columns, keyed by dotted path, so an incomplete audit is marked in one pass instead of teaching someone their mistakes one resubmission at a time.

**Rate limiting is honest about its limits.** The counter lives in instance memory, so a caller on a cold instance starts fresh. It raises the cost of casual abuse on an endpoint that spends real money per request; it does not stop a determined one. For an authoritative ceiling, move the counter in `lib/rate-limit.js` to Vercel KV or Upstash — the interface is unchanged.

**No Tailwind CDN.** The runtime CDN build prints a production warning and ships far more CSS than a five-token palette needs. The stylesheet is hand-written and inline, which is also why there is no build step.

---

## The interface

Four fluted columns, one per axiom. Conviction fills the shaft from the base, because conviction is weight placed on a support. Writing a fracture point cracks the hairline at the base of the column. Complete all four and the pediment rises above them carrying the archetype — a pediment only stands if every column is there.

Palette: weathered limestone, marble, basalt, oxidised bronze. Iron oxide appears nowhere except fracture and friction, so its presence always means one thing.

Type: Marcellus for inscription, Work Sans for reading, IBM Plex Mono for measurement.

Responsive to 320px, keyboard navigable with visible focus, and `prefers-reduced-motion` respected.

---

## Running it

```bash
npm install
cp .env.example .env      # add your Google AI Studio key
npm test
npx vercel dev
```

Deploy: push to a Git repository, import to Vercel, and set `GEMINI_API_KEY` under **Settings → Environment Variables**. No build configuration is needed.

`GEMINI_MODEL` overrides the default (`gemini-3.5-flash`) without a code change. Gemini model IDs retire on a published schedule — check the [model list](https://ai.google.dev/gemini-api/docs/models) if requests start returning 404.

---

## API

### `POST /api/diagnose`

`Content-Type: application/json`. All four axioms required.

```json
{
  "epistemology": {
    "stance": "B",
    "conviction": 75,
    "breaking_point": "If a replication attempt by a team with no stake in the result fails."
  },
  "ethics": { "stance": "A", "conviction": 90, "breaking_point": "…" },
  "ontology": { "stance": "C", "conviction": 55, "breaking_point": "…" },
  "governance": { "stance": "B", "conviction": 70, "breaking_point": "…" }
}
```

`stance` is `A`, `B` or `C`. `conviction` is a whole number from 0 to 100. `breaking_point` runs from 12 to 600 characters.

**200** returns `composite_archetype`, `axiom_breakdown`, `executive_summary`, `rigidity_index`, `blind_spots` and `stress_response_prediction`. See `schema/response.schema.json`.

**Errors** all share one shape:

```json
{ "error": { "code": "VALIDATION_FAILED", "message": "Some answers need attention.",
             "fields": { "ethics.conviction": "Conviction sits between 0 and 100." } } }
```

| Status | Code | Cause |
|---|---|---|
| 400 | `MALFORMED_JSON` | Body is not valid JSON |
| 400 | `VALIDATION_FAILED` | One or more answers rejected; see `fields` |
| 405 | `METHOD_NOT_ALLOWED` | Anything other than POST |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Content-Type is not `application/json` |
| 429 | `RATE_LIMITED` | Window allowance spent; see `Retry-After` |
| 500 | `NOT_CONFIGURED` | `GEMINI_API_KEY` is absent |
| 502 | `MODEL_UNAVAILABLE` | Upstream call failed |
| 502 | `MALFORMED_DIAGNOSIS` | Output was not parseable JSON |
| 502 | `INCOMPLETE_DIAGNOSIS` | Output failed verification |
| 504 | `MODEL_TIMEOUT` | Model exceeded 25s |

Same-origin by design — no CORS headers are sent. Add them explicitly if you intend the endpoint to be called from elsewhere.

Nothing is persisted. Answers exist for the duration of one request.
