export function IconEditModal({
  editingIcon,
  editingLabel,
  onLabelChange,
  onSave,
  onClose,
}: {
  editingIcon: { key: string; label: string }
  editingLabel: string
  onLabelChange: (label: string) => void
  onSave: (key: string, label: string) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="geo-card w-full max-w-xs p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-ink">아이콘 이름 수정</h2>
          <button onClick={onClose} className="text-ink-muted hover:text-ink">✕</button>
        </div>
        <div className="space-y-3">
          <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">아이콘 이름</label>
          <input
            type="text"
            value={editingLabel}
            onChange={e => onLabelChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onSave(editingIcon.key, editingLabel) }}
            className="w-full rounded-lg border border-line bg-surface-subtle px-3 py-2 text-sm text-ink outline-none focus:border-brand/50"
            autoFocus
          />
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-sub">취소</button>
          <button onClick={() => onSave(editingIcon.key, editingLabel)} disabled={!editingLabel.trim()} className="flex-1 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50">저장</button>
        </div>
      </div>
    </div>
  )
}
