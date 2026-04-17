import type { UnifiedSensor, Alarm, Site, DashboardStats, SensorReading, OperationSettings, FormulaParams, ManagementCriteria } from '@/types'


// ─── 신규 필드 기본값 ─────────────────────────────────────────────────────────
const defaultOperation: OperationSettings = {
  measureCycle: '01:00', actionAfterMeasure: '저장송신', actionBeforeMeasure: '자동',
}
const defaultFormulaParams: FormulaParams = {
  coeffA: '', coeffB: '', coeffC: '', coeffD: '', coeffE: '', coeffG: '',
  initVal: '', currentTemp: '', tempCoeff: '', initTemp: '', extRef: '',
}
const defaultCriteria: ManagementCriteria = {
  level1Upper: '', level1Lower: '', level2Upper: '', level2Lower: '',
  criteriaUnit: '', criteriaUnitName: '', noAlarm: false, noSms: false,
}

// ─── Readings 생성 헬퍼 ───────────────────────────────────────────────────────
function generateReadings(
  baseValue: number,
  count = 14,
  unit: string,
  trend: 'stable' | 'rising' | 'falling' = 'stable'
): SensorReading[] {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date()
    date.setHours(date.getHours() - (count - i) * 12)
    const trendOffset = trend === 'rising' ? i * 0.15 : trend === 'falling' ? -i * 0.1 : 0
    const noise = (Math.random() - 0.5) * 0.4
    const value = Math.round((baseValue + trendOffset + noise) * 10) / 10
    return { timestamp: date.toISOString(), value, unit, status: 'normal' }
  })
}

