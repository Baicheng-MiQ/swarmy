interface StatBlockProps {
  label: string
  value: string | number
}

export function StatBlock({ label, value }: StatBlockProps) {
  return (
    <div className="stat-block">
      <div className="stat-block-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}
