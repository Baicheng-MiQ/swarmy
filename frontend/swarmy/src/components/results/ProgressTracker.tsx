import type { Agent } from '../../types'

interface ProgressTrackerProps {
  agents: Agent[]
}

export function ProgressTracker({ agents }: ProgressTrackerProps) {
  const total = agents.length
  if (total === 0) return null

  // Compute grid columns: roughly sqrt for a rectangular layout
  const cols = Math.ceil(Math.sqrt(total))

  return (
    <div
      className="progress-dots"
      style={{ gridTemplateColumns: `repeat(${cols}, 10px)` }}
    >
      {agents.map((agent) => (
        <span
          key={agent.agent_id}
          className={`progress-dot progress-dot--${agent.status}`}
          title={`${agent.model_name} — ${agent.status}`}
        />
      ))}
    </div>
  )
}
