'use client'

type Props = {
  value: number | null
  lower: number | null
  upper: number | null
  unit?: string
  depthLabel?: string
  baseline?: number | null
}

export default function ThresholdGauge({ value, lower, upper, unit = '', depthLabel, baseline }: Props) {
  if (value == null || (lower == null && upper == null)) return null

  const hasLower = lower !== null
  const hasUpper = upper !== null
  const both = hasLower && hasUpper

  let domainMin: number, domainMax: number, normalLower: number, normalUpper: number
  if (both) {
    const span = Math.max(Math.abs(upper! - lower!), 0.0001)
    const pad = span * 0.3
    domainMin = lower! - pad
    domainMax = upper! + pad
    normalLower = lower!
    normalUpper = upper!
  } else if (hasLower) {
    const distance = Math.max(Math.abs(value - lower!), 0.5)
    domainMin = lower! - distance
    domainMax = Math.max(value, lower!) + distance
    normalLower = lower!
    normalUpper = domainMax
  } else {
    const distance = Math.max(Math.abs(value - upper!), 0.5)
    domainMin = Math.min(value, upper!) - distance
    domainMax = upper! + distance
    normalLower = domainMin
    normalUpper = upper!
  }

  const totalSpan = domainMax - domainMin
  const warnLeftWidth = both ? ((normalLower - domainMin) / totalSpan) * 100 : (hasUpper ? 0 : 0)
  const normalWidth = ((normalUpper - normalLower) / totalSpan) * 100
  const warnRightWidth = 100 - warnLeftWidth - normalWidth

  const rawPct = (value - domainMin) / totalSpan
  const pct = Math.max(0, Math.min(1, rawPct)) * 100
  const inNormal = (!hasLower || value >= lower!) && (!hasUpper || value <= upper!)
  const outOfDomain = rawPct < 0 || rawPct > 1
  const warnDir: 'low' | 'high' | null = inNormal ? null : (hasLower && value < lower!) ? 'low' : 'high'

  const diff = baseline != null ? Number((value - baseline).toFixed(4)) : null

  return (
    <div className="shrink-0 px-3 py-2 border-b border-line bg-surface-card">
      {/* 상단: 컨텍스트 + 상태 */}
      <div className="flex items-baseline justify-between mb-1.5">
        <div className="flex items-baseline gap-2">
          {depthLabel && <span className="font-mono text-[10px] text-ink-muted">{depthLabel}</span>}
          <span className="font-mono text-sm font-semibold tabular-nums">
            {value.toFixed(2)}<span className="text-[10px] text-ink-muted ml-0.5">{unit}</span>
          </span>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] border ${
            inNormal
              ? 'bg-sensor-normal/10 border-sensor-normal/30 text-sensor-normaltext'
              : 'bg-sensor-warning/10 border-sensor-warning/30 text-sensor-warningtext'
          }`}>
            <span className={`inline-block w-1 h-1 rounded-full ${inNormal ? 'bg-sensor-normal' : 'bg-sensor-warning'}`} />
            {inNormal ? '정상 범위' : warnDir === 'low' ? '경고 (하강)' : '경고 (상승)'}
          </span>
          {diff !== null && (
            <span className="font-mono text-[9px] text-ink-muted tabular-nums">
              초기 대비 {diff > 0 ? '↑' : diff < 0 ? '↓' : ''}{Math.abs(diff).toFixed(2)}{unit}
            </span>
          )}
        </div>
      </div>

      {/* 게이지 바 */}
      <div className="relative pt-4 pb-4">
        {/* 상단 임계값 tick */}
        <div className="absolute top-0 left-0 right-0 h-3 font-mono text-[9px] text-ink-muted">
          {hasLower && (
            <span
              className="absolute tabular-nums"
              style={{ left: `${((lower! - domainMin) / totalSpan) * 100}%`, transform: 'translateX(-50%)' }}
            >
              {lower!.toFixed(2)}
            </span>
          )}
          {hasUpper && (
            <span
              className="absolute tabular-nums"
              style={{ left: `${((upper! - domainMin) / totalSpan) * 100}%`, transform: 'translateX(-50%)' }}
            >
              {upper!.toFixed(2)}
            </span>
          )}
        </div>

        {/* 세그먼트 */}
        <div className="flex h-2.5 rounded-full overflow-hidden border border-line/60">
          {warnLeftWidth > 0 && <div className="bg-sensor-warning/60" style={{ width: `${warnLeftWidth}%` }} />}
          {normalWidth > 0 && <div className="bg-sensor-normal/70" style={{ width: `${normalWidth}%` }} />}
          {warnRightWidth > 0 && <div className="bg-sensor-warning/60" style={{ width: `${warnRightWidth}%` }} />}
        </div>

        {/* 포인터 */}
        <div className="absolute" style={{ left: `${pct}%`, top: '16px' }}>
          <div className="-translate-x-1/2 flex flex-col items-center">
            <div className={`w-0.5 h-3 ${!inNormal ? 'bg-sensor-warning' : 'bg-ink'}`} />
            <div className={`rounded px-1 py-0 font-mono text-[8px] tabular-nums whitespace-nowrap -mt-px ${
              !inNormal ? 'bg-sensor-warning text-white' : 'bg-ink text-white'
            }`}>
              {outOfDomain && (warnDir === 'low' ? '◀ ' : '')}{value.toFixed(2)}{unit}{outOfDomain && (warnDir === 'high' ? ' ▶' : '')}
            </div>
          </div>
        </div>

        {/* 하단 영역 라벨 */}
        <div className="absolute bottom-0 left-0 right-0 h-3 font-mono text-[9px]">
          {warnLeftWidth > 0 && (
            <span
              className="absolute text-sensor-warningtext font-medium"
              style={{ left: `${warnLeftWidth / 2}%`, transform: 'translateX(-50%)' }}
            >
              경고
            </span>
          )}
          {normalWidth > 0 && (
            <span
              className="absolute text-sensor-normaltext font-medium"
              style={{ left: `${warnLeftWidth + normalWidth / 2}%`, transform: 'translateX(-50%)' }}
            >
              정상
            </span>
          )}
          {warnRightWidth > 0 && (
            <span
              className="absolute text-sensor-warningtext font-medium"
              style={{ left: `${warnLeftWidth + normalWidth + warnRightWidth / 2}%`, transform: 'translateX(-50%)' }}
            >
              경고
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
