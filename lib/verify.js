import { AXIOMS, RIGIDITY_LEVELS } from './contract.js';

const text = (value) =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

/** A finding is only useful with both halves present. */
function finding(item, extraKey = null) {
  if (item === null || typeof item !== 'object' || Array.isArray(item)) return null;
  const title = text(item.title);
  const detail = text(item.detail);
  if (!title || !detail) return null;

  const clean = { title, detail };
  if (extraKey) {
    const extra = text(item[extraKey]);
    if (!extra) return null;
    clean[extraKey] = extra;
  }
  return clean;
}

function findingList(value, { min, max, extraKey = null }) {
  if (!Array.isArray(value)) return null;
  const clean = value.map((item) => finding(item, extraKey)).filter(Boolean);
  if (clean.length < min) return null;
  return clean.slice(0, max);
}

/**
 * Verifies a diagnosis returned by the model.
 *
 * Trusting the output because a schema was requested is one assumption too many.
 * Structured output holds in the overwhelming majority of cases; this catches
 * the remainder before a malformed shape reaches the interface and renders as
 * "undefined" in front of whoever is reading their own result.
 *
 * Returns a clean diagnosis, or null if the shape cannot be trusted.
 */
export function verifyDiagnosis(data) {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return null;

  const archetype = text(data.composite_archetype);
  const summary = text(data.executive_summary);
  const stress = text(data.stress_response_prediction);
  const rigidity = RIGIDITY_LEVELS.includes(data.rigidity_index) ? data.rigidity_index : null;

  if (!archetype || !summary || !stress || !rigidity) return null;

  const breakdown = {};
  for (const axiom of AXIOMS) {
    const label = text(data.axiom_breakdown?.[`${axiom}_label`]);
    if (!label) return null;
    breakdown[`${axiom}_label`] = label;
  }

  const strengths = findingList(data.strengths, { min: 2, max: 3 });
  const growth_areas = findingList(data.growth_areas, { min: 2, max: 3 });
  if (!strengths || !growth_areas) return null;

  const complements = findingList(data.working_relationships?.complements, { min: 2, max: 2 });
  const friction = findingList(data.working_relationships?.friction, {
    min: 2,
    max: 2,
    extraKey: 'bridge',
  });
  if (!complements || !friction) return null;

  return {
    composite_archetype: archetype,
    axiom_breakdown: breakdown,
    executive_summary: summary,
    rigidity_index: rigidity,
    strengths,
    growth_areas,
    working_relationships: { complements, friction },
    stress_response_prediction: stress,
  };
}
