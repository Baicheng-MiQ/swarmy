import { useMemo } from 'react'
import { ResponsiveHeatMap } from '@nivo/heatmap'
import { NIVO_DARK_THEME } from './nivoTheme'
import type { ParsedAgentRow, VizField } from './schemaIntrospect'
import { crossTab } from './schemaIntrospect'

interface CrossFieldChartProps {
  field1: VizField
  field2: VizField
  rows: ParsedAgentRow[]
}

export function CrossFieldChart({ field1, field2, rows }: CrossFieldChartProps) {
  const { heatData, maxVal } = useMemo(() => {
    const { keys1, keys2, matrix } = crossTab(rows, field1.name, field2.name)
    let maxVal = 0

    const heatData = keys1.map((k1, i) => {
      const row: Record<string, unknown> = { id: k1 }
      const data = keys2.map((k2, j) => {
        const v = matrix[i][j]
        if (v > maxVal) maxVal = v
        return { x: k2, y: v }
      })
      row.data = data
      return row as { id: string; data: { x: string; y: number }[] }
    })

    return { heatData, maxVal }
  }, [rows, field1.name, field2.name])

  if (heatData.length === 0) return null

  return (
    <div className="viz-field-card">
      <div className="viz-field-header">
        <span className="viz-field-name">
          {field1.name} × {field2.name}
        </span>
        <span className="viz-field-desc">Cross-field correlation</span>
      </div>

      <div className="viz-chart-container viz-chart-wide">
        <ResponsiveHeatMap
          data={heatData}
          theme={NIVO_DARK_THEME}
          margin={{ top: 40, right: 30, bottom: 50, left: 90 }}
          axisTop={{
            tickSize: 0,
            tickPadding: 8,
            legend: field2.name,
            legendPosition: 'middle' as const,
            legendOffset: -30,
          }}
          axisLeft={{
            tickSize: 0,
            tickPadding: 8,
            legend: field1.name,
            legendPosition: 'middle' as const,
            legendOffset: -75,
          }}
          colors={{
            type: 'sequential',
            scheme: 'blues',
            minValue: 0,
            maxValue: maxVal || 1,
          }}
          emptyColor="#1a1a1a"
          borderColor="#2a2a2a"
          borderWidth={1}
          borderRadius={2}
          labelTextColor={{ from: 'color', modifiers: [['brighter', 3]] }}
          hoverTarget="cell"
          tooltip={({ cell }) => (
            <div className="viz-tooltip">
              {field1.name}=<strong>{cell.serieId}</strong>,{' '}
              {field2.name}=<strong>{cell.data.x}</strong>
              : {cell.formattedValue}
            </div>
          )}
        />
      </div>
    </div>
  )
}
