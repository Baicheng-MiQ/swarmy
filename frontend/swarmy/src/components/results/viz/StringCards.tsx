import { useMemo } from 'react'
import type { ParsedAgentRow, VizField } from './schemaIntrospect'

interface StringCardProps {
  field: VizField
  rows: ParsedAgentRow[]
}

/** Display short string responses as readable cards */
export function StringCards({ field, rows }: StringCardProps) {
  const values = useMemo(() => {
    const vals: { agentId: string; model: string; text: string }[] = []
    for (const r of rows) {
      const v = r.data[field.name]
      if (typeof v === 'string' && v.trim()) {
        vals.push({ agentId: r.agentId, model: r.model, text: v })
      }
    }
    return vals
  }, [rows, field.name])

  // Frequency: group identical/near-identical strings
  const freq = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const v of values) {
      const key = v.text.toLowerCase().trim()
      counts[key] = (counts[key] ?? 0) + 1
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
  }, [values])

  if (values.length === 0) return null

  return (
    <div className="viz-field-card">
      <div className="viz-field-header">
        <span className="viz-field-name">{field.name}</span>
        {field.description && (
          <span className="viz-field-desc">{field.description}</span>
        )}
      </div>

      {/* Top recurring phrases */}
      {freq.length > 0 && freq[0][1] > 1 && (
        <div className="viz-freq-table">
          {freq.map(([text, count]) => (
            <div className="viz-freq-row" key={text}>
              <span className="viz-freq-count">{count}×</span>
              <span className="viz-freq-text">{text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Sample cards */}
      <div className="viz-string-grid">
        {values.slice(0, 8).map((v) => (
          <div className="viz-string-card" key={v.agentId}>
            <span className="viz-string-model">{v.model}</span>
            <span className="viz-string-text">{v.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