// ─── 통합 Mock 센서 데이터 ────────────────────────────────────────────────────
export const mockSensors: UnifiedSensor[] = [
  {
    id: 'GS-001', manageNo: 'MN-001', group: '' as const,
    operation: {...defaultOperation}, formulaParams: {...defaultFormulaParams}, criteria: {...defaultCriteria},
    // 센서 정의
    field: '사면', measureMethod: '경사계 A축', formula: '(A*X+B)',
    name: '경사계 A-1', nameEn: 'Inclinometer A-1', nameAbbr: 'INC-A1',
    unit: '°', unitName: '도(degree)', description: '1번 사면 경사 모니터링',
    combination: '', decimalPoint: '2', pointerInfo: '', remark: '',
    threshold: { normalMax: 4.9, warningMax: 7.9, dangerMin: 8.0 },
    // 설치 정보
    siteId: 'site-a', siteName: '현장 A (서울)',
    installDate: '2025-01-10',
    location: { lat: 37.5665, lng: 126.9780, description: '1번 사면 상단' },
    // 모니터링
    status: 'normal', currentValue: 2.3, batteryLevel: 87,
    lastUpdated: '2026-03-16T14:21:00Z',
    readings: generateReadings(2.3, 14, '°', 'stable'),
  },
  {
    id: 'GS-015', manageNo: 'MN-002', group: '' as const,
    operation: {...defaultOperation}, formulaParams: {...defaultFormulaParams}, criteria: {...defaultCriteria},
    field: '연약지반', measureMethod: 'VW A(450~1125Hz)(22222~8888*10e-7)', formula: '(A*10^9*(1/X^2-1/I^2))',
    name: '침하계 B-3', nameEn: 'Settlement Gauge B-3', nameAbbr: 'SET-B3',
    unit: 'mm', unitName: '밀리미터', description: '지하 2층 기둥 침하 계측',
    combination: '', decimalPoint: '1', pointerInfo: '', remark: '',
    threshold: { normalMax: 14.9, warningMax: 24.9, dangerMin: 25.0 },
    siteId: 'site-b', siteName: '현장 B (인천)',
    installDate: '2025-02-20',
    location: { lat: 37.4563, lng: 126.7052, description: '지하 2층 기둥 C-3' },
    status: 'warning', currentValue: 18.7, batteryLevel: 62,
    lastUpdated: '2026-03-16T14:18:00Z',
    readings: generateReadings(14.0, 14, 'mm', 'rising'),
  },
  {
    id: 'GS-022', manageNo: 'MN-003', group: '' as const,
    operation: {...defaultOperation}, formulaParams: {...defaultFormulaParams}, criteria: {...defaultCriteria},
    field: '흙막이', measureMethod: '전압(0~5V)', formula: '(A*X+B)',
    name: '균열계 B-5', nameEn: 'Crack Gauge B-5', nameAbbr: 'CRK-B5',
    unit: 'mm', unitName: '밀리미터', description: '외벽 E구역 균열 폭 모니터링',
    combination: '', decimalPoint: '2', pointerInfo: '', remark: '',
    threshold: { normalMax: 2.9, warningMax: 3.9, dangerMin: 4.0 },
    siteId: 'site-b', siteName: '현장 B (인천)',
    installDate: '2025-02-20',
    location: { lat: 37.4563, lng: 126.7052, description: '외벽 E구역' },
    status: 'danger', currentValue: 4.2, batteryLevel: 23,
    lastUpdated: '2026-03-16T14:23:00Z',
    readings: generateReadings(2.8, 14, 'mm', 'rising'),
  },
  {
    id: 'GS-008', manageNo: 'MN-004', group: '' as const,
    operation: {...defaultOperation}, formulaParams: {...defaultFormulaParams}, criteria: {...defaultCriteria},
    field: '공통', measureMethod: '전압(0~10V)', formula: '(A*X+B)',
    name: '지하수위계 A-2', nameEn: 'Groundwater Level A-2', nameAbbr: 'GWL-A2',
    unit: 'm', unitName: '미터', description: '관측정 #2 지하수위 모니터링',
    combination: '', decimalPoint: '2', pointerInfo: '', remark: '',
    threshold: { normalMax: 4.4, warningMax: 5.9, dangerMin: 6.0 },
    siteId: 'site-a', siteName: '현장 A (서울)',
    installDate: '2025-01-10',
    location: { lat: 37.5665, lng: 126.9780, description: '관측정 #2' },
    status: 'normal', currentValue: 3.1, batteryLevel: 91,
    lastUpdated: '2026-03-16T14:15:00Z',
    readings: generateReadings(3.1, 14, 'm', 'stable'),
  },
  {
    id: 'GS-031', manageNo: 'MN-005', group: '' as const,
    operation: {...defaultOperation}, formulaParams: {...defaultFormulaParams}, criteria: {...defaultCriteria},
    field: '교량', measureMethod: '전류(4~20mA)', formula: '(A*X+B)',
    name: '변위계 C-1', nameEn: 'Displacement Gauge C-1', nameAbbr: 'DSP-C1',
    unit: 'mm', unitName: '밀리미터', description: '교각 P-4 수평 변위 측정',
    combination: '', decimalPoint: '2', pointerInfo: '', remark: '',
    threshold: { normalMax: 4.9, warningMax: 9.9, dangerMin: 10.0 },
    siteId: 'site-c', siteName: '현장 C (부산)',
    installDate: '2025-03-01',
    location: { lat: 35.1796, lng: 129.0756, description: '교각 P-4' },
    status: 'normal', currentValue: 1.2, batteryLevel: 78,
    lastUpdated: '2026-03-16T14:10:00Z',
    readings: generateReadings(1.2, 14, 'mm', 'stable'),
  },
  {
    id: 'GS-044', manageNo: 'MN-006', group: '' as const,
    operation: {...defaultOperation}, formulaParams: {...defaultFormulaParams}, criteria: {...defaultCriteria},
    field: '터널', measureMethod: 'VW B(800~2000Hz)(12500~5000*10e-7)', formula: '(A*10^9*(1/X^2-1/I^2))',
    name: '응력계 D-2', nameEn: 'Stress Gauge D-2', nameAbbr: 'STR-D2',
    unit: 'kN/m²', unitName: '킬로뉴턴/제곱미터', description: '터널 단면 T-7 응력 측정',
    combination: '', decimalPoint: '1', pointerInfo: '', remark: '',
    threshold: { normalMax: 199, warningMax: 349, dangerMin: 350 },
    siteId: 'site-d', siteName: '현장 D (대구)',
    installDate: '2025-04-05',
    location: { lat: 35.8714, lng: 128.6014, description: '터널 단면 T-7' },
    status: 'offline', currentValue: 0, batteryLevel: 0,
    lastUpdated: '2026-03-15T08:00:00Z',
    readings: [],
  },
]

