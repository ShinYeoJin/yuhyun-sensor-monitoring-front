import { useState } from 'react'

export function AddSensorModal({ siteCode, allSensors, onClose, onSave }: { siteCode: string; allSensors: any[]; onClose: () => void; onSave: (ids: number[]) => void }) {
  const [selected, setSelected] = useState<number[]>([])
  const currentIds = allSensors.filter(s => s.site_code === siteCode).map(s => s.id)
  const available = allSensors.filter(s => !s.site_code || s.site_code === siteCode)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-surface-card p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-semibold text-ink">센서 추가</h2><button onClick={onClose} className="text-ink-muted hover:text-ink text-lg">×</button></div>
        <div className="max-h-64 overflow-y-auto space-y-1 border border-line rounded-lg p-2">
          {available.length === 0 ? <p className="px-3 py-4 text-center font-mono text-[11px] text-ink-muted">추가 가능한 센서가 없습니다.</p>
            : available.map((s: any) => { const isAlready = currentIds.includes(s.id); return (<label key={s.id} className={['flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer transition-colors', isAlready ? 'opacity-50 cursor-default' : 'hover:bg-surface-subtle'].join(' ')}><input type="checkbox" checked={selected.includes(s.id) || isAlready} disabled={isAlready} onChange={() => !isAlready && setSelected(prev => prev.includes(s.id) ? prev.filter(i => i !== s.id) : [...prev, s.id])} className="rounded border-line" /><div><p className="text-sm font-medium text-ink">{s.name}</p><p className="font-mono text-[10px] text-ink-muted">{s.sensor_type || '—'} {isAlready ? '(이미 등록됨)' : ''}</p></div></label>) })}
        </div>
        <div className="flex gap-2 mt-4"><button onClick={onClose} className="flex-1 rounded-lg border border-line py-2 font-mono text-sm text-ink-muted hover:bg-surface-subtle">취소</button><button onClick={() => onSave(selected)} disabled={selected.length === 0} className="flex-1 rounded-lg bg-brand py-2 font-mono text-sm text-white disabled:opacity-40 hover:bg-brand/90">추가</button></div>
      </div>
    </div>
  )
}
