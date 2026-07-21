export function IconAddModal({
  siteSensors,
  allSensors,
  addIconSensor,
  addIconDepth,
  onSensorChange,
  onDepthChange,
  onAdd,
  onClose,
}: {
  siteSensors: any[]
  allSensors: any[]
  addIconSensor: string
  addIconDepth: string
  onSensorChange: (v: string) => void
  onDepthChange: (v: string) => void
  onAdd: () => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="geo-card w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-ink">센서 아이콘 추가</h2>
          <button onClick={onClose} className="text-ink-muted hover:text-ink">✕</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">센서 선택</label>
            <select value={addIconSensor} onChange={e => onSensorChange(e.target.value)} className="w-full rounded-lg border border-line bg-surface-subtle px-3 py-2 text-sm text-ink outline-none focus:border-brand/50">
              <option value="">센서를 선택하세요</option>
              {siteSensors.map((s: any) => (<option key={s.id} value={String(s.id)}>{s.name || s.id}</option>))}
            </select>
          </div>
          {addIconSensor && allSensors.find((s: any) => String(s.id) === addIconSensor)?.sensor_code === '80053' && (
            <div>
              <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Depth 선택</label>
              <div className="flex gap-2">
                {(['1', '2', '3'] as const).map(d => (
                  <button key={d} onClick={() => onDepthChange(d)} className={['flex-1 rounded-md border py-1.5 font-mono text-[11px]', addIconDepth === d ? 'border-brand/30 bg-brand/10 text-brand' : 'border-line text-ink-muted hover:bg-surface-subtle'].join(' ')}>{d}번</button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-sub">취소</button>
          <button onClick={onAdd} disabled={!addIconSensor} className="flex-1 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50">추가</button>
        </div>
      </div>
    </div>
  )
}
