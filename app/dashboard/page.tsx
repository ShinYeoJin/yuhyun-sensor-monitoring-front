'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getRelativeTime } from '@/lib/mock-data'
import { mockSites } from '@/lib/mock-data'
import { useSensorStore } from '@/lib/sensor-store'
import { StatusBadge, AlarmBadge } from '@/components/ui/StatusBadge'
import { useMemo, useEffect, useState } from 'react'
import type { Site, UnifiedSensor, SensorStatus } from '@/types'
import { startSimulator, stopSimulator, tickOnce } from '@/lib/sensor-simulator'
import { getThresholds } from '@/lib/mock-data'

// ─── KPI 카드 ─────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, topBarClass, valueClass, cardClass = '',
  active, onClick,
}: {
  label: string; value: number; sub?: string
  topBarClass: string; valueClass: string; cardClass?: string
  active?: boolean; onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'relative overflow-hidden rounded-xl border bg-surface-card shadow-card text-left w-full transition-all duration-200',
        active
          ? 'border-brand ring-2 ring-brand/20 shadow-cardhover'
          : 'border-line hover:shadow-cardhover hover:border-line-strong',
        cardClass,
      ].join(' ')}
    >
      <div className={`h-0.5 w-full ${topBarClass}`} />
      <div className="px-4 pb-4 pt-3">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[1.2px] text-ink-muted">{label}</p>
        <p className={`mt-1 font-mono text-4xl font-light leading-none tracking-tight ${valueClass}`}>
          {String(value).padStart(2, '0')}
        </p>
        {sub && <p className="mt-2 border-t border-line pt-2 font-mono text-[10px] text-ink-muted">{sub}</p>}
        {active && (
          <span className="absolute right-2 top-2 font-mono text-[9px] text-brand">▼ 보기</span>
        )}
      </div>
    </button>
  )
}

// ─── 현장 카드 ────────────────────────────────────────────────────────────────
function SiteCard({ site, liveNormal, liveWarning, liveDanger, liveOffline, liveTotal }: {
  site: Site
  liveNormal: number; liveWarning: number; liveDanger: number
  liveOffline: number; liveTotal: number
}) {
  const total   = liveTotal || site.totalSensors
  const normal  = liveTotal ? liveNormal  : site.normalCount
  const warning = liveTotal ? liveWarning : site.warningCount
  const danger  = liveTotal ? liveDanger  : site.dangerCount
  const offline = liveTotal ? liveOffline : site.offlineCount

  const statusBadgeClass =
    danger  > 0 ? 'bg-sensor-dangerbg  border-sensor-dangerborder  text-sensor-dangertext'  :
    warning > 0 ? 'bg-sensor-warningbg border-sensor-warningborder text-sensor-warningtext' :
                  'bg-sensor-normalbg  border-sensor-normalborder  text-sensor-normaltext'
  const statusLabel = danger > 0 ? '위험' : warning > 0 ? '주의' : '정상'

  return (
    <Link href={`/sensors?site=${site.id}`}
      className="block rounded-xl border border-line bg-surface-card p-4 shadow-card transition-shadow hover:shadow-cardhover">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-ink">{site.name}</h3>
          <p className="text-xs text-ink-muted">{site.location}</p>
        </div>
        <span className={`shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 font-mono text-[11px] font-medium ${statusBadgeClass}`}>
          {statusLabel}
        </span>
      </div>
      <p className="mt-1.5 text-xs text-ink-sub">{site.description}</p>
      <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-surface-muted">
        <div className="bg-sensor-normal  transition-all" style={{ width: total ? `${(normal /total)*100}%` : '0%' }} />
        <div className="bg-sensor-warning transition-all" style={{ width: total ? `${(warning/total)*100}%` : '0%' }} />
        <div className="bg-sensor-danger  transition-all" style={{ width: total ? `${(danger /total)*100}%` : '0%' }} />
      </div>
      <div className="mt-2 flex flex-wrap gap-3 font-mono text-[11px]">
        <span className="text-sensor-normaltext">정상 {normal}</span>
        {warning > 0 && <span className="text-sensor-warningtext">주의 {warning}</span>}
        {danger  > 0 && <span className="text-sensor-dangertext">위험 {danger}</span>}
        {offline > 0 && <span className="text-ink-muted">오프라인 {offline}</span>}
        <span className="ml-auto text-ink-muted">총 {total}개</span>
      </div>
    </Link>
  )
}

