import type { AgentStatus } from '../../types'

const STATUS_CONFIG: Record<AgentStatus, { label: string; cls: string }> = {
  ready: { label: 'Ready', cls: 'badge-neutral' },
  working: { label: 'Working', cls: 'badge-pending' },
  done: { label: 'Done', cls: 'badge-success' },
  error: { label: 'Error', cls: 'badge-error' },
}

export function StatusBadge({ status }: { status: AgentStatus }) {
  const { label, cls } = STATUS_CONFIG[status] ?? STATUS_CONFIG.ready
  return <span className={`badge ${cls}`}>{label}</span>
}
