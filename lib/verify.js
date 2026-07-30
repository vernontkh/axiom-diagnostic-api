import { AXIOMS, RIGIDITY_LEVELS } from './contract.js';

const text = (value) =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

/**
 * Verifies a diagnosis returned by the model.
 *
 * Trusting the output because a schema was requested is one assumption too many.
 * Structured output holds in the overwhelming majority of cases; this catches
 * the remainder before a malformed shape reaches the interface and renders as
 * "undefined" in front of whoever is reading their result.
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

  const blind_spots = Array.isArray(data.blind_spots)
    ? data.blind_spots.map(text).filter(Boolean).slice(0, 4)
    : [];
  if (blind_spots.length === 0) return null;

  return {
    composite_archetype: archetype,
    axiom_breakdown: breakdown,
    executive_summary: summary,
    rigidity_index: rigidity,
    blind_spots,
    stress_response_prediction: stress,
  };
}
