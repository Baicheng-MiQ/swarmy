import type { ResponseFormat } from './types'

export const DEFAULT_PERSONAS: string[] = [
  'You are a cautious analyst who weighs risks carefully.',
  'You are an optimistic futurist who sees potential in every idea.',
  "You are a devil's advocate who challenges assumptions.",
  'You are a pragmatic engineer focused on feasibility.',
  'You are a skeptical scientist who demands evidence.',
  'You are a creative thinker who explores unconventional angles.',
  'You are a risk-averse strategist who prioritises safety.',
  'You are a data-driven realist who relies on facts and numbers.',
]

export const DEFAULT_SCHEMA: ResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'democracy_vote',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        verdict: {
          type: 'string',
          enum: ['yes', 'no', 'abstain'],
          description: 'Your vote on the question.',
        },
        confidence: {
          type: 'number',
          description: 'How confident you are in your verdict, from 0 to 1.',
        },
        reasoning: {
          type: 'string',
          description: 'A short explanation of your reasoning.',
        },
      },
      required: ['verdict', 'confidence', 'reasoning'],
      additionalProperties: false,
    },
  },
}

export const RATING_REVIEW_SCHEMA: ResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'rating_review',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        score: {
          type: 'number',
          description: 'A rating score from 1 to 10.',
        },
        pros: {
          type: 'string',
          description: 'Key strengths or advantages.',
        },
        cons: {
          type: 'string',
          description: 'Key weaknesses or disadvantages.',
        },
        summary: {
          type: 'string',
          description: 'A brief overall summary of your assessment.',
        },
      },
      required: ['score', 'pros', 'cons', 'summary'],
      additionalProperties: false,
    },
  },
}

export const FACT_CHECK_SCHEMA: ResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'fact_check',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        claim_status: {
          type: 'string',
          enum: ['true', 'false', 'partially_true', 'unverifiable'],
          description: 'Whether the claim is true, false, partially true, or unverifiable.',
        },
        confidence: {
          type: 'number',
          description: 'How confident you are in this assessment, from 0 to 1.',
        },
        evidence: {
          type: 'string',
          description: 'Key evidence supporting your assessment.',
        },
        caveats: {
          type: 'string',
          description: 'Important caveats or nuances to consider.',
        },
      },
      required: ['claim_status', 'confidence', 'evidence', 'caveats'],
      additionalProperties: false,
    },
  },
}

export const RISK_ASSESSMENT_SCHEMA: ResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'risk_assessment',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        risk_level: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          description: 'The overall risk level.',
        },
        likelihood: {
          type: 'number',
          description: 'Probability of the risk materialising, from 0 to 1.',
        },
        impact: {
          type: 'string',
          enum: ['negligible', 'minor', 'moderate', 'severe', 'catastrophic'],
          description: 'Potential impact if the risk materialises.',
        },
        mitigation: {
          type: 'string',
          description: 'Suggested actions to mitigate the risk.',
        },
        reasoning: {
          type: 'string',
          description: 'Explanation of your risk assessment.',
        },
      },
      required: ['risk_level', 'likelihood', 'impact', 'mitigation', 'reasoning'],
      additionalProperties: false,
    },
  },
}

export const SENTIMENT_ANALYSIS_SCHEMA: ResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'sentiment_analysis',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        sentiment: {
          type: 'string',
          enum: ['positive', 'negative', 'neutral', 'mixed'],
          description: 'The overall sentiment.',
        },
        intensity: {
          type: 'number',
          description: 'Strength of the sentiment from 0 (weak) to 1 (strong).',
        },
        emotions: {
          type: 'string',
          description: 'Primary emotions detected (e.g. joy, anger, surprise).',
        },
        summary: {
          type: 'string',
          description: 'A brief summary of the sentiment analysis.',
        },
      },
      required: ['sentiment', 'intensity', 'emotions', 'summary'],
      additionalProperties: false,
    },
  },
}

export const PRIORITY_RANKING_SCHEMA: ResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'priority_ranking',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        priority: {
          type: 'string',
          enum: ['P0', 'P1', 'P2', 'P3', 'P4'],
          description: 'Priority level from P0 (critical) to P4 (nice-to-have).',
        },
        effort: {
          type: 'string',
          enum: ['trivial', 'small', 'medium', 'large', 'epic'],
          description: 'Estimated effort required.',
        },
        justification: {
          type: 'string',
          description: 'Why this priority and effort level were chosen.',
        },
        dependencies: {
          type: 'string',
          description: 'Any dependencies or blockers to consider.',
        },
      },
      required: ['priority', 'effort', 'justification', 'dependencies'],
      additionalProperties: false,
    },
  },
}

