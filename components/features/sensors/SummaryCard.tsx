export function SummaryCard({
  pos,
  minimized,
  onMouseDown,
  onToggleMinimize,
  curVal,
  maxVal,
  minVal,
  initValue,
  globalInitReading,
  sensorUnit,
  sensorCode,
}: {
  pos: { x: number; y: number }
  minimized: boolean
  onMouseDown: (e: React.MouseEvent) => void
  onToggleMinimize: () => void
  curVal: number | null
  maxVal: number | null
  minVal: number | null
  initValue: number
  globalInitReading: any
  sensorUnit: string
  sensorCode: string
}) {
  const diff = (curVal != null && globalInitReading !== null) ? parseFloat((curVal - initValue).toFixed(4)) : null

  return (
    <div
      style={{ position: 'absolute', left: pos.x, top: pos.y, zIndex: 10, cursor: 'grab', userSelect: 'none' }}
      onMouseDown={onMouseDown}
      className={`rounded-xl border border-line bg-surface-card/90 backdrop-blur-sm px-3 py-2 shadow-lg ${minimized ? '' : 'min-w-[200px]'}`}
    >
      <div className={`relative ${minimized ? '' : 'mb-2.5 border-b border-line/50 pt-2.5 pb-3'}`}>
        <p className="font-mono text-[11px] text-ink-muted font-semibold text-center pr-7">📊 실시간 요약</p>
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={onToggleMinimize}
          className="absolute right-0 top-1/2 -translate-y-1/2 font-mono text-[13px] font-bold text-ink leading-none w-6 h-6 flex items-center justify-center cursor-pointer rounded-md border border-line bg-white shadow-sm hover:bg-ink hover:text-white hover:border-ink transition-colors"
          title={minimized ? '펼치기' : '최소화'}
        >
          {minimized ? '+' : '−'}
        </button>
      </div>
      {!minimized && (<>
        {[
          { label: '현재값', value: curVal },
          { label: '최댓값', value: maxVal },
          { label: '최솟값', value: minVal },
          { label: '기준값', value: globalInitReading !== null ? initValue : null },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between items-center gap-3 py-0.5">
            <span className="font-mono text-[11px] text-ink-muted">{label}</span>
            <span className="font-mono text-[12px] font-medium text-ink">{value != null ? `${Number(value).toFixed(4)} ${sensorUnit}` : '—'}</span>
          </div>
        ))}
        {diff != null && (
          <div className={`mt-2 rounded-lg px-2 py-1.5 border ${diff > 0 ? 'bg-red-50 border-red-200' : diff < 0 ? 'bg-blue-50 border-blue-200' : 'bg-surface-subtle border-line'}`}>
            <p className="font-mono text-[10px] text-ink-muted mb-1">기준값 대비 변화량</p>
            <div className="flex items-center justify-between gap-2">
              <span className={`font-mono text-lg font-bold ${diff > 0 ? 'text-red-500' : diff < 0 ? 'text-blue-500' : 'text-ink'}`}>
                {diff > 0 ? `↑ ${Math.abs(diff).toFixed(4)}` : diff < 0 ? `↓ ${Math.abs(diff).toFixed(4)}` : '0.0000'}{sensorUnit}
              </span>
              <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-full ${diff > 0 ? 'bg-red-100 text-red-600' : diff < 0 ? 'bg-blue-100 text-blue-600' : 'bg-surface-subtle text-ink-muted'}`}>
                {sensorCode === '80053' ? (diff > 0 ? '수위 상승' : diff < 0 ? '수위 하강' : '변화 없음') : (diff > 0 ? '상승' : diff < 0 ? '하강' : '변화 없음')}
              </span>
            </div>
          </div>
        )}
      </>)}
    </div>
  )
}
