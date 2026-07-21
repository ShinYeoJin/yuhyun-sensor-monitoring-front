export function DeleteSiteModal({ deleteTarget, onClose, onDelete }: {
  deleteTarget: any
  onClose: () => void
  onDelete: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm" onClick={onClose}>
      <div className="geo-card w-full max-w-sm animate-fade-in-up p-6 text-center" onClick={e => e.stopPropagation()}>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sensor-dangerbg text-xl text-sensor-danger">⚠</div>
        <h3 className="text-sm font-semibold text-ink">{deleteTarget.name}을(를) 삭제하시겠습니까?</h3>
        <p className="mt-1.5 text-xs text-ink-muted">삭제된 현장 정보는 복구할 수 없습니다.</p>
        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-sub hover:bg-surface-subtle">취소</button>
          <button onClick={onDelete} className="flex-1 rounded-lg bg-sensor-danger px-4 py-2 text-sm font-medium text-white hover:opacity-90">삭제</button>
        </div>
      </div>
    </div>
  )
}
