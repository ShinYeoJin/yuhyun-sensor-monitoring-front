export function MeasurementSummaryCards({
  latestValue,
  initValue,
  minValue,
  maxValue,
  sensorStatus,
  sensorUnit,
  globalInitReading,
}: {
  latestValue: any
  initValue: number
  minValue: number | null
  maxValue: number | null
  sensorStatus: string
  sensorUnit: string
  globalInitReading: any
}) {
  const cards = [
    { label: '기간 내 최신값', value: latestValue, showChange: true },
    { label: '초기측정값', value: initValue },
    { label: '최솟값', value: minValue },
    { label: '최댓값', value: maxValue },
  ]
  return (
    <div className="shrink-0 grid grid-cols-4 gap-1.5 px-3 py-2 border-b border-line">
      {cards.map(({ label, value, showChange }) => {
        const numVal = value !== null && value !== undefined ? Number(value) : null
        const changeVal = showChange && numVal !== null && globalInitReading !== null ? parseFloat((numVal - initValue).toFixed(2)) : null
        return (
          <div key={label} className="relative rounded-lg border border-line bg-surface-subtle px-2 py-1.5 text-center">
            <p className="font-mono text-[9px] text-ink-muted">{label}</p>
            <p className={`font-mono text-sm font-semibold mt-0.5 ${sensorStatus === 'danger' ? 'text-sensor-danger' : sensorStatus === 'warning' ? 'text-sensor-warning' : 'text-sensor-normal'}`}>
              {numVal !== null ? numVal.toFixed(2) : '—'}<span className="text-[10px] text-ink-muted ml-0.5">{sensorUnit}</span>
            </p>
            {changeVal !== null && (
              <span className={`absolute top-1 right-1 text-[8px] font-mono font-semibold px-1.5 py-0.5 rounded-full leading-none ${changeVal > 0 ? 'bg-red-100 text-red-600' : changeVal < 0 ? 'bg-blue-100 text-blue-600' : 'bg-surface-subtle text-ink-muted'}`}>
                {changeVal > 0 ? `↑${changeVal.toFixed(2)}` : changeVal < 0 ? `↓${Math.abs(changeVal).toFixed(2)}` : '0.00'}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
