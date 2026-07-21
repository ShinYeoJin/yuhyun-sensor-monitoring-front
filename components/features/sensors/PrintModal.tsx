export function PrintModal({
  sensor,
  iconLabel,
  dateFrom,
  dateTo,
  onClose,
  onExcel,
  onPdf,
}: {
  sensor: any
  iconLabel: string
  dateFrom: string
  dateTo: string
  onClose: () => void
  onExcel: () => void
  onPdf: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="geo-card w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-ink">출력 설정</h2>
          <button onClick={onClose} className="text-ink-muted hover:text-ink">✕</button>
        </div>
        <div className="rounded-xl border border-line bg-surface-subtle p-3 text-xs text-ink-muted space-y-1 mb-4">
          <p className="font-semibold text-ink">{sensor.siteName || '현장명 없음'}</p>
          <p>{iconLabel || sensor.manageNo} · {sensor.name}</p>
          <p>{dateFrom} ~ {dateTo}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-sub hover:border-line-strong">취소</button>
          <button onClick={() => { onClose(); onExcel() }} className="flex-1 rounded-lg bg-sensor-normal px-4 py-2 text-sm font-medium text-white hover:opacity-90">📊 Excel</button>
          <button onClick={() => { onClose(); onPdf() }} className="flex-1 rounded-lg bg-sensor-warning px-4 py-2 text-sm font-medium text-white hover:opacity-90">📄 PDF</button>
        </div>
      </div>
    </div>
  )
}
