import type { AgentConfig, Model } from '../../types'
import { StatusBadge } from '../shared/StatusBadge'

interface AgentCardProps {
  agent: AgentConfig
  models: Model[]
  onChange: (updated: AgentConfig) => void
  onRemove: () => void
  canRemove: boolean
}

export function AgentCard({ agent, models, onChange, onRemove, canRemove }: AgentCardProps) {
  return (
    <div className="agent-card">
      <StatusBadge status="ready" />
      <div className="agent-card-row">
        {/* Model */}
        <div className="field field-inline">
          <label className="field-label-sm">Model</label>
          <select
            className="input input-select"
            value={agent.model_name}
            onChange={(e) => onChange({ ...agent, model_name: e.target.value })}
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Temperature */}
        <div className="field field-inline field-narrow">
          <label className="field-label-sm">Temp</label>
          <input
            type="number"
            className="input input-sm"
            value={agent.temperature ?? 0.7}
            min={0}
            max={2}
            step={0.1}
            onChange={(e) =>
              onChange({ ...agent, temperature: parseFloat(e.target.value) || 0 })
            }
          />
        </div>

        {/* Remove */}
        {canRemove && (
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onRemove} title="Remove agent">
            ×
          </button>
        )}
      </div>

      {/* Persona */}
      <div className="field">
        <label className="field-label-sm">Persona</label>
        <input
          className="input"
          placeholder="Optional persona…"
          value={agent.persona ?? ''}
          onChange={(e) => onChange({ ...agent, persona: e.target.value || undefined })}
        />
      </div>
    </div>
  )
}
