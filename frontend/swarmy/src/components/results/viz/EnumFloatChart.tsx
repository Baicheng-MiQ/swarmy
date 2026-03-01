import { useMemo } from 'react'
import { ResponsiveBar } from '@nivo/bar'
import { NIVO_DARK_THEME, VIZ_COLORS } from './nivoTheme'
import type { ParsedAgentRow, VizField } from './schemaIntrospect'

interface EnumFloatChartProps {
  enumField: VizField
  floatField: VizField
  rows: ParsedAgentRow[]
}

/**
 * Weighted vote: weight each enum vote by a float field value.
 * Shows raw count vs weighted count side by side.
 */
export function EnumFloatChart({ enumField, floatField, rows }: EnumFloatChartProps) {
  const { barData, keys } = useMemo(() => {
    const rawCounts: Record<string, number> = {}
    const weightedCounts: Record<string, number> = {}

    for (const r of rows) {
      const cat = String(r.data[enumField.name] ?? '')
      const weight = typeof r.data[floatField.name] === 'number'
        ? (r.data[floatField.name] as number)
        : 1

      rawCounts[cat] = (rawCounts[cat] ?? 0) + 1
      weightedCounts[cat] = (weightedCounts[cat] ?? 0) + weight
    }

    const keys = Object.keys(rawCounts).sort()
    const barData = keys.map((k) => ({
      category: k,
      'Raw count': rawCounts[k],
      [`Weighted (by ${floatField.name})`]: Math.round(weightedCounts[k] * 100) / 100,
    }))

    return { barData, keys: ['Raw count', `Weighted (by ${floatField.name})`] }
  }, [rows, enumField.name, floatField.name])

  // Per-category mean of the float field
  const meanByCategory = useMemo(() => {
    const sums: Record<string, { total: number; n: number }> = {}
    for (const r of rows) {
      const cat = String(r.data[enumField.name] ?? '')
      const val = typeof r.data[floatField.name] === 'number'
        ? (r.data[floatField.name] as number)
        : null
      if (val === null) continue
      if (!sums[cat]) sums[cat] = { total: 0, n: 0 }
      sums[cat].total += val
      sums[cat].n++
    }
    return Object.entries(sums)
      .map(([cat, { total, n }]) => ({ category: cat, mean: total / n }))
      .sort((a, b) => b.mean - a.mean)
  }, [rows, enumField.name, floatField.name])

  return (
    <div className="viz-field-card">
      <div className="viz-field-header">
        <span className="viz-field-name">
          {enumField.name} × {floatField.name}
        </span>
        <span className="viz-field-desc">Weighted vote &amp; conviction breakdown</span>
      </div>

      {/* Mean float per category */}
      <div className="viz-stat-row">
        {meanByCategory.map((m) => (
          <div className="viz-stat" key={m.category}>
            <span className="viz-stat-value">{m.mean.toFixed(2)}</span>
            <span className="viz-stat-label">
              Mean {floatField.name} ({m.category})
            </span>
          </div>
        ))}
      </div>

      {/* Side-by-side bar: raw vs weighted */}
      <div className="viz-chart-container viz-chart-wide">
        <ResponsiveBar
          data={barData}
          keys={keys}
          indexBy="category"
          theme={NIVO_DARK_THEME}
          colors={[VIZ_COLORS[0], VIZ_COLORS[3]]}
          margin={{ top: 10, right: 20, bottom: 50, left: 50 }}
          padding={0.25}
          groupMode="grouped"
          axisBottom={{
            tickSize: 0,
            tickPadding: 8,
            legend: enumField.name,
            legendPosition: 'middle' as const,
            legendOffset: 40,
          }}
          axisLeft={{
            tickSize: 0,
            tickPadding: 8,
          }}
          enableLabel={false}
          enableGridY={true}
          borderRadius={2}
          legends={[
            {
              dataFrom: 'keys',
              anchor: 'top-right',
              direction: 'column',
              translateX: 0,
              translateY: -5,
              itemWidth: 160,
              itemHeight: 18,
              itemTextColor: '#999',
              symbolSize: 10,
              symbolShape: 'circle',
            },
          ]}
          tooltip={({ id, value, indexValue }) => (
            <div className="viz-tooltip">
              {indexValue} — {id}: <strong>{value}</strong>
            </div>
          )}
        />
      </div>
    </div>
  )
}
