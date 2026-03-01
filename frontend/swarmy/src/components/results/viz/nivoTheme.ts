/** Shared Nivo theme matching the app's dark palette */
import type { PartialTheme } from '@nivo/theming'

export const NIVO_DARK_THEME: PartialTheme = {
  text: {
    fontSize: 11,
    fill: '#999999',       // --color-n-400
  },
  axis: {
    domain: { line: { stroke: '#3d3d3d', strokeWidth: 1 } },
    ticks: {
      line: { stroke: '#3d3d3d', strokeWidth: 1 },
      text: { fontSize: 10, fill: '#999999' },
    },
    legend: { text: { fontSize: 11, fill: '#cccccc' } },
  },
  grid: {
    line: { stroke: '#2a2a2a', strokeWidth: 1 },
  },
  legends: {
    text: { fontSize: 11, fill: '#999999' },
  },
  labels: {
    text: { fontSize: 11, fill: '#fafafa' },
  },
  tooltip: {
    container: {
      background: '#1a1a1a',
      color: '#fafafa',
      fontSize: 12,
      borderRadius: 4,
      border: '1px solid #3d3d3d',
      boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    },
  },
}

/**
 * Categorical color palette — 9 distinguishable hues for dark backgrounds.
 * Ordered so adjacent categories contrast well.
 */
export const VIZ_COLORS = [
  '#60a5fa', // blue
  '#f87171', // red
  '#4ade80', // green
  '#fbbf24', // amber
  '#c084fc', // purple
  '#fb923c', // orange
  '#2dd4bf', // teal
  '#f472b6', // pink
  '#818cf8', // indigo
]
