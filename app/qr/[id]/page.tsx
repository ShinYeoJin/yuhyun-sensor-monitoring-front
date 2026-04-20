'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { QRCodeSection } from '@/components/ui/QRCodeSection'
import Link from 'next/link'
import { sensorApi } from '@/lib/api'

export default function QRSensorPage() {
  const params = useParams()
  const id = Array.isArray(params.id) ? params.id[0] : params.id
  const [sensor, setSensor] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    sensorApi.getById(Number(id)).then((data: any) => {
      setSensor({
        id: String(data.id),
        manageNo: data.manage_no || '',
        name: data.name,
        nameEn: '',
        sensorCode: data.sensor_code,
        unit: data.unit || '',
        siteName: data.site_name || '',
        locationDesc: data.location_desc || '',
        status: data.status || 'offline',
        currentValue: data.current_value ? parseFloat(data.current_value) : 0,
        correctionParams: data.correction_params || {},
        formulaParams: data.formula_params || {},
        lastUpdated: data.last_measured || new Date().toISOString(),
        thresholdNormalMax: data.threshold_normal_max,
        thresholdWarningMax: data.threshold_warning_max,
        thresholdDangerMin: data.threshold_danger_min,
      })
    }).catch(() => setSensor(null))
    .finally(() => setLoading(false))
  }, [id])

  const [latestValues, setLatestValues] = useState<Record<string, { poly: number, linear: number } | null>>({})

  useEffect(() => {
    if (!id || !sensor || sensor.sensorCode !== '80053') return
    Promise.all(['1', '2', '3'].map(depth =>
      sensorApi.getMeasurements(Number(id), { limit: 1, depthLabel: depth })
        .then((data: any[]) => {
          if (data.length === 0) return [depth, null]
          const corr = (sensor.correctionParams || {})[depth] ?? 0
          return [depth, {
            poly: parseFloat((parseFloat(data[0].value) + corr).toFixed(2)),
            linear: parseFloat((parseFloat(data[0].linear_value ?? data[0].value) + corr).toFixed(2)),
          }]
        })
        .catch(() => [depth, null])
    )).then(results => {
      setLatestValues(Object.fromEntries(results))
    })
  }, [id, sensor])

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="font-mono text-sm text-ink-muted">불러오는 중...</p>
    </div>
  )

  if (!sensor) return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="font-mono text-sm text-ink-muted">센서를 찾을 수 없습니다.</p>
    </div>
  )

  const topBarClass =
    sensor.status === 'danger'  ? 'bg-sensor-danger'  :
    sensor.status === 'warning' ? 'bg-sensor-warning' :
    sensor.status === 'offline' ? 'bg-sensor-offline' :
    'bg-sensor-normal'

  const valueCls =
    sensor.status === 'danger'  ? 'text-sensor-danger'  :
    sensor.status === 'warning' ? 'text-sensor-warning' :
    sensor.status === 'offline' ? 'text-ink-muted'      :
    'text-sensor-normal'

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-page p-4">
      <div className="w-full max-w-sm space-y-3">

        <div className="text-center">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand font-mono text-sm font-medium text-white shadow-card">
            GM
          </div>
          <p className="mt-1 font-mono text-[10px] text-ink-muted">GeoMonitor 계측 시스템</p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-line bg-surface-card shadow-cardhover">
          <div className={`h-1 w-full ${topBarClass}`} />

          <div className="flex items-center justify-between border-b border-line bg-surface-subtle px-5 py-3">
            <StatusBadge status={sensor.status} />
            <span className="font-mono text-[10px] text-ink-muted">QR 현장 조회</span>
          </div>

          <div className="space-y-4 p-5">

            <div>
              <p className="font-mono text-2xl font-medium tracking-tight text-ink">
                {sensor.manageNo || sensor.sensorCode}
              </p>
              <p className="mt-0.5 text-sm font-medium text-ink-sub">{sensor.name}</p>
              <p className="mt-1 font-mono text-xs text-ink-muted">
                {sensor.siteName} · {sensor.locationDesc || '—'}
              </p>
            </div>

            <div className="rounded-xl border border-line bg-surface-subtle py-4 text-center">
              {sensor.status === 'offline' ? (
                <>
                  <p className="font-mono text-4xl font-light text-ink-muted">—</p>
                  <p className="mt-1 font-mono text-xs text-ink-muted">오프라인 상태</p>
                </>
              ) : sensor.sensorCode === '80053' ? (
                <div className="space-y-3 px-4">
                  {(['1', '2', '3'] as const).map(depth => {
                    const val = latestValues[depth]
                    return (
                      <div key={depth} className="rounded-lg border border-line bg-surface-card px-3 py-2">
                        <p className="font-mono text-[10px] text-ink-muted mb-1">{depth}번 수위계</p>
                        {val ? (
                          <div className="flex justify-around">
                            <div>
                              <p className={`font-mono text-xl font-semibold ${valueCls}`}>
                                {val.linear}
                                <span className="ml-1 text-xs font-normal text-ink-muted">{sensor.unit}</span>
                              </p>
                              <p className="font-mono text-[9px] text-ink-muted">Linear (메인)</p>
                            </div>
                            <div className="w-px bg-line" />
                            <div>
                              <p className="font-mono text-xl font-semibold text-ink">
                                {val.poly}
                                <span className="ml-1 text-xs font-normal text-ink-muted">{sensor.unit}</span>
                              </p>
                              <p className="font-mono text-[9px] text-ink-muted">Polynomial</p>
                            </div>
                          </div>
                        ) : (
                          <p className="font-mono text-sm text-ink-muted">데이터 없음</p>
                        )}
                      </div>
                    )
                  })}
                  <p className="font-mono text-[9px] text-ink-muted">보정값 적용된 최신 측정값</p>
                </div>
              ) : (
                <>
                  <p className={`font-mono text-5xl font-light leading-none ${valueCls}`}>
                    {sensor.currentValue}
                    <span className="ml-1.5 text-xl font-normal text-ink-muted">{sensor.unit}</span>
                  </p>
                  <p className="mt-1.5 font-mono text-[10px] uppercase tracking-widest text-ink-muted">
                    현재 측정값
                  </p>
                </>
              )}
            </div>

            {sensor.status !== 'offline' && (sensor.thresholdWarningMax || sensor.thresholdDangerMin) && (
              <div className="grid grid-cols-2 gap-3">
                {sensor.thresholdWarningMax && (
                  <div className="rounded-lg border border-sensor-warningborder bg-sensor-warningbg p-3">
                    <p className="font-mono text-[10px] text-sensor-warningtext">주의 임계값</p>
                    <p className="mt-0.5 font-mono text-sm font-semibold text-sensor-warningtext">
                      {sensor.thresholdWarningMax} {sensor.unit}
                    </p>
                  </div>
                )}
                {sensor.thresholdDangerMin && (
                  <div className="rounded-lg border border-sensor-dangerborder bg-sensor-dangerbg p-3">
                    <p className="font-mono text-[10px] text-sensor-dangertext">위험 임계값</p>
                    <p className="mt-0.5 font-mono text-sm font-semibold text-sensor-dangertext">
                      {sensor.thresholdDangerMin} {sensor.unit}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="rounded-lg border border-line bg-surface-subtle px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] text-ink-muted">마지막 수신</p>
                <p className="font-mono text-xs font-medium text-ink">
                  {new Date(sensor.lastUpdated).toLocaleString('ko-KR', {
                    month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
            </div>

            <QRCodeSection sensorId={sensor.id} />

            <p className="border-t border-line pt-3 text-center font-mono text-[10px] text-ink-muted">
              조회 시각: {new Date().toLocaleString('ko-KR')}
            </p>

            <a href={`/sensors/${sensor.id}`}
              onClick={e => {
                e.preventDefault()
                const token = localStorage.getItem('gm_token')
                if (token) {
                  window.location.href = `/sensors/${sensor.id}`
                } else {
                  window.location.href = `/login`
                }
              }}
              className="block w-full rounded-xl bg-ink py-3 text-center font-mono text-sm font-semibold text-white transition-colors hover:bg-ink-sub">
              상세 정보 보기 →
            </a>
          </div>
        </div>

        <p className="text-center font-mono text-[10px] text-ink-muted">
          관리자 로그인이 필요한 기능은 대시보드를 이용하세요.
        </p>
      </div>
    </main>
  )
}