import { useState, useMemo } from 'react'
import Ajv from 'ajv'
import type { Agent, ResponseFormat } from '../../types'
import { StatusBadge } from '../shared/StatusBadge'
import { Skeleton } from '../shared/Skeleton'
import { JsonVisualizer } from 'react-json-beautifier'

const ajv = new Ajv({ allErrors: true, strict: false })

interface AgentTableProps {
  agents: Agent[]
  responseFormat?: ResponseFormat | null
}

/** Truncate a string to maxLen chars */
function truncate(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s
  return s.slice(0, maxLen) + '…'
}

/** Extract a short model display name */
function shortModel(id: string): string {
  const parts = id.split('/')
  return parts[parts.length - 1] ?? id
}

type SortKey = 'status' | 'model' | 'persona' | 'temp' | 'response' | 'schema' | 'cost'
type SortDir = 'asc' | 'desc'

function SortArrow({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="sort-arrow sort-arrow-idle">⇅</span>
  return <span className="sort-arrow">{dir === 'asc' ? '↑' : '↓'}</span>
}

type SchemaResult = { valid: true } | { valid: false; errors: string[] }

function validateAgainstSchema(
  response: string | null,
  schema: Record<string, unknown> | undefined,
): SchemaResult | null {
  if (!schema || !response) return null
  try {
    const data = JSON.parse(response)
    const validate = ajv.compile(schema)
    const valid = validate(data)
    if (valid) return { valid: true }
    const errors = (validate.errors ?? []).map(
      (e) => `${e.instancePath || '/'} ${e.message ?? 'invalid'}`,
    )
    return { valid: false, errors }
  } catch {
    return { valid: false, errors: ['Response is not valid JSON'] }
  }
}

export function AgentTable({ agents, responseFormat }: AgentTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('model')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const schema = responseFormat?.json_schema?.schema

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  // Pre-compute schema validation results for all agents
  const validationMap = useMemo(() => {
    if (!schema) return new Map<string, SchemaResult | null>()
    return new Map(
      agents.map((a) => [a.agent_id, validateAgainstSchema(a.response, schema)]),
    )
  }, [agents, schema])

  const sorted = useMemo(() => {
    const statusOrder: Record<string, number> = { done: 0, error: 1, working: 2, ready: 3 }
    const dir = sortDir === 'asc' ? 1 : -1

    return [...agents].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'status':
          cmp = (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4)
          break
        case 'model':
          cmp = shortModel(a.model_name).localeCompare(shortModel(b.model_name))
          break
        case 'persona':
          cmp = (a.persona ?? '').localeCompare(b.persona ?? '')
          break
        case 'temp':
          cmp = (a.temperature ?? 0) - (b.temperature ?? 0)
          break
        case 'response':
          cmp = (a.response ?? '').localeCompare(b.response ?? '')
          break
        case 'cost':
          cmp = (a.cost ?? 0) - (b.cost ?? 0)
          break
        case 'schema': {
          const va = validationMap.get(a.agent_id)
          const vb = validationMap.get(b.agent_id)
          const sa = va == null ? 0 : va.valid ? 1 : -1
          const sb = vb == null ? 0 : vb.valid ? 1 : -1
          cmp = sa - sb
          break
        }
      }
      return cmp * dir
    })
  }, [agents, sortKey, sortDir, validationMap])

  const hasSchema = !!schema

  const columns: [SortKey, string][] = [
    ['status', 'Status'],
    ['model', 'Model'],
    ['persona', 'Persona'],
    ['temp', 'Temp'],
    ['response', 'Response'],
    ...(hasSchema ? [['schema', 'Schema'] as [SortKey, string]] : []),
    ['cost', 'Cost'],
  ]

  return (
    <div className="card-tight">
      <table className="table">
        <thead>
          <tr>
            {columns.map(([key, label]) => (
              <th
                key={key}
                onClick={() => handleSort(key)}
                className="th-sortable"
              >
                {label}
                <SortArrow active={sortKey === key} dir={sortDir} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((agent) => {
            const isExpanded = expandedId === agent.agent_id
            return (
              <AgentRow
                key={agent.agent_id}
                agent={agent}
                isExpanded={isExpanded}
                onToggle={() => setExpandedId(isExpanded ? null : agent.agent_id)}
                schemaResult={validationMap.get(agent.agent_id) ?? null}
                hasSchema={hasSchema}
              />
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function AgentRow({
  agent,
  isExpanded,
  onToggle,
  schemaResult,
  hasSchema,
}: {
  agent: Agent
  isExpanded: boolean
  onToggle: () => void
  schemaResult: SchemaResult | null
  hasSchema: boolean
}) {
  const hasResponse = agent.status === 'done' && agent.response
  const hasError = agent.status === 'error'
  const colSpan = hasSchema ? 7 : 6

  return (
    <>
      <tr
        onClick={onToggle}
        className={`table-row-clickable ${isExpanded ? 'table-row-expanded' : ''}`}
      >
        <td>
          <StatusBadge status={agent.status} />
        </td>
        <td>
          <span className="model-name">{shortModel(agent.model_name)}</span>
        </td>
        <td>
          <span className="cell-dim">
            {agent.persona ? truncate(agent.persona, 80) : '—'}
          </span>
        </td>
        <td>{agent.temperature != null ? agent.temperature.toFixed(1) : '—'}</td>
        <td>
          {agent.status === 'working' && <Skeleton width="80%" height={14} />}
          {hasResponse && (
            <span className="cell-mono">{truncate(agent.response!, 120)}</span>
          )}
          {hasError && (
            <span className="cell-error">{truncate(agent.error ?? 'Unknown error', 120)}</span>
          )}
          {agent.status === 'ready' && <span className="cell-dim">—</span>}
        </td>
        {hasSchema && (
          <td>
            {schemaResult == null ? (
              <span className="cell-dim">—</span>
            ) : schemaResult.valid ? (
              <span className="schema-pass" title="Conforms to schema">✓</span>
            ) : (
              <span
                className="schema-fail"
                title={schemaResult.errors.join('\n')}
              >
                ✗
              </span>
            )}
          </td>
        )}
        <td>{agent.cost != null ? `$${agent.cost.toFixed(4)}` : '—'}</td>
      </tr>

      {isExpanded && (
        <tr className="detail-row">
          <td colSpan={colSpan}>
            <div className="agent-detail">
              {hasResponse && (
                <div className="detail-section">
                  <div className="field-label-sm">Response</div>
                  <JsonResponse raw={agent.response!} />
                </div>
              )}
              {agent.reasoning && (
                <div className="detail-section">
                  <div className="field-label-sm">Reasoning</div>
                  <p className="detail-text">{agent.reasoning}</p>
                </div>
              )}
              {hasError && (
                <div className="detail-section">
                  <div className="field-label-sm">Error</div>
                  <p className="cell-error">{agent.error}</p>
                </div>
              )}
              {schemaResult && !schemaResult.valid && (
                <div className="detail-section">
                  <div className="field-label-sm">Schema Errors</div>
                  <ul className="schema-error-list">
                    {schemaResult.errors.map((err, i) => (
                      <li key={i} className="cell-error">{err}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="detail-meta">
                {agent.input_token != null && (
                  <span className="meta-item">In: {agent.input_token} tokens</span>
                )}
                {agent.output_token != null && (
                  <span className="meta-item">Out: {agent.output_token} tokens</span>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

const JSON_DARK_STYLES = `
  .jv-dark, .jv-dark * { color: #e5e5e5 !important; font-size: 12px !important; }
  .jv-dark [class*="font-semibold"] { color: #fafafa !important; font-size: 12px !important; }
  .jv-dark [class*="font-medium"] { color: #fafafa !important; font-size: 12px !important; }
  .jv-dark .json-entry { border-radius: 4px; padding: 3px 6px; }
  .jv-dark .json-entry:hover { background: #2a2a2a !important; }
  .jv-dark .json-card { background: #1a1a1a !important; border: 1px solid #2a2a2a !important; border-radius: 6px; padding: 8px; }
  .jv-dark [class*="bg-blue-50"] { background: rgba(59,130,246,0.15) !important; }
  .jv-dark [class*="bg-green-50"] { background: rgba(34,197,94,0.15) !important; }
  .jv-dark [class*="bg-red-50"] { background: rgba(239,68,68,0.15) !important; }
  .jv-dark [class*="bg-purple-50"] { background: rgba(168,85,247,0.15) !important; }
  .jv-dark [class*="bg-indigo-50"] { background: rgba(99,102,241,0.15) !important; }
  .jv-dark [class*="bg-orange-50"] { background: rgba(249,115,22,0.15) !important; }
  .jv-dark [class*="text-blue-"] { color: #60a5fa !important; }
  .jv-dark [class*="text-green-"] { color: #4ade80 !important; }
  .jv-dark [class*="text-red-"] { color: #f87171 !important; }
  .jv-dark [class*="text-purple-"] { color: #c084fc !important; }
  .jv-dark [class*="text-indigo-"] { color: #818cf8 !important; }
  .jv-dark [class*="text-orange-"] { color: #fb923c !important; }
  .jv-dark [class*="bg-secondary"] { background: #3d3d3d !important; }
  .jv-dark [class*="bg-primary"] { background: #fafafa !important; }
  .jv-dark p { margin: 2px 0 !important; line-height: 1.4 !important; }
  .jv-dark h1, .jv-dark h2, .jv-dark h3, .jv-dark h4 { font-size: 12px !important; margin: 2px 0 !important; }
  .jv-dark > div { gap: 4px !important; }
  .jv-dark [class*="space-y"] > * + * { margin-top: 4px !important; }
  .jv-dark [class*="gap-"] { gap: 4px !important; }
  .jv-dark [class*="p-4"], .jv-dark [class*="p-6"] { padding: 6px !important; }
  .jv-dark [class*="py-"] { padding-top: 3px !important; padding-bottom: 3px !important; }
  .jv-dark [class*="px-"] { padding-left: 6px !important; padding-right: 6px !important; }
  .jv-dark [class*="mb-"], .jv-dark [class*="mt-"] { margin-top: 2px !important; margin-bottom: 2px !important; }
  .jv-dark [class*="text-lg"], .jv-dark [class*="text-xl"], .jv-dark [class*="text-2xl"] { font-size: 12px !important; }
  .jv-dark [class*="text-sm"], .jv-dark [class*="text-xs"] { font-size: 11px !important; }
  .jv-dark [class*="rounded-lg"] { border-radius: 4px !important; }
`

function JsonResponse({ raw }: { raw: string }) {
  const parsed = useMemo(() => {
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }, [raw])

  if (parsed !== null && typeof parsed === 'object') {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: JSON_DARK_STYLES }} />
        <div className="jv-dark" style={{ maxWidth: 560 }}>
          <JsonVisualizer data={parsed} />
        </div>
      </>
    )
  }

  return <pre className="code-block">{raw}</pre>
}
