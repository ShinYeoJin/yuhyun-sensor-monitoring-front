'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatTimestamp } from '@/lib/mock-data'
import { useAuth, DEFAULT_USER } from '@/lib/auth-context'
import { AlarmBadge } from '@/components/ui/StatusBadge'
import { alarmApi } from '@/lib/api'

const filters = [
  { value: 'all',     label: '전체' },
  { value: 'danger',  label: '위험' },
  { value: 'warning', label: '주의' },
]

const filterActiveStyle: Record<string, string> = {
  all:     'bg-surface-muted    border-line-strong          text-ink',
  danger:  'bg-sensor-dangerbg  border-sensor-dangerborder  text-sensor-dangertext',
  warning: 'bg-sensor-warningbg border-sensor-warningborder text-sensor-warningtext',
}

function AckButton({ alarmId, onAck }: { alarmId: number; onAck: (id: number) => void }) {
  const [phase, setPhase] = useState<'idle' | 'checking' | 'done'>('idle')

  const handleClick = () => {
    if (phase !== 'idle') return
    setPhase('checking')
    setTimeout(() => {
      setPhase('done')
      onAck(alarmId)
    }, 550)
  }

  return (
    <button
      onClick={handleClick}
      disabled={phase !== 'idle'}
      className={[
        'relative min-w-[72px] overflow-hidden rounded-lg border px-3 py-1.5 font-mono text-xs font-medium transition-all duration-300',
        phase === 'idle'
          ? 'border-brand/30 bg-brand/10 text-brand hover:border-brand/50 hover:bg-brand/20'
          : 'border-sensor-normalborder bg-sensor-normalbg text-sensor-normaltext',
      ].join(' ')}
    >
      <span className="relative flex items-center justify-center gap-1">
        {phase === 'idle' && '확인'}
        {phase === 'checking' && <><span>✓</span><span>처리 중</span></>}
        {phase === 'done' && <><span>✓</span>완료</>}
      </span>
    </button>
  )
}

function AckedBadge({ by }: { by?: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-sensor-normalborder bg-sensor-normalbg px-2.5 py-1">
      <span className="text-[11px] text-sensor-normal">✓</span>
      <span className="font-mono text-[10px] text-sensor-normaltext">
        확인됨{by ? ` · ${by}` : ''}
      </span>
    </div>
  )
}

