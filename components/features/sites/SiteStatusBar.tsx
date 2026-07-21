export function SiteStatusBar({ normal, warning, danger, total }: { normal: number; warning: number; danger: number; total: number }) {
  if (total === 0) return <div className="mt-2 h-1.5 rounded-full bg-surface-muted" />
  return (
    <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-surface-muted">
      <div className="bg-sensor-normal  transition-all" style={{ width: `${(normal  / total) * 100}%` }} />
      <div className="bg-sensor-warning transition-all" style={{ width: `${(warning / total) * 100}%` }} />
      <div className="bg-sensor-danger  transition-all" style={{ width: `${(danger  / total) * 100}%` }} />
    </div>
  )
}