// ─── KPI 필터 센서 목록 패널 ──────────────────────────────────────────────────
type KpiFilter = 'all' | 'normal' | 'warning' | 'danger' | 'alarm'

const kpiFilterLabel: Record<KpiFilter, string> = {
  all:     '전체 센서',
  normal:  '정상 센서',
  warning: '주의 센서',
  danger:  '위험 센서',
  alarm:   '활성 알람 센서',
}

const rowBg: Record<SensorStatus, string> = {
  danger:  'bg-sensor-dangerbg/30',
  warning: 'bg-sensor-warningbg/30',
  normal:  '',
  offline: 'opacity-60',
}

function KpiSensorPanel({
  filter, sensors, alarms, onClose,
}: {
  filter: KpiFilter
  sensors: UnifiedSensor[]
  alarms: ReturnType<typeof useSensorStore>['alarms']
  onClose: () => void
}) {
  // 알람 필터: 미처리 알람이 있는 센서들
  const alarmSensorIds = useMemo(() => {
    const ids = new Set<string>()
    alarms
      .filter(a => !a.isAcknowledged && a.severity !== 'resolved')
      .forEach(a => {
        // sensorId(manageNo) → 실제 id 매핑
        const sensor = sensors.find(s => s.manageNo === a.sensorId || s.id === a.sensorId)
        if (sensor) ids.add(sensor.id)
      })
    return ids
  }, [alarms, sensors])

  const filtered = useMemo(() => {
    switch (filter) {
      case 'all':     return sensors
      case 'normal':  return sensors.filter(s => s.status === 'normal')
      case 'warning': return sensors.filter(s => s.status === 'warning')
      case 'danger':  return sensors.filter(s => s.status === 'danger')
      case 'alarm':   return sensors.filter(s => alarmSensorIds.has(s.id))
      default:        return sensors
    }
  }, [filter, sensors, alarmSensorIds])

  return (
    <div className="animate-fade-in-up rounded-xl border border-brand/30 bg-surface-card shadow-cardhover overflow-hidden">
      {/* 패널 헤더 */}
      <div className="flex items-center justify-between border-b border-line bg-surface-subtle px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">{kpiFilterLabel[filter]}</h3>
          <p className="font-mono text-[10px] text-ink-muted">{filtered.length}개 센서</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/sensors"
            className="font-mono text-[11px] text-brand hover:underline">
            센서 관리 →
          </Link>
          <button onClick={onClose}
            className="rounded-md p-1 text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink">
            ✕
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-10 text-center font-mono text-sm text-ink-muted">
          해당하는 센서가 없습니다.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-subtle">
                {['관리번호 / 센서명', '현장', '현재값', '임계값', '상태'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-mono text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map(sensor => {
                const { thresholdWarning, thresholdDanger } = getThresholds(sensor)
                const hasActiveAlarm = alarmSensorIds.has(sensor.id)
                return (
                  <tr key={sensor.id}
                    onClick={() => window.location.href = `/sensors/${sensor.id}`}
                    className={`cursor-pointer transition-colors hover:bg-brand/5 active:bg-brand/10 ${rowBg[sensor.status]}`}>
                    <td className="px-4 py-3">
                      <p className="font-mono text-sm font-semibold text-brand">
                        {sensor.manageNo || sensor.id}
                      </p>
                      <p className="font-mono text-[10px] text-ink-muted">{sensor.name}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-sub">{sensor.siteName}</td>
                    <td className="px-4 py-3 font-mono text-sm font-medium text-ink">
                      {sensor.status === 'offline'
                        ? <span className="text-ink-muted">—</span>
                        : `${sensor.currentValue} ${sensor.unit}`}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px]">
                      <span className="text-sensor-warningtext">{thresholdWarning}</span>
                      <span className="text-ink-muted"> / </span>
                      <span className="text-sensor-dangertext">{thresholdDanger}</span>
                      <span className="ml-0.5 text-ink-muted">{sensor.unit}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={sensor.status} size="sm" />
                        {hasActiveAlarm && (
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-sensor-danger" />
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── 대시보드 페이지 ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { sensors, alarms } = useSensorStore()
  const [simRunning, setSimRunning] = useState(false)
  const [kpiFilter,  setKpiFilter]  = useState<KpiFilter | null>(null)

  useEffect(() => {
    startSimulator()
    setSimRunning(true)
    return () => stopSimulator()
  }, [])

  const normalCount  = sensors.filter(s => s.status === 'normal').length
  const warningCount = sensors.filter(s => s.status === 'warning').length
  const dangerCount  = sensors.filter(s => s.status === 'danger').length
  const offlineCount = sensors.filter(s => s.status === 'offline').length
  const totalSensors = sensors.length
  const activeAlarms = alarms.filter(a => !a.isAcknowledged && a.severity !== 'resolved').length
  const recentAlarms = alarms.slice(0, 5)
  const dangerSensors = sensors.filter(s => s.status === 'danger')

  const siteStats = useMemo(() => {
    return mockSites.map(site => {
      const ss = sensors.filter(s => s.siteId === site.id)
      return {
        site,
        liveNormal:  ss.filter(s => s.status === 'normal').length,
        liveWarning: ss.filter(s => s.status === 'warning').length,
        liveDanger:  ss.filter(s => s.status === 'danger').length,
        liveOffline: ss.filter(s => s.status === 'offline').length,
        liveTotal:   ss.length,
      }
    })
  }, [sensors])

  // KPI 카드 클릭 — 같은 카드 재클릭 시 닫힘
  const handleKpiClick = (f: KpiFilter) => {
    setKpiFilter(prev => prev === f ? null : f)
  }

  const kpiCards: { filter: KpiFilter; label: string; value: number; sub: string; topBar: string; valCls: string; cardCls?: string }[] = [
    { filter: 'all',     label: '전체 센서', value: totalSensors,  sub: `${mockSites.length}개 현장`,                                      topBar: 'bg-alarm-info',     valCls: 'text-alarm-info'     },
    { filter: 'normal',  label: '정상',       value: normalCount,   sub: totalSensors ? `${Math.round(normalCount/totalSensors*100)}%` : '—', topBar: 'bg-sensor-normal',  valCls: 'text-sensor-normal'  },
    { filter: 'warning', label: '주의',       value: warningCount,  sub: '확인 필요',                                                         topBar: 'bg-sensor-warning', valCls: 'text-sensor-warning' },
    { filter: 'danger',  label: '위험',       value: dangerCount,   sub: '즉시 조치',                                                         topBar: 'bg-sensor-danger',  valCls: 'text-sensor-danger',  cardCls: dangerCount > 0 ? 'border-sensor-dangerborder' : '' },
    { filter: 'alarm',   label: '활성 알람',  value: activeAlarms,  sub: '미처리 이벤트',                                                     topBar: 'bg-brand',          valCls: 'text-brand'          },
  ]

  return (
    <div className="flex-1 overflow-y-auto bg-surface-page">

      {/* 헤더 */}
      <div className="border-b border-line bg-surface-card/90 px-4 md:px-6 py-3 md:sticky md:top-0 md:z-10 backdrop-blur-md">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-[15px] font-semibold text-ink">대시보드</h1>
            <p className="font-mono text-xs text-ink-muted">실시간 계측 모니터링 현황</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {dangerCount > 0 && (
              <span className="flex items-center gap-1.5 rounded-full border border-sensor-dangerborder bg-sensor-dangerbg px-3 py-1.5 font-mono text-xs font-medium text-sensor-dangertext danger-flash">
                <span className="pulse-danger" />위험 센서 {dangerCount}개 감지
              </span>
            )}
            <span className="flex items-center gap-1.5 rounded-full border border-sensor-normalborder bg-sensor-normalbg px-3 py-1.5 font-mono text-xs font-medium text-sensor-normaltext">
              <span className="pulse-live" />LIVE
            </span>
            <button onClick={() => tickOnce()}
              className="rounded-full border border-line bg-surface-card px-3 py-1.5 font-mono text-[10px] text-ink-muted transition-colors hover:border-brand/40 hover:bg-brand/10 hover:text-brand"
              title="즉시 측정값 갱신 (개발용)">
              ↻ 즉시 갱신
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-4 md:p-6">

        {/* KPI 카드 */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <p className="section-title">시스템 현황</p>
            <p className="font-mono text-[10px] text-ink-muted">— 카드를 클릭하면 해당 센서 목록을 볼 수 있습니다</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {kpiCards.map(k => (
              <KpiCard
                key={k.filter}
                label={k.label}
                value={k.value}
                sub={k.sub}
                topBarClass={k.topBar}
                valueClass={k.valCls}
                cardClass={k.cardCls}
                active={kpiFilter === k.filter}
                onClick={() => handleKpiClick(k.filter)}
              />
            ))}
          </div>
        </div>

        {/* KPI 필터 센서 패널 */}
        {kpiFilter !== null && (
          <KpiSensorPanel
            filter={kpiFilter}
            sensors={sensors}
            alarms={alarms}
            onClose={() => setKpiFilter(null)}
          />
        )}

        {/* 현장 현황 + 최근 알람 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <div className="section-title">현장별 현황</div>
              <Link href="/sensors" className="text-xs text-brand hover:underline">전체 보기 →</Link>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {siteStats.map(({ site, ...stats }) => (
                <SiteCard key={site.id} site={site} {...stats} />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="section-title">최근 알람</div>
              <Link href="/alarms" className="text-xs text-brand hover:underline">전체 보기 →</Link>
            </div>
            <div className="geo-card divide-y divide-line overflow-hidden">
              {recentAlarms.length === 0 ? (
                <div className="px-4 py-6 text-center font-mono text-xs text-ink-muted">알람이 없습니다.</div>
              ) : recentAlarms.map(alarm => (
                <Link key={alarm.id} href="/alarms"
                  className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-subtle">
                  <AlarmBadge severity={alarm.severity} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-semibold text-brand shrink-0">{alarm.sensorId}</span>
                      <span className="truncate text-sm font-medium text-ink">{alarm.sensorName}</span>
                    </p>
                    <p className="truncate text-xs text-ink-sub">{alarm.message}</p>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-ink-muted">{getRelativeTime(alarm.triggeredAt)}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* 위험 센서 즉시 확인 배너 */}
        {dangerSensors.length > 0 && (
          <div className="rounded-xl border border-sensor-dangerborder bg-sensor-dangerbg p-4 danger-flash">
            <p className="flex items-center gap-2 text-sm font-semibold text-sensor-dangertext">
              <span className="pulse-danger" />위험 센서 즉시 확인 필요
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {dangerSensors.map(s => (
                <Link key={s.id} href={`/sensors/${s.id}`}
                  className="rounded-lg border border-sensor-dangerborder bg-surface-card px-3 py-2 text-sm font-medium text-sensor-dangertext shadow-card transition-colors hover:bg-sensor-dangerbg">
                  {s.manageNo || s.id} {s.name} → {s.currentValue} {s.unit}
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