export default function AlarmsPage() {
  const { user } = useAuth()
  const currentUserName = user?.name ?? DEFAULT_USER.name
  const [alarms,  setAlarms]  = useState<any[]>([])
  const [filter,  setFilter]  = useState('all')
  const [loading, setLoading] = useState(true)
  const [toast,   setToast]   = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const fetchAlarms = async () => {
    try {
      const data = await alarmApi.getAll()
      setAlarms(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAlarms()
  }, [])

  const handleAck = async (id: number) => {
    try {
      await alarmApi.acknowledge(id, currentUserName)
      setAlarms(prev => prev.map(a =>
        a.id === id ? { ...a, is_acknowledged: true, acknowledged_by: currentUserName } : a
      ))
      showToast('알람 확인 완료')
    } catch (err) {
      console.error(err)
    }
  }

  const handleAckAll = async () => {
    const unacked = alarms.filter(a => !a.is_acknowledged)
    if (unacked.length === 0) return
    try {
      await Promise.all(unacked.map(a => alarmApi.acknowledge(a.id, currentUserName)))
      setAlarms(prev => prev.map(a => ({ ...a, is_acknowledged: true, acknowledged_by: currentUserName })))
      showToast(`미처리 알람 ${unacked.length}건 모두 확인 완료`)
    } catch (err) {
      console.error(err)
    }
  }

  const unackedCount = alarms.filter(a => !a.is_acknowledged).length

  const filtered = filter === 'all'
    ? alarms
    : alarms.filter(a => a.severity === filter)

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="font-mono text-sm text-ink-muted">알람 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-surface-page">

      {/* 헤더 */}
      <div className="border-b border-line bg-surface-card/90 px-4 md:px-6 py-3 md:sticky md:top-0 md:z-10 backdrop-blur-md">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-[15px] font-semibold text-ink">알람 관리</h1>
            <p className="font-mono text-xs">
              {unackedCount > 0 ? (
                <span className="text-sensor-dangertext">미처리 {unackedCount}건</span>
              ) : (
                <span className="text-sensor-normaltext">✓ 미처리 없음</span>
              )}
              <span className="text-ink-muted"> · 전체 {alarms.length}건</span>
            </p>
          </div>
          {unackedCount > 0 && (
            <button
              onClick={handleAckAll}
              className="flex items-center gap-1.5 rounded-lg border border-brand/30 bg-brand/10 px-3 py-1.5 font-mono text-xs font-medium text-brand transition-colors hover:border-brand/50 hover:bg-brand/20">
              ✓ 전체 확인 ({unackedCount})
            </button>
          )}
        </div>

        <div className="mt-3 flex gap-1 overflow-x-auto pb-1 scrollbar-none">
          {filters.map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className={[
                'rounded-full border px-3 py-1 font-mono text-[11px] font-medium transition-colors',
                filter === f.value
                  ? filterActiveStyle[f.value]
                  : 'border-line text-ink-muted hover:border-line-strong hover:text-ink-sub',
              ].join(' ')}>
              {f.label}
              {f.value !== 'all' && (
                <span className="ml-1 opacity-60">{alarms.filter(a => a.severity === f.value).length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 알람 목록 */}
      <div className="space-y-3 p-6">
        {filtered.length === 0 ? (
          <div className="geo-card px-6 py-12 text-center">
            <p className="text-sm text-ink-muted">
              {alarms.length === 0 ? '발생한 알람이 없습니다.' : '조건에 맞는 알람이 없습니다.'}
            </p>
          </div>
        ) : (
          filtered.map((alarm: any) => (
            <div key={alarm.id}
              className={[
                'rounded-xl border border-line border-l-4 bg-surface-card p-4 shadow-card transition-all duration-500',
                alarm.severity === 'danger'  ? 'border-l-sensor-danger  bg-sensor-dangerbg/30'  : '',
                alarm.severity === 'warning' ? 'border-l-sensor-warning bg-sensor-warningbg/30' : '',
                alarm.is_acknowledged ? 'opacity-60' : '',
              ].join(' ')}>
              <div className="flex items-start gap-4">
                <AlarmBadge severity={alarm.severity} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/sensors/${alarm.sensor_id}`}
                      className="font-mono text-sm font-semibold text-brand hover:underline shrink-0">
                      {alarm.sensor_code}
                    </Link>
                    <span className="text-sm font-medium text-ink">{alarm.sensor_name}</span>
                    <span className="text-xs text-ink-muted">— {alarm.site_name}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-ink-sub">{alarm.message}</p>
                  {alarm.triggered_value && (
                    <p className="mt-1 font-mono text-xs text-ink-muted">
                      측정값 <span className="font-semibold text-ink">{alarm.triggered_value}</span>
                      {alarm.threshold_value && <> / 기준 <span className="text-ink-sub">{alarm.threshold_value}</span></>}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-4 font-mono text-[10px] text-ink-muted">
                    <span>발생: {formatTimestamp(alarm.triggered_at)}</span>
                    {alarm.acknowledged_by && <span>확인자: {alarm.acknowledged_by}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {alarm.is_acknowledged
                    ? <AckedBadge by={alarm.acknowledged_by} />
                    : <AckButton alarmId={alarm.id} onAck={handleAck} />
                  }
                  <Link href={`/sensors/${alarm.sensor_id}`}
                    className="rounded-lg border border-line bg-surface-card px-3 py-1.5 font-mono text-xs text-ink-sub transition-colors hover:border-line-strong hover:text-ink">
                    센서 보기
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-in-up rounded-xl border border-sensor-normalborder bg-sensor-normalbg px-5 py-3 font-mono text-sm text-sensor-normaltext shadow-cardhover">
          ✓ {toast}
        </div>
      )}
    </div>
  )
}