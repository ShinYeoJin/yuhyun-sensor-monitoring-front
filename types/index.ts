// ─── 공통 ─────────────────────────────────────────────────────────────────────
export type SensorStatus = 'normal' | 'warning' | 'danger' | 'offline'

// ─── 선택 항목 타입 ───────────────────────────────────────────────────────────
export type SensorField =
  | '공통' | '터널' | '연약지반' | '흙막이' | '교량' | '항만' | '사면'

export type MeasureMethod =
  | '해당없음' | '전류(4~20mA)' | '저항(온도)'
  | '전압(0~5V)' | '전압(0~10V)' | '전압(+-5V)' | '전압(+-10V)'
  | '경사계 A축' | '경사계 B축'
  | 'VW A(450~1125Hz)(22222~8888*10e-7)'
  | 'VW B(800~2000Hz)(12500~5000*10e-7)'
  | 'VW C(1400~3500Hz)(7143~2857*10e-7)'
  | 'VW D(2300~6000Hz)(4347~1666*10e-7)'
  | 'PT100' | 'RTD'

export type Formula = string
  

// ─── 임계값 ───────────────────────────────────────────────────────────────────
export interface ThresholdRange {
  normalMax:  number | ''   // 이하 → 정상
  warningMax: number | ''   // 초과~이하 → 주의
  dangerMin:  number | ''   // 이상 → 위험
}

// ─── 통합 센서 (UnifiedSensor) ────────────────────────────────────────────────
// 기존 Sensor + SensorDefinition을 하나로 통합
// 추가/편집 모달에서 입력한 내용이 센서 상세 페이지에 그대로 표시됩니다.
// ─── 동작 설정 ───────────────────────────────────────────────────────────────
export type ActionAfterMeasure  = '저장' | '송신' | '저장송신'
export type ActionBeforeMeasure =
  | '자동' | '1초 대기 후 동작' | '2초 대기 후 동작' | '3초 대기 후 동작'
  | '4초 대기 후 동작' | '5초 대기 후 동작'
  | '예비 1' | '예비 2' | '예비 3' | '예비 4'

export interface OperationSettings {
  measureCycle:        string               // 측정주기 예) 01:00
  actionAfterMeasure:  ActionAfterMeasure
  actionBeforeMeasure: ActionBeforeMeasure
}

// ─── 수식 및 파라미터 ─────────────────────────────────────────────────────────
export interface FormulaParams {
  coeffA:     string   // A계수
  coeffB:     string   // B계수
  coeffC:     string   // C계수
  coeffD:     string   // D계수
  coeffE:     string   // E계수
  coeffG:     string   // G계수 (Linear)
  initVal:    string   // 초기값(I)
  currentTemp: string  // 현재 온도(Tc)
  tempCoeff:  string   // 온도계수(Tco)
  initTemp:   string   // 초기온도(Ti)
  extRef:     string   // 외부참조(R)
}

// ─── 관리 기준 ────────────────────────────────────────────────────────────────
export interface ManagementCriteria {
  level1Upper:  string   // 1차 관리 기준 상한값
  level1Lower:  string   // 1차 관리 기준 하한값
  level2Upper:  string   // 2차 관리 기준 상한값
  level2Lower:  string   // 2차 관리 기준 하한값
  criteriaUnit: string   // 단위
  criteriaUnitName: string // 단위명
  noAlarm:      boolean  // 알람 미적용
  noSms:        boolean  // No SMS
}

// ─── 구간-그룹 ────────────────────────────────────────────────────────────────
export type SensorGroup =
  | '자동화모니터링 계측시스템-가시설 지하수위 계측(관리용)'
  | '자동화모니터링 계측시스템-가시설 지하수위 계측(보고서용)'
  | ''

export interface UnifiedSensor {
  // ── 식별 ──
  id:            string
  manageNo:      string   // 관리번호 (화면 표시용)
  // ── 센서 정의 (선택 항목) ──
  field:         SensorField
  measureMethod: MeasureMethod
  formula:       Formula
  group:         SensorGroup   // 구간-그룹
  // ── 센서 정의 (직접 입력) ──
  name:          string
  nameEn:        string
  nameAbbr:      string
  unit:          string
  unitName:      string
  description:   string
  combination:   string
  decimalPoint:  string
  pointerInfo:   string
  remark:        string
  // ── 임계값 ──
  threshold:     ThresholdRange
  // ── 동작 설정 ──
  operation:     OperationSettings
  // ── 수식 및 파라미터 ──
  formulaParams: FormulaParams
  formulaId?:          number | null
  selectedExpression?: string
  useDepthParams?:     boolean
  initValMode?:        'auto' | 'manual'
  depthParams?:        Record<string, Record<string, string>>
  previewRaw?:         string
  previewResult?:      number | null
  // ── 관리 기준 ──
  criteria:      ManagementCriteria
  // ── 설치 정보 ──
  siteId:        string
  siteName:      string
  installDate:   string
  location: {
    lat:         number
    lng:         number
    description: string
  }
  // ── 모니터링 실시간 데이터 ──
  status:        SensorStatus
  currentValue:  number
  batteryLevel:  number
  lastUpdated:   string
  readings:      SensorReading[]

  customExpression?: string
}

// ─── 하위 호환 alias (기존 코드가 Sensor 타입을 참조하는 곳이 많으므로) ────────
export type Sensor           = UnifiedSensor
export type SensorDefinition = UnifiedSensor

// thresholdWarning / thresholdDanger 는 threshold에서 파생
// 기존 코드와의 호환을 위해 유틸 함수를 sensor-store에서 제공

// ─── SensorReading ────────────────────────────────────────────────────────────
export interface SensorReading {
  timestamp: string
  value:     number
  unit:      string
  status:    SensorStatus
}

// ─── Alarm ────────────────────────────────────────────────────────────────────
export type AlarmSeverity = 'danger' | 'warning' | 'info' | 'resolved'

export interface Alarm {
  id:              string
  sensorId:        string
  sensorName:      string
  siteId:          string
  siteName:        string
  severity:        AlarmSeverity
  message:         string
  value:           number
  threshold:       number
  unit:            string
  triggeredAt:     string
  resolvedAt?:     string
  acknowledgedBy?: string
  isAcknowledged:  boolean
}

// ─── Site ─────────────────────────────────────────────────────────────────────
export interface Site {
  id:           string
  name:         string
  location:     string
  description:  string
  totalSensors: number
  normalCount:  number
  warningCount: number
  dangerCount:  number
  offlineCount: number
  managers:     string[]   // 담당자 (복수)
  createdAt:    string
}

// ─── User ─────────────────────────────────────────────────────────────────────
export type UserRole =
  | 'Administrator'
  | 'Manager'
  | 'Operator'
  | 'Monitor'
  | 'MultiMonitor'

export type UserStatus = 'active' | 'inactive' | 'deleted'

export interface User {
  id:          string
  userId:      string        // 사용자 ID (로그인용)
  name:        string        // 사용자명 *
  password:    string        // 비밀번호
  role:        UserRole      // 사용자 권한
  phone:       string        // 핸드폰번호 *
  registeredBy: string       // 등록자
  registeredAt: string       // 등록일시 (ISO)
  siteIds:     string[]      // 담당 현장
  status:      UserStatus    // active | inactive | deleted
  lastLogin:   string
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export interface DashboardStats {
  totalSensors:  number
  normalCount:   number
  warningCount:  number
  dangerCount:   number
  offlineCount:  number
  activeAlarms:  number
  resolvedToday: number
  sites:         Site[]
  recentAlarms:  Alarm[]
}