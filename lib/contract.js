/**
 * The single source of truth for the API contract.
 * Both the validator and the model schema import from here, so the two can
 * never drift apart.
 */

export const AXIOMS = ['epistemology', 'ethics', 'ontology', 'governance'];

export const STANCES = ['A', 'B', 'C'];

/**
 * Phrased as descriptions rather than verdicts. "Dogmatic" is accurate and
 * useless: it is the word that makes a reader defend themselves instead of
 * reading the next paragraph.
 */
export const RIGIDITY_LEVELS = [
  'Low — adapts readily',
  'Moderate — balanced',
  'High — holds firm',
];

export const LIMITS = {
  BREAKING_POINT_MIN: 12,
  BREAKING_POINT_MAX: 600,
  CONVICTION_MIN: 0,
  CONVICTION_MAX: 100,
};

/** A named observation: a scannable heading and the substance beneath it. */
const finding = (titleHint, detailHint) => ({
  type: 'object',
  required: ['title', 'detail'],
  propertyOrdering: ['title', 'detail'],
  properties: {
    title: { type: 'string', description: titleHint },
    detail: { type: 'string', description: detailHint },
  },
});

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
    'strengths',
    'growth_areas',
    'working_relationships',
    'stress_response_prediction',
  ],
  propertyOrdering: [
    'composite_archetype',
    'axiom_breakdown',
    'executive_summary',
    'rigidity_index',
    'strengths',
    'growth_areas',
    'working_relationships',
    'stress_response_prediction',
  ],
  properties: {
    composite_archetype: {
      type: 'string',
      description:
        'Two to four words describing how this configuration decides things. Descriptive, never a verdict. The reader must be able to say it aloud to a colleague without embarrassment.',
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
          description: 'Two to four plain words naming how this person settles what is true.',
        },
        ethics_label: {
          type: 'string',
          description: 'Two to four plain words naming how this person sets boundaries.',
        },
        ontology_label: {
          type: 'string',
          description: 'Two to four plain words naming how this person handles what will not move.',
        },
        governance_label: {
          type: 'string',
          description: 'Two to four plain words naming where this person places responsibility.',
        },
      },
    },
    executive_summary: {
      type: 'string',
      description:
        'Two to three sentences on how this person decides under pressure. Describe the mechanism, never the motive. Plain language a reader outside this field would follow.',
    },
    rigidity_index: {
      type: 'string',
      enum: RIGIDITY_LEVELS,
      description:
        'How firmly these positions are held. Judged on whether the breaking points are specific and conditional (low) or absent, vague, or absolute (high). High conviction with a precise breaking point is not high rigidity.',
    },
    strengths: {
      type: 'array',
      minItems: 2,
      maxItems: 3,
      items: finding(
        'Two to five words naming the strength.',
        'Two to three sentences. Point to the specific answer that shows it, then name plainly what this strength costs — every real strength has a cost, and a strength listed without one is flattery.',
      ),
      description:
        'Capabilities visible in these answers. Each must be evidenced from something the person actually wrote, and each must name its cost.',
    },
    growth_areas: {
      type: 'array',
      minItems: 2,
      maxItems: 3,
      items: finding(
        'Two to five words naming what could be worked on. A description, not an accusation.',
        'Two to three sentences. Name the tension between what they said they would do and where they said it breaks, then give one concrete thing to try. Describe the pattern, never the character.',
      ),
      description:
        'Where these answers work against each other, written so the reader can act rather than defend.',
    },
    working_relationships: {
      type: 'object',
      required: ['complements', 'friction'],
      propertyOrdering: ['complements', 'friction'],
      properties: {
        complements: {
          type: 'array',
          minItems: 2,
          maxItems: 2,
          items: finding(
            'Two to six words naming a working style, for example "Someone who documents decisions".',
            'Two to three sentences on why this style covers something these answers leave uncovered.',
          ),
          description: 'Working styles that fit well with this configuration.',
        },
        friction: {
          type: 'array',
          minItems: 2,
          maxItems: 2,
          items: {
            type: 'object',
            required: ['title', 'detail', 'bridge'],
            propertyOrdering: ['title', 'detail', 'bridge'],
            properties: {
              title: {
                type: 'string',
                description: 'Two to six words naming a working style, not a kind of person.',
              },
              detail: {
                type: 'string',
                description:
                  'Two to three sentences on where the two approaches pull against each other. Neither side is wrong; describe the mismatch.',
              },
              bridge: {
                type: 'string',
                description:
                  'One or two sentences naming something practical the reader can do to work well with this style.',
              },
            },
          },
          description:
            'Working styles likely to pull against this configuration, each with a way to bridge it.',
        },
      },
    },
    stress_response_prediction: {
      type: 'string',
      description:
        'Two to three sentences on the likely first reaction when something fails without warning. Observable behaviour only. Useful to a colleague, fair to the reader.',
    },
  },
};