// ─── Mock Alarms ──────────────────────────────────────────────────────────────
export const mockAlarms: Alarm[] = [
  {
    id: 'ALM-001', sensorId: 'MN-003', sensorName: '균열계 B-5',
    siteId: 'site-b', siteName: '현장 B (인천)',
    severity: 'danger', message: '위험 임계값 초과 — 즉시 점검 필요',
    value: 4.2, threshold: 4.0, unit: 'mm',
    triggeredAt: '2026-03-16T14:23:00Z', isAcknowledged: false,
  },
  {
    id: 'ALM-002', sensorId: 'MN-002', sensorName: '침하계 B-3',
    siteId: 'site-b', siteName: '현장 B (인천)',
    severity: 'warning', message: '주의 임계값 도달 — 모니터링 강화 필요',
    value: 18.7, threshold: 15.0, unit: 'mm',
    triggeredAt: '2026-03-16T13:47:00Z', isAcknowledged: true, acknowledgedBy: '김관리자',
  },
  {
    id: 'ALM-003', sensorId: 'MN-004', sensorName: '지하수위계 A-2',
    siteId: 'site-a', siteName: '현장 A (서울)',
    severity: 'resolved', message: '주의 임계값 초과 후 정상 복구',
    value: 3.1, threshold: 4.5, unit: 'm',
    triggeredAt: '2026-03-16T09:15:00Z', resolvedAt: '2026-03-16T11:12:00Z',
    isAcknowledged: true, acknowledgedBy: '박엔지니어',
  },
  {
    id: 'ALM-004', sensorId: 'MN-006', sensorName: '응력계 D-2',
    siteId: 'site-d', siteName: '현장 D (대구)',
    severity: 'info', message: '센서 오프라인 — 통신 단절 확인 필요',
    value: 0, threshold: 0, unit: '',
    triggeredAt: '2026-03-16T08:00:00Z', isAcknowledged: false,
  },
]

// ─── Mock Sites ───────────────────────────────────────────────────────────────
export const mockSites: Site[] = [
  { id: 'site-a', name: '현장 A', location: '서울특별시 마포구', description: '한강변 도로 사면 안전 모니터링', totalSensors: 14, normalCount: 12, warningCount: 1, dangerCount: 0, offlineCount: 1, managers: ['이현장'], createdAt: '2025-01-05' },
  { id: 'site-b', name: '현장 B', location: '인천광역시 부평구', description: '지하 굴착 구조물 안전 계측', totalSensors: 18, normalCount: 13, warningCount: 3, dangerCount: 2, offlineCount: 0, managers: ['최관리자', '이현장'], createdAt: '2025-02-15' },
  { id: 'site-c', name: '현장 C', location: '부산광역시 해운대구', description: '교량 구조 안전성 모니터링', totalSensors: 10, normalCount: 10, warningCount: 0, dangerCount: 0, offlineCount: 0, managers: ['박엔지니어'], createdAt: '2025-03-01' },
  { id: 'site-d', name: '현장 D', location: '대구광역시 북구', description: '터널 굴착 계측 관리', totalSensors: 6, normalCount: 3, warningCount: 3, dangerCount: 1, offlineCount: 2, managers: ['김기술'], createdAt: '2025-04-01' },
]

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
export const dashboardStats: DashboardStats = {
  totalSensors: 48, normalCount: 38, warningCount: 7,
  dangerCount: 3, offlineCount: 3, activeAlarms: 4, resolvedToday: 2,
  sites: mockSites,
  recentAlarms: mockAlarms.slice(0, 5),
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function getSensorById(id: string): UnifiedSensor | undefined {
  return mockSensors.find(s => s.id === id)
}

// threshold에서 thresholdWarning / thresholdDanger 파생
export function getThresholds(sensor: UnifiedSensor) {
  return {
    thresholdWarning: sensor.threshold.normalMax  !== '' ? Number(sensor.threshold.normalMax)  : 0,
    thresholdDanger:  sensor.threshold.dangerMin  !== '' ? Number(sensor.threshold.dangerMin)  : 0,
  }
}

export function getReadingsByPeriod(
  sensor: UnifiedSensor,
  period: '24H' | '7D' | '30D'
): SensorReading[] {
  const configs = {
    '24H': { count: 24, intervalHours: 1  },
    '7D':  { count: 28, intervalHours: 6  },
    '30D': { count: 30, intervalHours: 24 },
  }
  const { count, intervalHours } = configs[period]
  const trend = sensor.status === 'danger' || sensor.status === 'warning' ? 'rising' : 'stable'
  const { thresholdWarning, thresholdDanger } = getThresholds(sensor)

  return Array.from({ length: count }, (_, i) => {
    const date = new Date()
    date.setHours(date.getHours() - (count - i) * intervalHours)
    const t = i / (count - 1)
    const trendOffset = trend === 'rising' ? t * sensor.currentValue * 0.3 : 0
    const noise = (Math.random() - 0.5) * sensor.currentValue * 0.08
    const base = Math.max(0, sensor.currentValue * 0.75)
    const value = Math.round((base + trendOffset + noise) * 10) / 10
    return {
      timestamp: date.toISOString(), value, unit: sensor.unit,
      status: value >= thresholdDanger ? 'danger' : value >= thresholdWarning ? 'warning' : 'normal',
    }
  })
}

export function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export function getRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '방금 전'
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  return `${Math.floor(hours / 24)}일 전`
}