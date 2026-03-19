'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatTimestamp } from '@/lib/mock-data'
import { useAuth, DEFAULT_USER } from '@/lib/auth-context'
import { sensorStore, useSensorStore } from '@/lib/sensor-store'
import { AlarmBadge } from '@/components/ui/StatusBadge'
import type { Alarm, AlarmSeverity } from '@/types'

// ─── 필터 설정 ────────────────────────────────────────────────────────────────
const filters: { value: AlarmSeverity | 'all'; label: string }[] = [
  { value: 'all',      label: '전체'  },
  { value: 'danger',   label: '위험'  },
  { value: 'warning',  label: '주의'  },
  { value: 'info',     label: '정보'  },
  { value: 'resolved', label: '해제'  },
]

const filterActiveStyle: Record<string, string> = {
  all:      'bg-surface-muted     border-line-strong          text-ink',
  danger:   'bg-sensor-dangerbg   border-sensor-dangerborder  text-sensor-dangertext',
  warning:  'bg-sensor-warningbg  border-sensor-warningborder text-sensor-warningtext',
  info:     'bg-alarm-infobg      border-alarm-infoborder     text-alarm-infotext',
  resolved: 'bg-sensor-normalbg   border-sensor-normalborder  text-sensor-normaltext',
}

const rowStyle: Record<AlarmSeverity, { bar: string; bg: string }> = {
  danger:   { bar: 'border-l-sensor-danger',    bg: 'bg-sensor-dangerbg/30'  },
  warning:  { bar: 'border-l-sensor-warning',   bg: 'bg-sensor-warningbg/30' },
  info:     { bar: 'border-l-alarm-info',        bg: ''                        },
  resolved: { bar: 'border-l-sensor-normal/60', bg: ''                        },
}

// ─── 확인 버튼 (클릭 → 체크 표시 애니메이션 → 상태 전환) ──────────────────────
function AckButton({ alarmId, onAck }: { alarmId: string; onAck: (id: string) => void }) {
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
        'relative min-w-[72px] overflow-hidden rounded-lg border px-3 py-1.5 font-mono text-xs font-medium',
        'transition-all duration-300',
        phase === 'idle'
          ? 'border-brand/30 bg-brand/10 text-brand hover:border-brand/50 hover:bg-brand/20'
          : 'border-sensor-normalborder bg-sensor-normalbg text-sensor-normaltext',
      ].join(' ')}
    >
      {/* 배경 슬라이드 채우기 */}
      {phase === 'checking' && (
        <span
          className="absolute inset-0 bg-sensor-normal/15"
          style={{ animation: 'expand 0.5s ease forwards' }}
        />
      )}
      <span className="relative flex items-center justify-center gap-1">
        {phase === 'idle' && '확인'}
        {phase === 'checking' && (
          <>
            <span
              className="inline-block"
              style={{ animation: 'check-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
            >
              ✓
            </span>
            <span>처리 중</span>
          </>
        )}
        {phase === 'done' && (
          <>
            <span className="animate-check-pop inline-block">✓</span>
            완료
          </>
        )}
      </span>
    </button>
  )
}

