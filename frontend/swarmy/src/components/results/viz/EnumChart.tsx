import { useMemo } from 'react'
import { ResponsivePie } from '@nivo/pie'
import { ResponsiveBar } from '@nivo/bar'
import { NIVO_DARK_THEME, VIZ_COLORS } from './nivoTheme'
import type { ParsedAgentRow, VizField } from './schemaIntrospect'
import { countField, groupedEnumCounts } from './schemaIntrospect'

interface EnumChartProps {
  field: VizField
  rows: ParsedAgentRow[]
}

export function EnumChart({ field, rows }: EnumChartProps) {
  const counts = useMemo(() => countField(rows, field.name), [rows, field.name])
  const total = rows.length

  // Donut data
  const pieData = useMemo(
    () =>
      Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([id, value]) => ({ id, label: id, value })),
    [counts],
  )

  // Grouped bar by model
  const modelData = useMemo(() => {
    const grouped = groupedEnumCounts(rows, field.name, 'model')
    return Object.entries(grouped).map(([model, vals]) => ({ model, ...vals }))
  }, [rows, field.name])

  const barKeys = useMemo(
    () => field.enumValues ?? Object.keys(counts),
    [field.enumValues, counts],
  )

  // Find majority
  const majority = pieData[0]

  return (
    <div className="viz-field-card">
      <div className="viz-field-header">
        <span className="viz-field-name">{field.name}</span>
        {field.description && (
          <span className="viz-field-desc">{field.description}</span>
        )}
      </div>

      {/* Stat block */}
      {majority && (
        <div className="viz-stat-row">
          <div className="viz-stat">
            <span className="viz-stat-value">{majority.id}</span>
            <span className="viz-stat-label">Majority</span>
          </div>
          <div className="viz-stat">
            <span className="viz-stat-value">
              {Math.round((majority.value / total) * 100)}%
            </span>
            <span className="viz-stat-label">Agreement</span>
          </div>
          <div className="viz-stat">
            <span className="viz-stat-value">{pieData.length}</span>
            <span className="viz-stat-label">Unique values</span>
          </div>
        </div>
      )}

      <div className="viz-chart-row">
        {/* Donut */}
        <div className="viz-chart-container viz-chart-sm">
          <ResponsivePie
            data={pieData}
            theme={NIVO_DARK_THEME}
            colors={VIZ_COLORS}
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            innerRadius={0.55}
            padAngle={1.5}
            cornerRadius={3}
            activeOuterRadiusOffset={4}
            borderWidth={0}
            enableArcLinkLabels={pieData.length <= 6}
            arcLinkLabelsSkipAngle={15}
            arcLinkLabelsTextColor="#999"
            arcLinkLabelsThickness={1}
            arcLinkLabelsColor={{ from: 'color' }}
            arcLabelsSkipAngle={20}
            arcLabelsTextColor="#fafafa"
          />
        </div>

        {/* Grouped bar by model */}
        {modelData.length > 1 && (
          <div className="viz-chart-container viz-chart-md">
            <ResponsiveBar
              data={modelData}
              keys={barKeys}
              indexBy="model"
              theme={NIVO_DARK_THEME}
              colors={VIZ_COLORS}
              margin={{ top: 10, right: 20, bottom: 50, left: 50 }}
              padding={0.25}
              groupMode="grouped"
              layout="vertical"
              axisBottom={{
                tickSize: 0,
                tickPadding: 8,
                tickRotation: -30,
              }}
              axisLeft={{
                tickSize: 0,
                tickPadding: 8,
              }}
              enableLabel={false}
              enableGridY={true}
              borderRadius={2}
              tooltip={({ id, value, indexValue }) => (
                <div className="viz-tooltip">
                  <strong>{indexValue}</strong>: {id} = {value}
                </div>
              )}
            />
          </div>
        )}
      </div>
    </div>
  )
}
