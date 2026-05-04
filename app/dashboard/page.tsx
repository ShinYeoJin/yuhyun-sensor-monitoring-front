'use client'

import Link from 'next/link'
import { getRelativeTime } from '@/lib/mock-data'
import { StatusBadge, AlarmBadge } from '@/components/ui/StatusBadge'
import { useMemo, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { dashboardApi, sensorApi, alarmApi } from '@/lib/api'

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

type KpiFilter = 'all' | 'normal' | 'warning' | 'danger' | 'offline'

const kpiFilterLabel: Record<KpiFilter, string> = {
  all:     '전체 센서',
  normal:  '정상 센서',
  warning: '주의 센서',
  danger:  '위험 센서',
  offline: '오프라인 센서',
}

// ─── 대시보드 페이지 ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<any>(null)
  const [sensors,   setSensors]   = useState<any[]>([])
  const [alarms,    setAlarms]    = useState<any[]>([])
  const [kpiFilter, setKpiFilter] = useState<KpiFilter | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const router = useRouter()

  const isDataDelayed = (lastMeasured: string | null) => {
    if (!lastMeasured) return true
    const diff = Date.now() - new Date(lastMeasured).getTime()
    return diff > 2 * 60 * 60 * 1000  // 2시간
  }

  const fetchData = async (isManual = false) => {
    if (isManual) setRefreshing(true)
    try {
      const [dash, sens, alm] = await Promise.all([
        dashboardApi.get(),
        sensorApi.getAll(),
        alarmApi.getAll(),
      ])
      setDashboard(dash)
      setSensors(sens)
      setAlarms(alm)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      if (isManual) setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [])

  const normalCount  = sensors.filter(s => s.status === 'normal').length
  const warningCount = sensors.filter(s => s.status === 'warning').length
  const dangerCount  = sensors.filter(s => s.status === 'danger').length
  const offlineCount = sensors.filter(s => s.status === 'offline').length
  const totalSensors = sensors.length
  const activeAlarms = alarms.filter((a: any) => !a.is_acknowledged).length
  const recentAlarms = alarms.slice(0, 5)
  const dangerSensors = sensors.filter(s => s.status === 'danger')

  const filteredSensors = useMemo(() => {
    if (!kpiFilter || kpiFilter === 'all') return sensors
    return sensors.filter(s => s.status === kpiFilter)
  }, [kpiFilter, sensors])

  const handleKpiClick = (f: KpiFilter) => {
    setKpiFilter(prev => prev === f ? null : f)
  }

  const kpiCards = [
    { filter: 'all'     as KpiFilter, label: '전체 센서', value: totalSensors,  sub: '전체',       topBar: 'bg-alarm-info',     valCls: 'text-alarm-info'     },
    { filter: 'normal'  as KpiFilter, label: '정상',       value: normalCount,   sub: '정상 운영',  topBar: 'bg-sensor-normal',  valCls: 'text-sensor-normal'  },
    { filter: 'warning' as KpiFilter, label: '주의',       value: warningCount,  sub: '확인 필요',  topBar: 'bg-sensor-warning', valCls: 'text-sensor-warning' },
    { filter: 'danger'  as KpiFilter, label: '위험',       value: dangerCount,   sub: '즉시 조치',  topBar: 'bg-sensor-danger',  valCls: 'text-sensor-danger'  },
    { filter: 'offline' as KpiFilter, label: '오프라인',   value: offlineCount,  sub: '점검 필요',  topBar: 'bg-ink-muted',      valCls: 'text-ink-muted'      },
  ]

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="font-mono text-sm text-ink-muted">데이터 불러오는 중...</p>
      </div>
    )
  }

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
              <span className="flex items-center gap-1.5 rounded-full border border-sensor-dangerborder bg-sensor-dangerbg px-3 py-1.5 font-mono text-xs font-medium text-sensor-dangertext">
                위험 센서 {dangerCount}개 감지
              </span>
            )}
            <span className="flex items-center gap-1.5 rounded-full border border-sensor-normalborder bg-sensor-normalbg px-3 py-1.5 font-mono text-xs font-medium text-sensor-normaltext">
              <span className="pulse-live" />LIVE
            </span>
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="rounded-full border border-line bg-surface-card px-3 py-1.5 font-mono text-[10px] text-ink-muted transition-colors hover:border-brand/40 hover:bg-brand/10 hover:text-brand disabled:opacity-50">
              {refreshing ? '⟳ 갱신 중...' : '↻ 새로고침'}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-4 md:p-6">
        {/* 수신 지연 경고 배너 */}
        {sensors.some((s: any) => isDataDelayed(s.last_measured)) && (
          <div className="rounded-xl border border-sensor-warningborder bg-sensor-warningbg px-5 py-4">
            <p className="flex items-center gap-2 font-semibold text-sensor-warningtext">
              ⚠ 데이터 수신 지연 감지
            </p>
            <p className="mt-1 text-sm text-sensor-warningtext/80">
             {sensors.filter((s: any) => isDataDelayed(s.last_measured)).map((s: any) => s.name || s.sensor_code).join(', ')} 센서에서 2시간 이상 데이터가 수신되지 않고 있습니다.
            </p>
          </div>
        )}

        {/* 지도 영역 (카카오맵 연동 예정) */}
        <div className="rounded-xl border border-line bg-surface-card shadow-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">🗺</span>
              <h2 className="text-sm font-semibold text-ink">현장 위치</h2>
            </div>
            <span className="font-mono text-[10px] text-ink-muted">카카오맵 연동 예정</span>
          </div>
          <div className="relative flex items-center justify-center bg-surface-subtle"
            style={{ height: 320 }}>
            {/* 지도 배경 그리드 */}
            <div className="absolute inset-0 opacity-20"
              style={{ backgroundImage: 'linear-gradient(#c8d2e0 1px, transparent 1px), linear-gradient(90deg, #c8d2e0 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            {/* 도로 느낌 선 */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute left-1/4 top-0 bottom-0 w-6 bg-white rounded" />
              <div className="absolute left-2/3 top-0 bottom-0 w-4 bg-white rounded" />
              <div className="absolute top-1/3 left-0 right-0 h-5 bg-white rounded" />
              <div className="absolute top-2/3 left-0 right-0 h-3 bg-white rounded" />
            </div>
            {/* 중앙 안내 */}
            <div className="relative z-10 flex flex-col items-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 border-2 border-brand/30">
                <span className="text-2xl">📍</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">카카오맵 연동 준비 중</p>
                <p className="mt-1 font-mono text-[11px] text-ink-muted">카카오 계정 연동 후 현장 위치 및 센서 아이콘이 표시됩니다</p>
              </div>
            </div>
          </div>
        </div>

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
                active={kpiFilter === k.filter}
                onClick={() => handleKpiClick(k.filter)}
              />
            ))}
          </div>
        </div>

        {/* KPI 필터 센서 패널 */}
        {kpiFilter !== null && (
          <div className="rounded-xl border border-brand/30 bg-surface-card shadow-cardhover overflow-hidden">
            <div className="flex items-center justify-between border-b border-line bg-surface-subtle px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-ink">{kpiFilterLabel[kpiFilter]}</h3>
                <p className="font-mono text-[10px] text-ink-muted">{filteredSensors.length}개 센서</p>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/sensors" className="font-mono text-[11px] text-brand hover:underline">
                  센서 관리 →
                </Link>
                <button onClick={() => setKpiFilter(null)}
                  className="rounded-md p-1 text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink">
                  ✕
                </button>
              </div>
            </div>
            {filteredSensors.length === 0 ? (
              <div className="py-10 text-center font-mono text-sm text-ink-muted">
                해당하는 센서가 없습니다.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="border-b border-line bg-surface-subtle">
                      {['센서명', '현장', '현재값', '상태', '마지막 측정'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left font-mono text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filteredSensors.map((sensor: any) => (
                      <tr key={sensor.id}
                        onClick={() => router.push(`/sensors/${sensor.id}`)}
                        className="cursor-pointer transition-colors hover:bg-brand/5">
                        <td className="px-4 py-3">
                        <p className="font-mono text-sm font-semibold text-brand">{sensor.name}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-ink-sub">{sensor.site_name}</td>
                        <td className="px-4 py-3 font-mono text-sm font-medium text-ink">
                          {sensor.current_value ? `${sensor.current_value} ${sensor.unit}` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={sensor.status} size="sm" />
                        </td>
                        <td className="px-4 py-3 font-mono text-[10px]">
                          {isDataDelayed(sensor.last_measured) ? (
                            <span className="flex items-center gap-1 text-sensor-warningtext font-semibold">
                              ⚠ {sensor.last_measured ? getRelativeTime(sensor.last_measured) : '미수신'}
                            </span>
                          ) : (
                            <span className="text-ink-muted">{getRelativeTime(sensor.last_measured)}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 최근 알람 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="section-title">최근 알람</div>
            <Link href="/alarms" className="text-xs text-brand hover:underline">전체 보기 →</Link>
          </div>
          <div className="geo-card divide-y divide-line overflow-hidden">
            {recentAlarms.length === 0 ? (
              <div className="px-4 py-6 text-center font-mono text-xs text-ink-muted">알람이 없습니다.</div>
            ) : recentAlarms.map((alarm: any) => (
              <Link key={alarm.id} href="/alarms"
                className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-subtle">
                <AlarmBadge severity={alarm.severity} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-semibold text-brand shrink-0">{alarm.sensor_code}</span>
                    <span className="truncate text-sm font-medium text-ink">{alarm.sensor_name}</span>
                  </p>
                  <p className="truncate text-xs text-ink-sub">{alarm.message}</p>
                </div>
                <span className="shrink-0 font-mono text-[10px] text-ink-muted">
                  {getRelativeTime(alarm.triggered_at)}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* 위험 센서 배너 */}
        {dangerSensors.length > 0 && (
          <div className="rounded-xl border border-sensor-dangerborder bg-sensor-dangerbg p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-sensor-dangertext">
              위험 센서 즉시 확인 필요
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {dangerSensors.map((s: any) => (
                <Link key={s.id} href={`/sensors/${s.id}`}
                  className="rounded-lg border border-sensor-dangerborder bg-surface-card px-3 py-2 text-sm font-medium text-sensor-dangertext shadow-card transition-colors hover:bg-sensor-dangerbg">
                  {s.sensor_code} {s.name} → {s.current_value} {s.unit}
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}