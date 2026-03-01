import { useMemo } from 'react'
import { ResponsivePie } from '@nivo/pie'
import { NIVO_DARK_THEME, VIZ_COLORS } from '../results/viz/nivoTheme'
import type { AgentConfig, Model } from '../../types'

interface ModelDistributionProps {
  agents: AgentConfig[]
  models: Model[]
}

export function ModelDistribution({ agents, models }: ModelDistributionProps) {
  const data = useMemo(() => {
    const counts = new Map<string, number>()
    for (const a of agents) {
      counts.set(a.model_name, (counts.get(a.model_name) ?? 0) + 1)
    }

    const modelNameMap = new Map(models.map((m) => [m.id, m.name]))

    return Array.from(counts.entries())
      .map(([id, value]) => ({
        id: modelNameMap.get(id) ?? id,
        label: modelNameMap.get(id) ?? id,
        value,
      }))
      .sort((a, b) => b.value - a.value)
  }, [agents, models])

  if (data.length === 0) return null

  return (
    <div className="model-distribution">
      <div className="model-distribution-chart">
        <ResponsivePie
          data={data}
          theme={NIVO_DARK_THEME}
          colors={VIZ_COLORS}
          margin={{ top: 20, right: 120, bottom: 20, left: 20 }}
          innerRadius={0.55}
          padAngle={1}
          cornerRadius={2}
          activeOuterRadiusOffset={4}
          borderWidth={0}
          enableArcLabels={false}
          arcLinkLabelsSkipAngle={10}
          arcLinkLabelsTextColor="#999"
          arcLinkLabelsThickness={1}
          arcLinkLabelsColor={{ from: 'color' }}
          legends={[
            {
              anchor: 'right',
              direction: 'column',
              translateX: 100,
              itemWidth: 90,
              itemHeight: 18,
              itemTextColor: '#999',
              symbolSize: 8,
              symbolShape: 'circle',
            },
          ]}
        />
      </div>
    </div>
  )
}
