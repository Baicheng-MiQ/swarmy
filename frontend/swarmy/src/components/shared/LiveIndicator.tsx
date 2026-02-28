interface LiveIndicatorProps {
  active: boolean
  label?: string
}

export function LiveIndicator({ active, label }: LiveIndicatorProps) {
  return (
    <span className={`live-indicator ${active ? 'live-indicator-active' : ''}`}>
      <span className="live-dot" />
      {label && <span className="live-label">{label}</span>}
    </span>
  )
}
