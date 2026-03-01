/**
 * Schema introspection — classify each field in a JSON schema by its
 * visualization-relevant type, and extract valid agent responses.
 */
import Ajv from 'ajv'
import type { Agent, ResponseFormat } from '../../../types'

const ajv = new Ajv({ allErrors: true, strict: false })

// ── Field classification ──

export type VizFieldType = 'boolean' | 'enum' | 'float' | 'int' | 'string'

export interface VizField {
  name: string
  type: VizFieldType
  description?: string
  enumValues?: string[]
}

/**
 * Walk the top-level properties of a JSON schema and classify each one
 * into a VizFieldType for chart selection.
 */
export function introspectSchema(rf: ResponseFormat | null): VizField[] {
  if (!rf) return []
  const schema = rf.json_schema.schema as Record<string, unknown>
  const props = schema.properties as Record<string, Record<string, unknown>> | undefined
  if (!props) return []

  return Object.entries(props).map(([name, def]) => {
    const description = (def.description as string) ?? undefined
    const jsonType = def.type as string

    // string with enum → enum
    if (jsonType === 'string' && Array.isArray(def.enum)) {
      return {
        name,
        type: 'enum' as const,
        description,
        enumValues: def.enum as string[],
      }
    }

    // boolean or string with exactly {true,false}/{yes,no} enum
    if (jsonType === 'boolean') {
      return { name, type: 'boolean' as const, description, enumValues: ['true', 'false'] }
    }

    // number — decide int vs float by description heuristic or enum presence
    if (jsonType === 'number' || jsonType === 'integer') {
      const isInt =
        jsonType === 'integer' ||
        /\bscore\b|\brank\b|\bcount\b|\b1 to 10\b|\b0 to 10\b/i.test(description ?? '')
      return { name, type: isInt ? ('int' as const) : ('float' as const), description }
    }

    // plain string
    if (jsonType === 'string') {
      return { name, type: 'string' as const, description }
    }

    // fallback
    return { name, type: 'string' as const, description }
  })
}

// ── Data extraction ──

export interface ParsedAgentRow {
  agentId: string
  model: string
  persona: string | null
  temperature: number | null
  data: Record<string, unknown>
}

/**
 * Extract parsed, schema-conforming responses from agents.
 * Only includes agents with status === 'done', valid JSON response,
 * and (when a schema is provided) responses that validate against it.
 */
export function extractValidRows(
  agents: Agent[],
  responseFormat?: ResponseFormat | null,
): ParsedAgentRow[] {
  const schema = responseFormat?.json_schema?.schema
  const validate = schema ? ajv.compile(schema as Record<string, unknown>) : null

  const rows: ParsedAgentRow[] = []
  for (const a of agents) {
    if (a.status !== 'done' || !a.response) continue
    try {
      const data = JSON.parse(a.response) as Record<string, unknown>
      // Skip responses that don't conform to the schema
      if (validate && !validate(data)) continue
      rows.push({
        agentId: a.agent_id,
        model: shortModel(a.model_name),
        persona: a.persona,
        temperature: a.temperature,
        data,
      })
    } catch {
      // skip unparseable
    }
  }
  return rows
}

function shortModel(id: string): string {
  const parts = id.split('/')
  return parts[parts.length - 1] ?? id
}

// ── Aggregation helpers ──

/** Count occurrences of each value for a given field */
export function countField(rows: ParsedAgentRow[], fieldName: string): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const r of rows) {
    const v = String(r.data[fieldName] ?? '')
    counts[v] = (counts[v] ?? 0) + 1
  }
  return counts
}

/** Collect numeric values for a given field */
export function collectNumbers(rows: ParsedAgentRow[], fieldName: string): number[] {
  const nums: number[] = []
  for (const r of rows) {
    const v = r.data[fieldName]
    if (typeof v === 'number' && !isNaN(v)) nums.push(v)
  }
  return nums
}

/** Group rows by a metadata key (model, persona) and count enum values */
export function groupedEnumCounts(
  rows: ParsedAgentRow[],
  fieldName: string,
  groupBy: 'model' | 'persona',
): Record<string, Record<string, number>> {
  const groups: Record<string, Record<string, number>> = {}
  for (const r of rows) {
    const key = groupBy === 'model' ? r.model : (r.persona ?? 'none')
    const val = String(r.data[fieldName] ?? '')
    if (!groups[key]) groups[key] = {}
    groups[key][val] = (groups[key][val] ?? 0) + 1
  }
  return groups
}

/** Build a cross-tabulation of two enum fields */
export function crossTab(
  rows: ParsedAgentRow[],
  field1: string,
  field2: string,
): { keys1: string[]; keys2: string[]; matrix: number[][] } {
  const set1 = new Set<string>()
  const set2 = new Set<string>()
  const counts: Record<string, Record<string, number>> = {}

  for (const r of rows) {
    const v1 = String(r.data[field1] ?? '')
    const v2 = String(r.data[field2] ?? '')
    set1.add(v1)
    set2.add(v2)
    if (!counts[v1]) counts[v1] = {}
    counts[v1][v2] = (counts[v1][v2] ?? 0) + 1
  }

  const keys1 = [...set1].sort()
  const keys2 = [...set2].sort()
  const matrix = keys1.map((k1) => keys2.map((k2) => counts[k1]?.[k2] ?? 0))
  return { keys1, keys2, matrix }
}
