import { useState, useEffect } from 'react'
import type { Job } from '../../types'
import { JobHeader } from './JobHeader'
import { ProgressTracker } from './ProgressTracker'
import { AgentTable } from './AgentTable'
import { SwarmViz } from './viz/SwarmViz'
import { Button } from '../shared/Button'

interface ResultsViewProps {
  job: Job
  isPolling: boolean
  onReset: () => void
  timedOut?: boolean
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

export function ResultsView({ job, isPolling, onReset, timedOut }: ResultsViewProps) {
  const [startTime] = useState(() => Date.now())
  const elapsed = useElapsed(startTime, isPolling)

  return (
    <>
      {/* Timeout banner */}
      {timedOut && (
        <div className="timeout-banner">
          <span className="badge badge-error">Timeout</span>
          <span className="timeout-text">Job exceeded the 1:30 time limit. Unfinished agents were stopped.</span>
        </div>
      )}

      {/* Agent status dots */}
      <ProgressTracker agents={job.agents} />

      {/* Header stats */}
      <section className="section">
        <JobHeader job={job} elapsed={elapsed} />
      </section>

      {/* Swarm visualization */}
      {job.response_format && (
        <section className="section">
          <div className="section-label">Swarm Analysis</div>
          <SwarmViz agents={job.agents} responseFormat={job.response_format} />
        </section>
      )}

      {/* Agent results table */}
      <section className="section">
        <div className="section-label">Agent Results</div>
        <AgentTable agents={job.agents} responseFormat={job.response_format} />
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
