/**
 * The single source of truth for the API contract.
 * Both the validator and the model schema import from here, so the two can
 * never drift apart.
 */

export const AXIOMS = ['epistemology', 'ethics', 'ontology', 'governance'];

export const STANCES = ['A', 'B', 'C'];

export const RIGIDITY_LEVELS = [
  'Low (Adaptive Operator)',
  'Moderate (Balanced)',
  'High (Dogmatic)',
];

export const LIMITS = {
  BREAKING_POINT_MIN: 12,
  BREAKING_POINT_MAX: 600,
  CONVICTION_MIN: 0,
  CONVICTION_MAX: 100,
};

/**
 * Response schema in the Gemini structured-output dialect.
 *
 * `propertyOrdering` is not decoration — without it the model emits properties
 * alphabetically, which degrades quality on fields that depend on earlier
 * reasoning (the archetype should be settled before the summary describes it).
 */
export const RESPONSE_SCHEMA = {
  type: 'object',
  required: [
    'composite_archetype',
    'axiom_breakdown',
    'executive_summary',
    'rigidity_index',
    'blind_spots',
    'stress_response_prediction',
  ],
  propertyOrdering: [
    'composite_archetype',
    'axiom_breakdown',
    'executive_summary',
    'rigidity_index',
    'blind_spots',
    'stress_response_prediction',
  ],
  properties: {
    composite_archetype: {
      type: 'string',
      description:
        'A two-to-four word archetype label describing how this person resolves trade-offs. Specific and non-flattering. Never a compliment.',
    },
    axiom_breakdown: {
      type: 'object',
      required: [
        'epistemology_label',
        'ethics_label',
        'ontology_label',
        'governance_label',
      ],
      propertyOrdering: [
        'epistemology_label',
        'ethics_label',
        'ontology_label',
        'governance_label',
      ],
      properties: {
        epistemology_label: {
          type: 'string',
          description:
            'Two to four words naming how this person verifies truth, informed by the gap between their stance and their fracture point.',
        },
        ethics_label: {
          type: 'string',
          description: 'Two to four words naming how this person sets moral boundaries.',
        },
        ontology_label: {
          type: 'string',
          description:
            'Two to four words naming how this person processes what they cannot control.',
        },
        governance_label: {
          type: 'string',
          description:
            'Two to four words naming where this person places responsibility for failure.',
        },
      },
    },
    executive_summary: {
      type: 'string',
      description:
        'Two to three sentences on how this person makes trade-offs under pressure. Plain language, active voice, no flattery, no hedging.',
    },
    rigidity_index: {
      type: 'string',
      enum: RIGIDITY_LEVELS,
      description:
        'Cognitive flexibility, judged on whether the fracture points are specific and conditional (low rigidity) or absent, vague, or absolute (high rigidity). High conviction with a precise fracture point is not rigidity.',
    },
    blind_spots: {
      type: 'array',
      minItems: 2,
      maxItems: 4,
      items: { type: 'string' },
      description:
        'Each item names one concrete friction between a stated stance and a stated fracture point, and what it costs. Quote the friction; do not moralise about it.',
    },
    stress_response_prediction: {
      type: 'string',
      description:
        'Two to three sentences on the likely first reaction when the primary system fails without warning. Behavioural and observable, not diagnostic.',
    },
  },
};
