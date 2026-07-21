export function SensorIcon({ icon, isSelected, status, onMouseDown, onClick }: {
  icon: { key: string; label: string; x: number; y: number }
  isSelected: boolean; status: string
  onMouseDown: (e: React.MouseEvent) => void; onClick: () => void
}) {
  const color = status === 'danger' ? '#ef4444' : status === 'warning' ? '#f97316' : '#22c55e'
  return (
    <div onMouseDown={onMouseDown} onClick={onClick}
      style={{ position: 'absolute', left: `${icon.x * 100}%`, top: `${icon.y * 100}%`, transform: 'translate(-50%, -50%)', zIndex: isSelected ? 20 : 10, cursor: 'grab', userSelect: 'none' }}>
      <div style={{ background: color, border: isSelected ? '2px solid #fff' : '1.5px solid rgba(255,255,255,0.7)', borderRadius: 6, padding: '3px 8px', boxShadow: '0 2px 8px rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', gap: 5, minWidth: 70 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: status === 'danger' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.8)', display: 'inline-block', animation: status === 'danger' ? 'pulse 1.2s infinite' : 'none' }} />
        <span style={{ color: '#fff', fontSize: 11, fontWeight: 600, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{icon.label}</span>
      </div>
    </div>
  )
}