export const TROLLEY_PROBLEM_SCHEMA: ResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'trolley_problem',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['swerve', 'stay', 'randomize'],
          description: 'The action you would take.',
        },
        confidence: {
          type: 'number',
          description: 'How confident you are in your choice, from 0 to 1.',
        },
        primary_principle: {
          type: 'string',
          enum: ['utilitarian', 'deontological', 'precautionary', 'abstain'],
          description: 'The ethical principle guiding your decision.',
        },
        reasoning: {
          type: 'string',
          description: 'A short explanation of your reasoning, max 2 sentences.',
        },
      },
      required: ['action', 'confidence', 'primary_principle', 'reasoning'],
      additionalProperties: false,
    },
  },
}

export const STARTUP_PITCH_SCHEMA: ResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'startup_pitch',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        verdict: {
          type: 'string',
          enum: ['invest', 'pass', 'needs_more_info'],
          description: 'Your investment decision.',
        },
        score: {
          type: 'number',
          description: 'Overall score from 1 to 10.',
        },
        biggest_risk: {
          type: 'string',
          description: 'The single biggest risk, max 1 sentence.',
        },
        biggest_strength: {
          type: 'string',
          description: 'The single biggest strength, max 1 sentence.',
        },
        confidence: {
          type: 'number',
          description: 'How confident you are in your assessment, from 0 to 1.',
        },
      },
      required: ['verdict', 'score', 'biggest_risk', 'biggest_strength', 'confidence'],
      additionalProperties: false,
    },
  },
}

export const PREDICTION_SCHEMA: ResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'prediction',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        verdict: {
          type: 'string',
          enum: ['yes', 'no', 'uncertain'],
          description: 'Your prediction verdict.',
        },
        probability: {
          type: 'number',
          description: 'Estimated probability from 0 to 1.',
        },
        confidence_in_estimate: {
          type: 'number',
          description: 'How confident you are in your probability estimate, from 0 to 1.',
        },
        key_assumption: {
          type: 'string',
          description: 'The key assumption underlying your prediction, max 1 sentence.',
        },
      },
      required: ['verdict', 'probability', 'confidence_in_estimate', 'key_assumption'],
      additionalProperties: false,
    },
  },
}

export interface SchemaPreset {
  id: string
  label: string
  description: string
  schema: ResponseFormat
  schemaName: string
}

export const SCHEMA_PRESETS: SchemaPreset[] = [
  {
    id: 'democracy_vote',
    label: 'Democracy Vote',
    description: 'Yes/no/abstain voting with confidence',
    schema: DEFAULT_SCHEMA,
    schemaName: 'democracy_vote',
  },
  {
    id: 'trolley_problem',
    label: 'Trolley Problem',
    description: 'Ethical dilemma with action & principle',
    schema: TROLLEY_PROBLEM_SCHEMA,
    schemaName: 'trolley_problem',
  },
  {
    id: 'startup_pitch',
    label: 'Startup Pitch',
    description: 'Invest/pass with risk & strength',
    schema: STARTUP_PITCH_SCHEMA,
    schemaName: 'startup_pitch',
  },
  {
    id: 'prediction',
    label: 'Prediction',
    description: 'Calibrated forecast with probability',
    schema: PREDICTION_SCHEMA,
    schemaName: 'prediction',
  },
  {
    id: 'rating_review',
    label: 'Rating Review',
    description: 'Score 1–10 with pros, cons & summary',
    schema: RATING_REVIEW_SCHEMA,
    schemaName: 'rating_review',
  },
  {
    id: 'fact_check',
    label: 'Fact Check',
    description: 'Verify claims with evidence & caveats',
    schema: FACT_CHECK_SCHEMA,
    schemaName: 'fact_check',
  },
  {
    id: 'risk_assessment',
    label: 'Risk Assessment',
    description: 'Evaluate risk level, likelihood & mitigation',
    schema: RISK_ASSESSMENT_SCHEMA,
    schemaName: 'risk_assessment',
  },
  {
    id: 'sentiment_analysis',
    label: 'Sentiment Analysis',
    description: 'Detect sentiment, intensity & emotions',
    schema: SENTIMENT_ANALYSIS_SCHEMA,
    schemaName: 'sentiment_analysis',
  },
  {
    id: 'priority_ranking',
    label: 'Priority Ranking',
    description: 'Rank priority P0–P4 with effort estimate',
    schema: PRIORITY_RANKING_SCHEMA,
    schemaName: 'priority_ranking',
  },
]

export const DEFAULT_AGENT_COUNT = 20
export const DEFAULT_TEMP_MIN = 0.0
export const DEFAULT_TEMP_MAX = 1.0
export const POLL_INTERVAL_MS = 1000
export const JOB_TIMEOUT_MS = 90_000
