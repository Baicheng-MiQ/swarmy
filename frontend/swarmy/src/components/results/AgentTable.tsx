import { useState, useMemo } from 'react'
import type { Agent } from '../../types'
import { StatusBadge } from '../shared/StatusBadge'
import { Skeleton } from '../shared/Skeleton'
import { JsonVisualizer } from 'react-json-beautifier'

interface AgentTableProps {
  agents: Agent[]
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

export function AgentTable({ agents }: AgentTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Sort: done first, then working, then error, then ready
  const order: Record<string, number> = { done: 0, error: 1, working: 2, ready: 3 }
  const sorted = [...agents].sort((a, b) => (order[a.status] ?? 4) - (order[b.status] ?? 4))

  return (
    <div className="card-tight">
      <table className="table">
        <thead>
          <tr>
            <th>Status</th>
            <th>Model</th>
            <th>Persona</th>
            <th>Temp</th>
            <th>Response</th>
            <th>Cost</th>
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
}: {
  agent: Agent
  isExpanded: boolean
  onToggle: () => void
}) {
  const hasResponse = agent.status === 'done' && agent.response
  const hasError = agent.status === 'error'

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
            {agent.persona ? truncate(agent.persona, 30) : '—'}
          </span>
        </td>
        <td>{agent.temperature != null ? agent.temperature.toFixed(1) : '—'}</td>
        <td>
          {agent.status === 'working' && <Skeleton width="80%" height={14} />}
          {hasResponse && (
            <span className="cell-mono">{truncate(agent.response!, 60)}</span>
          )}
          {hasError && (
            <span className="cell-error">{truncate(agent.error ?? 'Unknown error', 60)}</span>
          )}
          {agent.status === 'ready' && <span className="cell-dim">—</span>}
        </td>
        <td>{agent.cost != null ? `$${agent.cost.toFixed(4)}` : '—'}</td>
      </tr>

      {isExpanded && (
        <tr className="detail-row">
          <td colSpan={6}>
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
  .jv-dark, .jv-dark * { color: #e5e5e5 !important; }
  .jv-dark [class*="font-semibold"] { color: #fafafa !important; }
  .jv-dark [class*="font-medium"] { color: #fafafa !important; }
  .jv-dark .json-entry { border-radius: 6px; padding: 6px 8px; }
  .jv-dark .json-entry:hover { background: #2a2a2a !important; }
  .jv-dark .json-card { background: #1a1a1a !important; border: 1px solid #2a2a2a !important; border-radius: 8px; padding: 12px; }
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
        <div className="jv-dark">
          <JsonVisualizer data={parsed} />
        </div>
      </>
    )
  }

  return <pre className="code-block">{raw}</pre>
}