// ─── 확인 완료 뱃지 ───────────────────────────────────────────────────────────
function AckedBadge({ by }: { by?: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-sensor-normalborder bg-sensor-normalbg px-2.5 py-1">
      <span
        className="text-[11px] text-sensor-normal"
        style={{ animation: 'check-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}
      >
        ✓
      </span>
      <span className="font-mono text-[10px] text-sensor-normaltext">
        확인됨{by ? ` · ${by}` : ''}
      </span>
    </div>
  )
}

// ─── 알람 카드 ────────────────────────────────────────────────────────────────
interface AlarmCardProps {
  alarm: Alarm
  isAck: boolean
  justAcked: boolean
  onAck: (id: string) => void
  // 실제 센서 internal id (링크용) — sensorId는 manageNo일 수 있으므로 별도 전달
  realSensorId: string
}

function AlarmCard({ alarm, isAck, justAcked, onAck, realSensorId }: AlarmCardProps) {
  const style    = rowStyle[alarm.severity]
  const isDanger = alarm.severity === 'danger'

  return (
    <div
      className={[
        'rounded-xl border border-line border-l-4 bg-surface-card p-4 shadow-card',
        'transition-all duration-500',
        style.bar,
        style.bg,
        justAcked  ? 'animate-ack-flash ring-2 ring-sensor-normal/30' : '',
        isAck && alarm.severity !== 'resolved' ? 'opacity-60' : '',
        isDanger && !isAck ? 'danger-flash' : '',
      ].join(' ')}
    >
      <div className="flex items-start gap-4">
        <AlarmBadge severity={alarm.severity} />

        {/* 내용 */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/sensors/${realSensorId}`}
              className="font-mono text-sm font-semibold text-brand hover:underline"
            >
              {alarm.sensorId}
            </Link>
            <span className="text-sm font-medium text-ink">{alarm.sensorName}</span>
            <span className="text-xs text-ink-muted">— {alarm.siteName}</span>
          </div>

          <p className="mt-0.5 text-sm text-ink-sub">{alarm.message}</p>

          {alarm.value > 0 && (
            <p className="mt-1 font-mono text-xs text-ink-muted">
              측정값{' '}
              <span className="font-semibold text-ink">{alarm.value} {alarm.unit}</span>
              {' / 기준 '}
              <span className="text-ink-sub">{alarm.threshold} {alarm.unit}</span>
            </p>
          )}

          <div className="mt-2 flex flex-wrap gap-4 font-mono text-[10px] text-ink-muted">
            <span>발생: {formatTimestamp(alarm.triggeredAt)}</span>
            {alarm.resolvedAt && (
              <span className="text-sensor-normaltext">
                해제: {formatTimestamp(alarm.resolvedAt)}
              </span>
            )}
            {alarm.acknowledgedBy && (
              <span>확인자: {alarm.acknowledgedBy}</span>
            )}
          </div>
        </div>

        {/* 액션 */}
        <div className="flex shrink-0 flex-col items-end gap-2">
          {alarm.severity !== 'resolved' && (
            isAck
              ? <AckedBadge by={alarm.acknowledgedBy} />
              : <AckButton alarmId={alarm.id} onAck={onAck} />
          )}
          <Link
            href={`/sensors/${realSensorId}`}
            className="rounded-lg border border-line bg-surface-card px-3 py-1.5 font-mono text-xs text-ink-sub transition-colors hover:border-line-strong hover:text-ink"
          >
            센서 보기
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────
export default function AlarmsPage() {
  const { user } = useAuth()
  const currentUserName = user?.name ?? DEFAULT_USER.name
  const { alarms: storeAlarms, sensors } = useSensorStore()
  const [alarms, setAlarms]   = useState<Alarm[]>(storeAlarms)
  const [filter, setFilter]   = useState<AlarmSeverity | 'all'>('all')
  // 스토어가 바뀔 때마다 전체 동기화 (새 알람 즉시 반영)
  useEffect(() => {
    setAlarms([...storeAlarms])
  }, [storeAlarms])

  const [ackedIds, setAckedIds] = useState<Set<string>>(
    new Set(alarms.filter(a => a.isAcknowledged).map(a => a.id))
  )
  const [justAckedId, setJustAckedId] = useState<string | null>(null)
  const [toast, setToast]     = useState<{ msg: string; type: 'success' | 'info' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'info' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  // 단건 확인
  const handleAck = (id: string) => {
    const alarm = alarms.find(a => a.id === id)
    if (!alarm) return
    setJustAckedId(id)
    setAckedIds(prev => new Set([...prev, id]))
    setAlarms(prev => {
      const next = prev.map(a => a.id === id
        ? { ...a, isAcknowledged: true, acknowledgedBy: currentUserName }
        : a
      )
      sensorStore.setAlarms(next)
      return next
    })
    showToast(`${alarm.sensorName} 알람 확인 완료`)
    setTimeout(() => setJustAckedId(null), 1500)
  }

  // 전체 확인
  const handleAckAll = () => {
    const unacked = alarms.filter(a => !ackedIds.has(a.id) && a.severity !== 'resolved')
    if (unacked.length === 0) return
    const ids = unacked.map(a => a.id)
    setAckedIds(prev => new Set([...prev, ...ids]))
    setAlarms(prev =>
      prev.map(a =>
        ids.includes(a.id)
          ? { ...a, isAcknowledged: true, acknowledgedBy: currentUserName }
          : a
      )
    )
    showToast(`미처리 알람 ${unacked.length}건 모두 확인 완료`, 'info')
  }

  const unackedCount = alarms.filter(
    a => !ackedIds.has(a.id) && a.severity !== 'resolved'
  ).length

  const filtered = filter === 'all' ? alarms : alarms.filter(a => a.severity === filter)

  return (
    <div className="flex-1 overflow-y-auto bg-surface-page">

      {/* 헤더 */}
      <div className="sticky top-14 md:top-0 z-10 border-b border-line bg-surface-card/90 px-4 md:px-6 py-3 backdrop-blur-md">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-[15px] font-semibold text-ink">알람 관리</h1>
            <p className="font-mono text-xs">
              {unackedCount > 0 ? (
                <span className="text-sensor-dangertext">
                  <span className="pulse-danger mr-1 inline-block" />
                  미처리 {unackedCount}건
                </span>
              ) : (
                <span className="text-sensor-normaltext">✓ 미처리 없음</span>
              )}
              <span className="text-ink-muted"> · 전체 {alarms.length}건</span>
            </p>
          </div>

          {/* 전체 확인 */}
          {unackedCount > 0 && (
            <button
              onClick={handleAckAll}
              className="flex items-center gap-1.5 rounded-lg border border-brand/30 bg-brand/10 px-3 py-1.5 font-mono text-xs font-medium text-brand transition-colors hover:border-brand/50 hover:bg-brand/20"
            >
              ✓ 전체 확인 ({unackedCount})
            </button>
          )}
        </div>

        {/* 필터 탭 */}
        <div className="mt-3 flex gap-1 overflow-x-auto pb-1 scrollbar-none">
          {filters.map(f => {
            const isActive = filter === f.value
            const count = f.value !== 'all'
              ? alarms.filter(a => a.severity === f.value).length
              : null
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={[
                  'rounded-full border px-3 py-1 font-mono text-[11px] font-medium transition-colors',
                  isActive
                    ? filterActiveStyle[f.value]
                    : 'border-line text-ink-muted hover:border-line-strong hover:text-ink-sub',
                ].join(' ')}
              >
                {f.label}
                {count !== null && (
                  <span className="ml-1 opacity-60">{count}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 알람 목록 */}
      <div className="space-y-3 p-6">
        {filtered.length === 0 ? (
          <div className="geo-card px-6 py-12 text-center">
            <p className="text-sm text-ink-muted">조건에 맞는 알람이 없습니다.</p>
          </div>
        ) : (
          filtered.map(alarm => (
            <AlarmCard
              key={alarm.id}
              alarm={alarm}
              isAck={ackedIds.has(alarm.id)}
              justAcked={justAckedId === alarm.id}
              onAck={handleAck}
              realSensorId={
                // sensorId가 manageNo인 경우 실제 id를 센서 목록에서 찾아서 전달
                sensors.find(s => s.manageNo === alarm.sensorId || s.id === alarm.sensorId)?.id
                ?? alarm.sensorId
              }
            />
          ))
        )}
      </div>

      {/* 토스트 */}
      {toast && (
        <div
          className={[
            'fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-in-up',
            'flex items-center gap-2 rounded-xl border px-5 py-3 font-mono text-sm shadow-cardhover',
            toast.type === 'success'
              ? 'border-sensor-normalborder bg-sensor-normalbg text-sensor-normaltext'
              : 'border-line bg-ink text-white',
          ].join(' ')}
        >
          <span className="animate-check-pop inline-block">✓</span>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
