import type { Job } from '../../types'
import { LiveIndicator } from '../shared/LiveIndicator'
import { StatBlock } from '../shared/StatBlock'

interface JobHeaderProps {
  job: Job
  elapsed: string
}

export function JobHeader({ job, elapsed }: JobHeaderProps) {
  const doneCount = job.agents.filter((a) => a.status === 'done').length
  const errorCount = job.agents.filter((a) => a.status === 'error').length
  const totalCost = job.agents.reduce((s, a) => s + (a.cost ?? 0), 0)

  return (
    <div className="job-header">
      <LiveIndicator
        active={job.status === 'working'}
        label={job.status === 'working' ? 'Working' : job.status === 'done' ? 'Complete' : 'Ready'}
      />
      <div className="stat-row">
        <StatBlock label="Done" value={`${doneCount}/${job.agents.length}`} />
        {errorCount > 0 && <StatBlock label="Errors" value={errorCount} />}
        <StatBlock label="Cost" value={`$${totalCost.toFixed(4)}`} />
        <StatBlock label="Elapsed" value={elapsed} />
      </div>
    </div>
  )
}
