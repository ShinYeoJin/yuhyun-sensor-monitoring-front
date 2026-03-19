'use client'

import Link from 'next/link'
import { getRelativeTime } from '@/lib/mock-data'
import { mockSites } from '@/lib/mock-data'
import { useSensorStore } from '@/lib/sensor-store'
import { StatusBadge, AlarmBadge } from '@/components/ui/StatusBadge'
import { useMemo, useEffect, useState } from 'react'
import type { Site } from '@/types'
import { startSimulator, stopSimulator, tickOnce } from '@/lib/sensor-simulator'

// ─── KPI 카드 ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, topBarClass, valueClass, cardClass = '' }: {
  label: string; value: number; sub?: string
  topBarClass: string; valueClass: string; cardClass?: string
}) {
  return (
    <div className={`relative overflow-hidden rounded-xl border border-line bg-surface-card shadow-card ${cardClass}`}>
      <div className={`h-0.5 w-full ${topBarClass}`} />
      <div className="px-4 pb-4 pt-3">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[1.2px] text-ink-muted">{label}</p>
        <p className={`mt-1 font-mono text-4xl font-light leading-none tracking-tight ${valueClass}`}>
          {String(value).padStart(2, '0')}
        </p>
        {sub && <p className="mt-2 border-t border-line pt-2 font-mono text-[10px] text-ink-muted">{sub}</p>}
      </div>
    </div>
  )
}

