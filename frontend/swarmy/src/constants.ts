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

export const DEFAULT_AGENT_COUNT = 5
export const DEFAULT_TEMP_MIN = 0.2
export const DEFAULT_TEMP_MAX = 1.5
export const POLL_INTERVAL_MS = 1500
