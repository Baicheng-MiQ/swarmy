import { useMemo } from 'react'
import { ResponsiveBar } from '@nivo/bar'
import { NIVO_DARK_THEME, VIZ_COLORS } from './nivoTheme'
import type { ParsedAgentRow, VizField } from './schemaIntrospect'
import { collectNumbers } from './schemaIntrospect'

interface NumberChartProps {
  field: VizField
  rows: ParsedAgentRow[]
}

/** Bin continuous values into a histogram */
function binValues(values: number[], binCount: number) {
  if (values.length === 0 || binCount <= 0) return []
  const safeBinCount = Math.max(1, Math.round(binCount))
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const step = range / safeBinCount

  const bins = Array.from({ length: safeBinCount }, (_, i) => ({
    label: `${(min + i * step).toFixed(2)}`,
    rangeStart: min + i * step,
    rangeEnd: min + (i + 1) * step,
    count: 0,
  }))

  for (const v of values) {
    let idx = Math.floor((v - min) / step)
    if (idx >= safeBinCount) idx = safeBinCount - 1
    if (idx < 0) idx = 0
    bins[idx].count++
  }

  return bins
}

export function NumberChart({ field, rows }: NumberChartProps) {
  const values = useMemo(() => collectNumbers(rows, field.name), [rows, field.name])

  const stats = useMemo(() => {
    if (values.length === 0) return null
    const sorted = [...values].sort((a, b) => a - b)
    const sum = sorted.reduce((s, v) => s + v, 0)
    const mean = sum / sorted.length
    const median =
      sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)]
    const variance = sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / sorted.length
    const stdDev = Math.sqrt(variance)
    const min = sorted[0]
    const max = sorted[sorted.length - 1]
    return { mean, median, stdDev, min, max, n: sorted.length }
  }, [values])

  const isFloat = field.type === 'float'
  const binCount = isFloat
    ? 10
    : Math.max(1, Math.min(10, (stats?.max ?? 0) - (stats?.min ?? 0) + 1)) || 6

  const histData = useMemo(() => {
    const bins = binValues(values, binCount)
    return bins.map((b) => ({
      bin: isFloat ? b.label : String(Math.round(b.rangeStart)),
      count: b.count,
    }))
  }, [values, binCount, isFloat])

  if (!stats) return null

  const fmt = (n: number) => (isFloat ? n.toFixed(3) : n.toFixed(1))

  return (
    <div className="viz-field-card">
      <div className="viz-field-header">
        <span className="viz-field-name">{field.name}</span>
        {field.description && (
          <span className="viz-field-desc">{field.description}</span>
        )}
      </div>

      {/* Stat block */}
      <div className="viz-stat-row">
        <div className="viz-stat">
          <span className="viz-stat-value">{fmt(stats.mean)}</span>
          <span className="viz-stat-label">Mean</span>
        </div>
        <div className="viz-stat">
          <span className="viz-stat-value">{fmt(stats.median)}</span>
          <span className="viz-stat-label">Median</span>
        </div>
        <div className="viz-stat">
          <span className="viz-stat-value">±{fmt(stats.stdDev)}</span>
          <span className="viz-stat-label">Std Dev</span>
        </div>
        <div className="viz-stat">
          <span className="viz-stat-value">
            {fmt(stats.min)}–{fmt(stats.max)}
          </span>
          <span className="viz-stat-label">Range</span>
        </div>
      </div>

      {/* Histogram */}
      <div className="viz-chart-container viz-chart-wide">
        <ResponsiveBar
          data={histData}
          keys={['count']}
          indexBy="bin"
          theme={NIVO_DARK_THEME}
          colors={[VIZ_COLORS[0]]}
          margin={{ top: 10, right: 20, bottom: 50, left: 50 }}
          padding={0.15}
          axisBottom={{
            tickSize: 0,
            tickPadding: 8,
            tickRotation: -30,
            legend: field.name,
            legendPosition: 'middle' as const,
            legendOffset: 42,
          }}
          axisLeft={{
            tickSize: 0,
            tickPadding: 8,
            legend: 'count',
            legendPosition: 'middle' as const,
            legendOffset: -40,
          }}
          enableLabel={false}
          enableGridY={true}
          borderRadius={2}
          tooltip={({ indexValue, value }) => (
            <div className="viz-tooltip">
              {field.name} ≈ {indexValue}: <strong>{value}</strong> agents
            </div>
          )}
        />
      </div>
    </div>
  )
}
