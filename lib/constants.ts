import type { SensorField, MeasureMethod, SensorGroup, ActionAfterMeasure, ActionBeforeMeasure } from '@/types'

export const FIELDS: SensorField[] = ['공통','터널','연약지반','흙막이','교량','항만','사면']

export const MEASURE_METHODS: MeasureMethod[] = [
  '해당없음','전류(4~20mA)','저항(온도)',
  '전압(0~5V)','전압(0~10V)','전압(+-5V)','전압(+-10V)',
  '경사계 A축','경사계 B축',
  'VW A(450~1125Hz)(22222~8888*10e-7)','VW B(800~2000Hz)(12500~5000*10e-7)',
  'VW C(1400~3500Hz)(7143~2857*10e-7)','VW D(2300~6000Hz)(4347~1666*10e-7)',
  'PT100','RTD',
]

export const GROUPS: { value: SensorGroup; label: string }[] = [
  { value: '', label: '없음' },
  { value: '자동화모니터링 계측시스템-가시설 지하수위 계측(관리용)',   label: '지하수위 계측(관리용)'   },
  { value: '자동화모니터링 계측시스템-가시설 지하수위 계측(보고서용)', label: '지하수위 계측(보고서용)' },
]

export const ACTION_AFTER: ActionAfterMeasure[] = ['저장','송신','저장송신']

export const ACTION_BEFORE: ActionBeforeMeasure[] = [
  '자동','1초 대기 후 동작','2초 대기 후 동작','3초 대기 후 동작',
  '4초 대기 후 동작','5초 대기 후 동작','예비 1','예비 2','예비 3','예비 4',
]
