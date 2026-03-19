/**
 * sensor-simulator.ts
 *
 * 15분 주기로 센서 측정값을 자동 갱신하는 시뮬레이터입니다.
 * sensorStore.pushReading()을 호출하여 상태 재평가 + 알람 자동 생성을 트리거합니다.
 *
 * 사용법: startSimulator() / stopSimulator()
 * 앱 진입 시 한 번만 호출하면 됩니다.
 */
import { sensorStore } from '@/lib/sensor-store'

let _timer: ReturnType<typeof setInterval> | null = null

// 다음 측정값 생성 (현재값 ± 소폭 변동)
function nextValue(current: number, rangeRatio = 0.04): number {
  const delta = current * rangeRatio * (Math.random() * 2 - 1)
  return Math.max(0, Math.round((current + delta) * 100) / 100)
}

export function startSimulator(intervalMs = 15 * 60 * 1000) {
  if (_timer) return   // 이미 실행 중

  const tick = () => {
    const sensors = sensorStore.getSensors()
    sensors.forEach(sensor => {
      if (sensor.status === 'offline') return
      const newValue = nextValue(sensor.currentValue)
      sensorStore.pushReading(sensor.id, newValue)
    })
  }

  _timer = setInterval(tick, intervalMs)
  console.info(`[GeoMonitor] 센서 시뮬레이터 시작 — ${intervalMs / 60000}분 간격`)
}

export function stopSimulator() {
  if (_timer) {
    clearInterval(_timer)
    _timer = null
    console.info('[GeoMonitor] 센서 시뮬레이터 중지')
  }
}

/** 개발/테스트용: 즉시 1회 실행 */
export function tickOnce() {
  const sensors = sensorStore.getSensors()
  sensors.forEach(sensor => {
    if (sensor.status === 'offline') return
    // 테스트용: 일부 센서를 의도적으로 임계값 근처 값으로 변동
    const t = Math.random()
    const newValue = t < 0.1
      ? sensor.currentValue * 1.25   // 10% 확률로 급등 (알람 트리거 테스트)
      : nextValue(sensor.currentValue)
    sensorStore.pushReading(sensor.id, newValue)
  })
}
