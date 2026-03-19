import type { SensorStatus, AlarmSeverity } from '@/types'

// ─── 센서 상태 뱃지 ────────────────────────────────────────────────────────────
const statusConfig: Record<
  SensorStatus,
  { label: string; className: string; dotClass: string }
> = {
  normal: {
    label: '정상',
    className: 'bg-sensor-normalbg border-sensor-normalborder text-sensor-normaltext',
    dotClass: 'bg-sensor-normal',
  },
  warning: {
    label: '주의',
    className: 'bg-sensor-warningbg border-sensor-warningborder text-sensor-warningtext',
    dotClass: 'bg-sensor-warning',
  },
  danger: {
    label: '위험',
    className: 'bg-sensor-dangerbg border-sensor-dangerborder text-sensor-dangertext danger-flash',
    dotClass: 'bg-sensor-danger pulse-danger',
  },
  offline: {
    label: '오프라인',
    className: 'bg-sensor-offlinebg border-sensor-offlineborder text-sensor-offlinetext',
    dotClass: 'bg-sensor-offline',
  },
}

interface StatusBadgeProps {
  status: SensorStatus
  showDot?: boolean
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, showDot = true, size = 'md' }: StatusBadgeProps) {
  const cfg = statusConfig[status]
  const sizeClass = size === 'sm'
    ? 'px-2 py-0.5 text-[11px]'
    : 'px-2.5 py-1 text-xs'
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full border font-mono font-medium
        ${sizeClass} ${cfg.className}
      `}
    >
      {showDot && (
        <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dotClass}`} />
      )}
      {cfg.label}
    </span>
  )
}

// ─── 알람 심각도 뱃지 ──────────────────────────────────────────────────────────
const alarmConfig: Record<
  AlarmSeverity,
  { label: string; className: string }
> = {
  danger: {
    label: '위험',
    className: 'bg-sensor-dangerbg border-sensor-dangerborder text-sensor-dangertext',
  },
  warning: {
    label: '주의',
    className: 'bg-sensor-warningbg border-sensor-warningborder text-sensor-warningtext',
  },
  info: {
    label: '정보',
    className: 'bg-alarm-infobg border-alarm-infoborder text-alarm-infotext',
  },
  resolved: {
    label: '해제',
    className: 'bg-sensor-normalbg border-sensor-normalborder text-sensor-normaltext opacity-70',
  },
}

interface AlarmBadgeProps {
  severity: AlarmSeverity
}

export function AlarmBadge({ severity }: AlarmBadgeProps) {
  const cfg = alarmConfig[severity]
  return (
    <span
      className={`
        inline-flex items-center rounded-full border
        px-2.5 py-1 font-mono text-[11px] font-medium
        ${cfg.className}
      `}
    >
      {cfg.label}
    </span>
  )
}

// ─── 배터리 표시 ───────────────────────────────────────────────────────────────
export function BatteryIndicator({ level }: { level: number }) {
  const fillClass =
    level > 60 ? 'bg-sensor-normal' :
    level > 30 ? 'bg-sensor-warning' :
                 'bg-sensor-danger'

  const textClass =
    level < 20 ? 'text-sensor-dangertext' : 'text-ink-muted'

  return (
    <div className="flex items-center gap-2">
      <div className="relative h-2.5 w-14 overflow-hidden rounded-sm border border-line-strong bg-surface-subtle">
        <div
          className={`absolute left-0 top-0 h-full rounded-sm transition-all ${fillClass}`}
          style={{ width: `${Math.max(level, 0)}%` }}
        />
      </div>
      <span className={`font-mono text-[10px] font-medium ${textClass}`}>
        {level}%
      </span>
    </div>
  )
}
