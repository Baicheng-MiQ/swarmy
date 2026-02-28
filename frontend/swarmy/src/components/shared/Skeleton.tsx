interface SkeletonProps {
  width?: string | number
  height?: string | number
  style?: React.CSSProperties
}

export function Skeleton({ width = '100%', height = 14, style }: SkeletonProps) {
  return <div className="skeleton" style={{ width, height, ...style }} />
}
