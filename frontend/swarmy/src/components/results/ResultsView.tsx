import { useState, useEffect } from 'react'
import type { Job } from '../../types'
import { JobHeader } from './JobHeader'
import { ProgressTracker } from './ProgressTracker'
import { AgentTable } from './AgentTable'
import { Button } from '../shared/Button'

interface ResultsViewProps {
  job: Job
  isPolling: boolean
  onReset: () => void
}

function useElapsed(startTime: number, isRunning: boolean): string {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!isRunning) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [isRunning])

  const secs = Math.floor((now - startTime) / 1000)
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function ResultsView({ job, isPolling, onReset }: ResultsViewProps) {
  const [startTime] = useState(() => Date.now())
  const elapsed = useElapsed(startTime, isPolling)

  return (
    <>
      {/* Agent status dots */}
      <ProgressTracker agents={job.agents} />

      {/* Header stats */}
      <section className="section">
        <JobHeader job={job} elapsed={elapsed} />
      </section>

      {/* Agent results table */}
      <section className="section">
        <div className="section-label">Agent Results</div>
        <AgentTable agents={job.agents} />
      </section>

      {/* Footer */}
      <div className="action-bar">
        <Button variant="secondary" onClick={onReset}>
          ← New Swarm
        </Button>
      </div>
    </>
  )
}
