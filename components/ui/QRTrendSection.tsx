'use client'

import { useState, useMemo } from 'react'
import { SensorTrendChart } from '@/components/charts/SensorTrendChart'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { getThresholds } from '@/lib/mock-data'
import type { UnifiedSensor, SensorReading } from '@/types'

// 15분 단위 오늘 readings 생성
function getTodayReadings(sensor: UnifiedSensor): SensorReading[] {
  const { thresholdWarning, thresholdDanger } = getThresholds(sensor)
  const now  = new Date()
  const base = new Date(now.toISOString().slice(0, 10) + 'T00:00:00')
  const slots = Math.floor((now.getTime() - base.getTime()) / (15 * 60 * 1000)) + 1

  return Array.from({ length: slots }, (_, i) => {
    const date = new Date(base)
    date.setMinutes(i * 15, 0, 0)
    const progress = i / (slots - 1 || 1)
    const trend =
      sensor.status === 'danger'  ? progress * sensor.currentValue * 0.18 :
      sensor.status === 'warning' ? progress * sensor.currentValue * 0.08 : 0
    const noise = (Math.random() - 0.5) * sensor.currentValue * 0.04
    const value = Math.max(0, Math.round((sensor.currentValue * 0.85 + trend + noise) * 100) / 100)
    return {
      timestamp: date.toISOString(), value, unit: sensor.unit,
      status: value >= thresholdDanger ? 'danger' : value >= thresholdWarning ? 'warning' : 'normal',
    }
  })
}

const PAGE_SIZE = 15

export function QRTrendSection({ sensor }: { sensor: UnifiedSensor }) {
  const readings = useMemo(() => getTodayReadings(sensor), [sensor.id])
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(readings.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const pageData   = readings.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <>
      {/* 시간별 트렌드 */}
      <div className="rounded-xl border border-line overflow-hidden">
        <div className="border-b border-line bg-surface-subtle px-4 py-2.5">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            오늘 시간별 트렌드 · 15분 간격
          </p>
        </div>
        <div className="p-3">
          <SensorTrendChart sensor={sensor} readings={readings} hideXAxis={true} />
        </div>
      </div>

      {/* 측정 데이터 테이블 */}
      <div className="rounded-xl border border-line overflow-hidden">
        <div className="flex items-center justify-between border-b border-line bg-surface-subtle px-4 py-2.5">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            측정 데이터 · {readings.length}건
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button disabled={safePage <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="rounded border border-line px-2 py-0.5 font-mono text-[10px] text-ink-muted transition-colors hover:bg-surface-subtle disabled:opacity-30">
                ←
              </button>
              <span className="font-mono text-[10px] text-ink-muted">
                {safePage}/{totalPages}
              </span>
              <button disabled={safePage >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="rounded border border-line px-2 py-0.5 font-mono text-[10px] text-ink-muted transition-colors hover:bg-surface-subtle disabled:opacity-30">
                →
              </button>
            </div>
          )}
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-line bg-surface-subtle">
              {['시각','측정값','상태'].map(h => (
                <th key={h} className="px-3 py-2 text-left font-mono text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {pageData.map((r, i) => {
              const dt = new Date(r.timestamp)
              const rowCls =
                r.status === 'danger'  ? 'bg-sensor-dangerbg/30'  :
                r.status === 'warning' ? 'bg-sensor-warningbg/30' : ''
              return (
                <tr key={i} className={`${rowCls}`}>
                  <td className="px-3 py-1.5 font-mono text-[10px] text-ink-muted">
                    {dt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className={`px-3 py-1.5 font-mono text-xs font-medium ${
                    r.status === 'danger'  ? 'text-sensor-danger'  :
                    r.status === 'warning' ? 'text-sensor-warning' : 'text-ink'}`}>
                    {r.value} {sensor.unit}
                  </td>
                  <td className="px-3 py-1.5">
                    <StatusBadge status={r.status} size="sm" />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {/* 페이지 점 */}
        {totalPages > 1 && totalPages <= 10 && (
          <div className="flex items-center justify-center gap-1 border-t border-line py-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={['h-1.5 rounded-full transition-all duration-200',
                  p === safePage ? 'w-4 bg-brand' : 'w-1.5 bg-line-strong'].join(' ')} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
