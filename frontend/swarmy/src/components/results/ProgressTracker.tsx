interface ProgressTrackerProps {
  done: number
  total: number
}

export function ProgressTracker({ done, total }: ProgressTrackerProps) {
  const pct = total > 0 ? (done / total) * 100 : 0
  const isComplete = done === total && total > 0

  return (
    <div className="progress-track">
      <div
        className={`progress-fill ${isComplete ? 'progress-fill-done' : ''}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
