import { useState, useEffect } from 'react'
import type { UnifiedSensor, Alarm, SensorStatus, ThresholdRange } from '@/types'
import { mockSensors, mockAlarms, getThresholds } from '@/lib/mock-data'

// ─── 임계값으로 상태 평가 ─────────────────────────────────────────────────────
export function evaluateStatus(value: number, threshold: ThresholdRange): SensorStatus {
  const { dangerMin, normalMax } = threshold
  if (dangerMin !== '' && value >= Number(dangerMin)) return 'danger'
  if (normalMax !== '' && value >  Number(normalMax)) return 'warning'
  return 'normal'
}

// ─── 싱글톤 초기 상태 ────────────────────────────────────────────────────────
let _sensors: UnifiedSensor[] = mockSensors.map(s => ({
  ...s,
  status: s.status === 'offline' ? 'offline' : evaluateStatus(s.currentValue, s.threshold),
}))
let _alarms: Alarm[] = [...mockAlarms]

const _listeners = new Set<() => void>()
const notify = () => _listeners.forEach(fn => fn())

// ─── 알람 자동 생성 ───────────────────────────────────────────────────────────
function makeAlarm(sensor: UnifiedSensor, prevStatus: SensorStatus): Alarm | null {
  const { status, currentValue, unit, id, name, siteId, siteName, manageNo } = sensor
  // 오프라인이거나 상태가 같거나 정상 복귀면 알람 없음
  if (status === 'offline' || status === prevStatus || status === 'normal') return null

  const { thresholdWarning, thresholdDanger } = getThresholds(sensor)
  const severity   = status === 'danger' ? 'danger' : 'warning'
  const threshVal  = severity === 'danger' ? thresholdDanger : thresholdWarning

  return {
    id:             `ALM-${Date.now()}-${id}`,
    sensorId:       manageNo || id,   // 관리번호 우선 표시
    sensorName:     name,
    siteId,
    siteName,
    severity,
    message:
      severity === 'danger'
        ? `위험 임계값(${threshVal}${unit}) 초과 — 즉시 점검 필요`
        : `주의 임계값(${threshVal}${unit}) 도달 — 모니터링 강화 필요`,
    value:          currentValue,
    threshold:      threshVal,
    unit,
    triggeredAt:    new Date().toISOString(),
    isAcknowledged: false,
  }
}

// ─── 중복 알람 체크 (같은 센서 + 같은 severity 미처리 존재 시 중복) ──────────
function isDuplicate(alarm: Alarm): boolean {
  return _alarms.some(
    a => a.sensorId === alarm.sensorId &&
         a.severity === alarm.severity &&
         !a.isAcknowledged
  )
}

// ─── 스토어 API ───────────────────────────────────────────────────────────────
export const sensorStore = {
  getSensors: () => _sensors,
  getAlarms:  () => _alarms,

  // ── 센서 추가 ──
  addSensor(sensor: UnifiedSensor) {
    _sensors = [..._sensors, sensor]
    notify()
  },

  // ── 센서 수정 (임계값 변경 → 상태 재평가 → 알람 자동 생성) ──
  updateSensor(updated: UnifiedSensor) {
    _sensors = _sensors.map(s => {
      if (s.id !== updated.id) return s
      const prevStatus = s.status
      const newStatus  =
        updated.status === 'offline'
          ? 'offline'
          : evaluateStatus(updated.currentValue, updated.threshold)
      const next = { ...updated, status: newStatus }

      // 상태가 악화된 경우에만 알람 생성
      const alarm = makeAlarm(next, prevStatus)
      if (alarm && !isDuplicate(alarm)) {
        _alarms = [alarm, ..._alarms]
      }
      return next
    })
    notify()
  },

  // ── 센서 삭제 ──
  deleteSensor(id: string) {
    _sensors = _sensors.filter(s => s.id !== id)
    notify()
  },

  // ── 센서 현재값 강제 업데이트 (시뮬레이션 또는 실시간 수신용) ──
  // value가 임계값을 넘으면 자동으로 알람을 발생시킵니다.
  pushReading(sensorId: string, value: number) {
    _sensors = _sensors.map(s => {
      if (s.id !== sensorId || s.status === 'offline') return s
      const prevStatus = s.status
      const newStatus  = evaluateStatus(value, s.threshold)
      const next = { ...s, currentValue: value, status: newStatus, lastUpdated: new Date().toISOString() }

      const alarm = makeAlarm(next, prevStatus)
      if (alarm && !isDuplicate(alarm)) {
        _alarms = [alarm, ..._alarms]
      }
      return next
    })
    notify()
  },

  // ── 알람 전체 교체 ──
  setAlarms(alarms: Alarm[]) {
    _alarms = alarms
    notify()
  },

  // ── 알람 추가 (외부에서 직접 주입) ──
  addAlarms(alarms: Alarm[]) {
    const fresh = alarms.filter(a => !isDuplicate(a))
    if (fresh.length === 0) return
    _alarms = [...fresh, ..._alarms]
    notify()
  },

  subscribe(fn: () => void) {
    _listeners.add(fn)
    return () => _listeners.delete(fn)
  },
}

// ─── React 훅 ─────────────────────────────────────────────────────────────────
export function useSensorStore() {
  const [sensors, setSensors] = useState<UnifiedSensor[]>(sensorStore.getSensors)
  const [alarms,  setAlarms]  = useState<Alarm[]>(sensorStore.getAlarms)

  useEffect(() => {
    return sensorStore.subscribe(() => {
      setSensors([...sensorStore.getSensors()])
      setAlarms([...sensorStore.getAlarms()])
    })
  }, [])

  return { sensors, alarms }
}