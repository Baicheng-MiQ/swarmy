import { useState } from 'react'
import type { Agent } from '../../types'
import { StatusBadge } from '../shared/StatusBadge'
import { Skeleton } from '../shared/Skeleton'

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
                  <pre className="code-block">{formatJson(agent.response!)}</pre>
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

function formatJson(s: string): string {
  try {
    return JSON.stringify(JSON.parse(s), null, 2)
  } catch {
    return s
  }
}
