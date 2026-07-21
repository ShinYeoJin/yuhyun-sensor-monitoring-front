export function RemoveSensorModal({ siteSensors, onClose, onRemove }: { siteSensors: any[]; onClose: () => void; onRemove: (id: number) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-surface-card p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-semibold text-ink">센서 삭제</h2><button onClick={onClose} className="text-ink-muted hover:text-ink text-lg">×</button></div>
        <p className="font-mono text-[11px] text-ink-muted mb-3">이 현장에서 제거할 센서를 선택하세요.</p>
        <div className="max-h-64 overflow-y-auto space-y-1 border border-line rounded-lg p-2">
          {siteSensors.length === 0 ? <p className="px-3 py-4 text-center font-mono text-[11px] text-ink-muted">등록된 센서가 없습니다.</p>
            : siteSensors.map((s: any) => (<div key={s.id} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-surface-subtle"><div><p className="text-sm font-medium text-ink">{s.name}</p><p className="font-mono text-[10px] text-ink-muted">{s.sensor_type || '—'}</p></div><button onClick={() => onRemove(s.id)} className="rounded-md border border-red-200 px-2.5 py-1 font-mono text-[10px] text-red-400 hover:bg-red-50">제거</button></div>))}
        </div>
        <button onClick={onClose} className="mt-4 w-full rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-sub hover:bg-surface-subtle">닫기</button>
      </div>
    </div>
  )
}
