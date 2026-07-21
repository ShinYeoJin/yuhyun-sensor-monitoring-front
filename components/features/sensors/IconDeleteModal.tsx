export function IconDeleteModal({
  icons,
  onDelete,
  onClose,
}: {
  icons: { key: string; label: string; x: number; y: number }[]
  onDelete: (key: string) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="geo-card w-full max-w-xs p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-ink">센서 아이콘 삭제</h2>
          <button onClick={onClose} className="text-ink-muted hover:text-ink">✕</button>
        </div>
        <p className="font-mono text-[11px] text-ink-muted mb-3">삭제할 아이콘을 선택하세요.</p>
        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {icons.map(icon => (
            <div key={icon.key} className="flex items-center justify-between rounded-lg border border-line bg-surface-subtle px-3 py-2">
              <span className="font-mono text-[11px] text-ink">{icon.label}</span>
              <button
                onClick={() => { onDelete(icon.key); onClose() }}
                className="rounded-md border border-red-400/30 bg-red-400/10 px-2.5 py-1 font-mono text-[10px] text-red-400 hover:bg-red-400/20">
                삭제
              </button>
            </div>
          ))}
          {icons.length === 0 && (
            <p className="py-4 text-center font-mono text-[11px] text-ink-muted">등록된 아이콘이 없습니다.</p>
          )}
        </div>
        <button onClick={onClose} className="mt-4 w-full rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-sub hover:bg-surface-subtle">닫기</button>
      </div>
    </div>
  )
}
