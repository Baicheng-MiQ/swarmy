// ── OpenRouter Model (from /api/models/structured) ──

export interface Model {
  id: string
  name: string
  description?: string
  pricing?: {
    prompt?: string
    completion?: string
  }
  context_length?: number
  architecture?: {
    input_modalities?: string[]
    output_modalities?: string[]
  }
  top_provider?: {
    max_completion_tokens?: number
  }
  created?: number
}

// ── Chat / Job request types ──

export interface Message {
  role: string
  content: string
}

export interface JsonSchema {
  name: string
  strict: boolean
  schema: Record<string, unknown>
}

export interface ResponseFormat {
  type: 'json_schema'
  json_schema: JsonSchema
}

export interface AgentConfig {
  /** Client-side ID for React keying */
  id: string
  model_name: string
  temperature?: number
  persona?: string
}

export interface CreateJobRequest {
  messages: Message[]
  response_format?: ResponseFormat
  agents: Array<{
    model_name: string
    temperature?: number
    persona?: string
  }>
}

// ── Job / Agent response types ──

export type AgentStatus = 'ready' | 'working' | 'done' | 'error'
export type JobStatus = 'ready' | 'working' | 'done'

export interface Agent {
  agent_id: string
  model_name: string
  temperature: number | null
  status: AgentStatus
  last_update: string
  response: string | null
  reasoning: string | null
  error: string | null
  input_token: number | null
  output_token: number | null
  cost: number | null
  persona: string | null
}

export interface Job {
  job_id: string
  messages: Message[]
  response_format: ResponseFormat | null
  status: JobStatus
  updated_at: string
  agents: Agent[]
}

// ── Spawn settings ──

export interface SpawnSettings {
  count: number
  tempMin: number
  tempMax: number
  personas: string[]
}
