import type { AgentConfig, Model } from '../../types'
import { AgentCard } from './AgentCard'
import { Button } from '../shared/Button'

interface AgentListProps {
  agents: AgentConfig[]
  models: Model[]
  onChange: (agents: AgentConfig[]) => void
}

let nextId = 1000

export function AgentList({ agents, models, onChange }: AgentListProps) {
  function updateAgent(index: number, updated: AgentConfig) {
    const next = [...agents]
    next[index] = updated
    onChange(next)
  }

  function removeAgent(index: number) {
    if (agents.length <= 2) return
    onChange(agents.filter((_, i) => i !== index))
  }

  function addAgent() {
    if (models.length === 0) return
    const model = models[agents.length % models.length]
    const newAgent: AgentConfig = {
      id: `manual-${nextId++}`,
      model_name: model.id,
      temperature: 0.7,
      persona: undefined,
    }
    onChange([...agents, newAgent])
  }

  return (
    <div className="agent-list">
      <div className="agent-list-header">
        <span className="field-label">{agents.length} Agents</span>
      </div>
      <div className="agent-list-items">
        {agents.map((agent, i) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            models={models}
            onChange={(updated) => updateAgent(i, updated)}
            onRemove={() => removeAgent(i)}
            canRemove={agents.length > 2}
          />
        ))}
      </div>
      <Button variant="secondary" size="sm" onClick={addAgent}>
        + Add Agent
      </Button>
    </div>
  )
}