// ─── 현장 카드 ────────────────────────────────────────────────────────────────
function SiteCard({ site, liveNormal, liveWarning, liveDanger, liveOffline, liveTotal }: {
  site: Site
  liveNormal: number; liveWarning: number; liveDanger: number
  liveOffline: number; liveTotal: number
}) {
  const total      = liveTotal || site.totalSensors
  const normal     = liveTotal ? liveNormal  : site.normalCount
  const warning    = liveTotal ? liveWarning : site.warningCount
  const danger     = liveTotal ? liveDanger  : site.dangerCount
  const offline    = liveTotal ? liveOffline : site.offlineCount

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
        <span className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[11px] font-medium ${statusBadgeClass}`}>
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

// ─── 대시보드 페이지 ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { sensors, alarms } = useSensorStore()
  const [simRunning, setSimRunning] = useState(false)

  // 컴포넌트 마운트 시 시뮬레이터 자동 시작 (15분 간격)
  useEffect(() => {
    startSimulator()
    setSimRunning(true)
    return () => stopSimulator()
  }, [])

  // ── 센서 통계 (스토어 실시간) ──
  const normalCount  = sensors.filter(s => s.status === 'normal').length
  const warningCount = sensors.filter(s => s.status === 'warning').length
  const dangerCount  = sensors.filter(s => s.status === 'danger').length
  const offlineCount = sensors.filter(s => s.status === 'offline').length
  const totalSensors = sensors.length

  // ── 알람 통계 (스토어 실시간) ──
  const activeAlarms = alarms.filter(a => !a.isAcknowledged && a.severity !== 'resolved').length
  // 최근 알람 5건
  const recentAlarms = alarms.slice(0, 5)

  // ── 위험 센서 목록 ──
  const dangerSensors = sensors.filter(s => s.status === 'danger')

  // ── 현장별 실시간 집계 ──
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

  return (
    <div className="flex-1 overflow-y-auto bg-surface-page">

      {/* 헤더 */}
      <div className="sticky top-14 md:top-0 z-10 border-b border-line bg-surface-card/90 px-4 md:px-6 py-3 backdrop-blur-md">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-[15px] font-semibold text-ink">대시보드</h1>
            <p className="font-mono text-xs text-ink-muted">실시간 계측 모니터링 현황</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {dangerCount > 0 && (
              <span className="flex items-center gap-1.5 rounded-full border border-sensor-dangerborder bg-sensor-dangerbg px-3 py-1.5 font-mono text-xs font-medium text-sensor-dangertext danger-flash">
                <span className="pulse-danger" />
                위험 센서 {dangerCount}개 감지
              </span>
            )}
            <span className="flex items-center gap-1.5 rounded-full border border-sensor-normalborder bg-sensor-normalbg px-3 py-1.5 font-mono text-xs font-medium text-sensor-normaltext">
              <span className="pulse-live" />LIVE
            </span>
            {/* 개발용: 즉시 1회 측정값 갱신 */}
            <button
              onClick={() => tickOnce()}
              className="rounded-full border border-line bg-surface-card px-3 py-1.5 font-mono text-[10px] text-ink-muted transition-colors hover:border-brand/40 hover:bg-brand/10 hover:text-brand"
              title="즉시 측정값 갱신 (개발용)"
            >
              ↻ 즉시 갱신
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-6">

        {/* KPI 카드 */}
        <div>
          <div className="mb-3 section-title">시스템 현황</div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <KpiCard label="전체 센서"  value={totalSensors}  sub={`${mockSites.length}개 현장`}                        topBarClass="bg-alarm-info"     valueClass="text-alarm-info" />
            <KpiCard label="정상"        value={normalCount}   sub={totalSensors ? `${Math.round(normalCount/totalSensors*100)}%` : '—'} topBarClass="bg-sensor-normal"  valueClass="text-sensor-normal" />
            <KpiCard label="주의"        value={warningCount}  sub="확인 필요"                                           topBarClass="bg-sensor-warning" valueClass="text-sensor-warning" />
            <KpiCard label="위험"        value={dangerCount}   sub="즉시 조치"                                           topBarClass="bg-sensor-danger"  valueClass="text-sensor-danger" cardClass={dangerCount > 0 ? 'border-sensor-dangerborder' : ''} />
            <KpiCard label="활성 알람"   value={activeAlarms}  sub="미처리 이벤트"                                       topBarClass="bg-brand"          valueClass="text-brand" />
          </div>
        </div>

        {/* 현장 현황 + 최근 알람 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          <div className="lg:col-span-2 space-y-3">
            <div className="section-title">현장별 현황</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {siteStats.map(({ site, ...stats }) => (
                <SiteCard key={site.id} site={site} {...stats} />
              ))}
            </div>
          </div>

          {/* 최근 알람 — 스토어 기반 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="section-title">최근 알람</div>
              <Link href="/alarms" className="text-xs text-brand hover:underline">전체 보기 →</Link>
            </div>
            <div className="geo-card divide-y divide-line overflow-hidden">
              {recentAlarms.length === 0 ? (
                <div className="px-4 py-6 text-center font-mono text-xs text-ink-muted">
                  알람이 없습니다.
                </div>
              ) : recentAlarms.map(alarm => (
                <Link key={alarm.id} href="/alarms"
                  className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-subtle">
                  <AlarmBadge severity={alarm.severity} />
                  <div className="min-w-0 flex-1">
                    {/* 관리번호(sensorId) + 센서명 표시 */}
                    <p className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-semibold text-brand">{alarm.sensorId}</span>
                      <span className="truncate text-sm font-medium text-ink">{alarm.sensorName}</span>
                    </p>
                    <p className="truncate text-xs text-ink-sub">{alarm.message}</p>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-ink-muted">
                    {getRelativeTime(alarm.triggeredAt)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* 위험 센서 즉시 확인 배너 — 스토어 기반 */}
        {dangerSensors.length > 0 && (
          <div className="rounded-xl border border-sensor-dangerborder bg-sensor-dangerbg p-4 danger-flash">
            <p className="flex items-center gap-2 text-sm font-semibold text-sensor-dangertext">
              <span className="pulse-danger" />
              위험 센서 즉시 확인 필요
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {dangerSensors.map(s => (
                <Link key={s.id} href={`/sensors/${s.id}`}
                  className="rounded-lg border border-sensor-dangerborder bg-surface-card px-3 py-2 text-sm font-medium text-sensor-dangertext shadow-card transition-colors hover:bg-sensor-dangerbg">
                  {/* 관리번호 우선 표시 */}
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
