'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { formatTimestamp, getRelativeTime, getThresholds } from '@/lib/mock-data'
import { sensorApi, userApi } from '@/lib/api'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SensorTrendChart } from '@/components/charts/SensorTrendChart'
import { QRModal } from '@/components/ui/QRModal'
import Link from 'next/link'
import type { SensorReading, UnifiedSensor } from '@/types'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import html2canvas from 'html2canvas'

// ─── 날짜 범위별 readings 생성 (15분 단위) ──────────────────────────────────
function getReadingsByRange(
  sensor: UnifiedSensor,
  dateFrom: string,
  dateTo: string
): SensorReading[] {
  const { thresholdWarning, thresholdDanger } = sensor ? getThresholds(sensor) : { thresholdWarning: 0, thresholdDanger: 0 }
  const from = new Date(dateFrom + 'T00:00:00')
  const to   = new Date(dateTo   + 'T23:59:59')
  if (from > to) return []

  const INTERVAL_MIN = 15   // 15분 간격
  const dayDiff = Math.min(
    Math.round((to.getTime() - from.getTime()) / 86400000) + 1,
    30  // 최대 30일 (30일 × 96포인트 = 2,880개)
  )
  const totalSlots = dayDiff * (24 * 60 / INTERVAL_MIN)  // 하루 96슬롯

  const readings: SensorReading[] = []
  for (let slot = 0; slot < totalSlots; slot++) {
    const date = new Date(from)
    date.setMinutes(from.getMinutes() + slot * INTERVAL_MIN, 0, 0)
    if (date > to) break

    const progress = slot / (totalSlots - 1 || 1)
    const trend =
      sensor.status === 'danger'  ? progress * sensor.currentValue * 0.20 :
      sensor.status === 'warning' ? progress * sensor.currentValue * 0.09 : 0
    const noise = (Math.random() - 0.5) * sensor.currentValue * 0.05
    const value = Math.max(0, Math.round((sensor.currentValue * 0.83 + trend + noise) * 100) / 100)

    readings.push({
      timestamp: date.toISOString(), value, unit: sensor.unit,
      status: value >= thresholdDanger ? 'danger' : value >= thresholdWarning ? 'warning' : 'normal',
    })
  }
  return readings
}

// 날짜 차이 계산 (일 수)
function dateDiffDays(from: string, to: string): number {
  const a = new Date(from + 'T00:00:00')
  const b = new Date(to   + 'T00:00:00')
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

// ─── 인쇄 설정 타입 ───────────────────────────────────────────────────────────
interface PrintConfig {
  title:       string
  range:       '현장총괄표' | '계측센서'
  dateFrom:    string
  dateTo:      string
  printedAt:   string
  outputScope: '모든 센서' | '지하수위계'
  interval:    string
  imgMargin:   string
  footer:      string
}

const INTERVAL_OPTIONS = [
  '모든데이터',
  '1시간 간격','2시간 간격','3시간 간격','4시간 간격',
  '5시간 간격','6시간 간격','12시간 간격','24시간 간격',
  '2일 간격','3일 간격','4일 간격','5일 간격','6일 간격','7일 간격',
]

// ─── 인쇄 모달 ────────────────────────────────────────────────────────────────
function PrintModal({ sensor, config, onChange, onPrint, onExcel, onPdf, onClose }: {
  sensor: UnifiedSensor; config: PrintConfig
  onChange: (c: PrintConfig) => void; onPrint: () => void
  onExcel: () => void; onPdf: () => void; onClose: () => void
}) {
  const set = (key: keyof PrintConfig, val: string) => onChange({ ...config, [key]: val })
  const inputCls = 'w-full rounded-lg border border-line bg-surface-subtle px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-brand/50 focus:ring-2 focus:ring-brand/10'
  const labelCls = 'mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="geo-card flex w-full max-w-xl animate-fade-in-up flex-col" style={{ maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-sm font-semibold text-ink">출력 설정</h2>
          <button onClick={onClose} className="rounded-md p-1 text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div>
            <label className={labelCls}>총괄표 타이틀</label>
            <input type="text" value={config.title} onChange={e => set('title', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>인쇄 범위</label>
            <div className="grid grid-cols-2 gap-2">
              {(['현장총괄표','계측센서'] as const).map(opt => (
                <button key={opt} type="button" onClick={() => set('range', opt)}
                  className={['rounded-lg border px-4 py-2.5 text-sm font-medium transition-all',
                    config.range === opt ? 'border-brand/40 bg-brand/10 text-brand' : 'border-line bg-surface-card text-ink-sub hover:border-line-strong hover:bg-surface-subtle'].join(' ')}>
                  {config.range === opt && <span className="mr-1.5">✓</span>}{opt}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>기간</label>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="mb-1 font-mono text-[10px] text-ink-muted">시작일</p>
                <input type="date" value={config.dateFrom} onChange={e => set('dateFrom', e.target.value)} className={inputCls} /></div>
              <div><p className="mb-1 font-mono text-[10px] text-ink-muted">종료일</p>
                <input type="date" value={config.dateTo} onChange={e => set('dateTo', e.target.value)} className={inputCls} /></div>
            </div>
          </div>
          <div>
            <label className={labelCls}>출력일시</label>
            <input type="datetime-local"
              value={config.printedAt}
              onChange={e => set('printedAt', e.target.value)}
              className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>출력범위</label>
            <div className="grid grid-cols-2 gap-2">
              {(['모든 센서','지하수위계'] as const).map(opt => (
                <button key={opt} type="button" onClick={() => set('outputScope', opt)}
                  className={['rounded-lg border px-4 py-2 text-sm font-medium transition-all',
                    config.outputScope === opt ? 'border-brand/40 bg-brand/10 text-brand' : 'border-line bg-surface-card text-ink-sub hover:border-line-strong hover:bg-surface-subtle'].join(' ')}>
                  {config.outputScope === opt && <span className="mr-1.5">✓</span>}{opt}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>출력대상</label>
            <select value={config.interval} onChange={e => set('interval', e.target.value)} className={inputCls}>
              {INTERVAL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>이미지 여백</label>
              <input type="number" step="0.01" value={config.imgMargin} onChange={e => set('imgMargin', e.target.value)} placeholder="0.10" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>바닥글 회사명</label>
              <input type="text" value={config.footer} onChange={e => set('footer', e.target.value)} placeholder="회사명" className={inputCls} />
            </div>
          </div>
          {/* 미리보기 */}
          <div className="rounded-xl border border-line bg-surface-subtle p-4">
            <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">미리보기</p>
            <div className="rounded-lg border border-line bg-surface-card p-4 text-xs">
              <div className="border-b border-line pb-3 text-center">
                <p className="text-base font-bold text-ink">{config.title || '(타이틀 없음)'}</p>
                <p className="mt-0.5 font-mono text-[10px] text-ink-muted">
                  {config.range} · {config.dateFrom || '—'} ~ {config.dateTo || '—'}
                </p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono text-[10px]">
                <span className="text-ink-muted">센서</span><span className="text-ink">{sensor.manageNo || sensor.id} · {sensor.name}</span>
                <span className="text-ink-muted">현장</span><span className="text-ink">{sensor.siteName}</span>
                <span className="text-ink-muted">출력범위</span><span className="text-ink">{config.outputScope}</span>
                <span className="text-ink-muted">출력대상</span><span className="text-ink">{config.interval}</span>
                <span className="text-ink-muted">출력일시</span><span className="text-ink">{config.printedAt || '—'}</span>
              </div>
              <div className="mt-3 border-t border-line pt-2 text-center font-mono text-[10px] text-ink-muted">
                {config.footer || '회사명'}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 border-t border-line px-6 py-4">
          <button onClick={onClose} className="flex-1 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-sub transition-colors hover:border-line-strong hover:text-ink">취소</button>
          <button onClick={onExcel} className="flex-1 rounded-lg bg-sensor-normal px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90">📊 엑셀</button>
          <button onClick={onPdf} className="flex-1 rounded-lg bg-sensor-warning px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90">📄 PDF</button>
          <button onClick={onPrint} className="flex-1 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover">🖨 인쇄</button>
        </div>
      </div>
    </div>
  )
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────
export default function SensorDetailPage() {
  const params = useParams()
  const id = Array.isArray(params.id) ? params.id[0] : params.id
  const [sensor, setSensor] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [measurements, setMeasurements] = useState<any[]>([])

  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    if (!id) return
    sensorApi.getById(Number(id)).then((data: any) => {
      // UnifiedSensor 형태로 변환
      setSensor({
        id: String(data.id),
        manageNo: data.manage_no || '',
        name: data.name,
        nameEn: '',
        nameAbbr: data.sensor_code,
        field: data.field || '공통',
        measureMethod: '해당없음',
        formula: data.formula || '(A*X+B)',
        group: '',
        unit: data.unit || '',
        unitName: '',
        description: data.location_desc || '',
        combination: '',
        decimalPoint: '2',
        pointerInfo: '',
        remark: '',
        threshold: {
          normalMax: data.threshold_normal_max ?? '',
          warningMax: data.threshold_warning_max ?? '',
          dangerMin: data.threshold_danger_min ?? '',
        },
        operation: { measureCycle: '01:00', actionAfterMeasure: '저장송신', actionBeforeMeasure: '자동' },
        formulaParams: { coeffA: '', coeffB: '', coeffC: '', coeffD: '', coeffE: '', initVal: '', currentTemp: '', tempCoeff: '', initTemp: '', extRef: '' },
        criteria: {
          level1Upper: data.level1_upper ?? '',
          level1Lower: data.level1_lower ?? '',
          level2Upper: data.level2_upper ?? '',
          level2Lower: data.level2_lower ?? '',
          criteriaUnit: data.criteria_unit ?? '',
          criteriaUnitName: data.criteria_unit_name ?? '',
          noAlarm: false,
          noSms: false,
        },
        siteId: data.site_code || '',
        siteName: data.site_name || '',
        installDate: data.install_date || '',
        location: { lat: 0, lng: 0, description: data.location_desc || '' },
        status: data.status || 'offline',
        currentValue: data.current_value ? parseFloat(data.current_value) : 0,
        batteryLevel: 100,
        lastUpdated: data.last_measured || new Date().toISOString(),
        site_managers: data.site_managers || '[]',
        readings: [],
      })
    }).catch(() => setSensor(null))
    .finally(() => setLoading(false))
  }, [id])

  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo,   setDateTo]   = useState(today)
  const [chartMode, setChartMode] = useState<'hourly' | 'daily'>('hourly')

  useEffect(() => {
    if (!id) return
    sensorApi.getMeasurements(Number(id), {
      from: dateFrom,
      to: dateTo,
      limit: 2000
    }).then((data: any[]) => {
      const mapped = data.map((m: any) => ({
        timestamp: m.measured_at,
        value: parseFloat(m.value),
        unit: sensor?.unit || '',
        status: 'normal',
      }))
      setMeasurements(mapped.reverse())
    }).catch(() => {})
  }, [id, sensor?.unit, dateFrom, dateTo])

  // 조회 기간 (시작일 ~ 종료일)
  const [qrOpen,   setQrOpen]   = useState(false)
  const [tablePage, setTablePage] = useState(1)
  const [remarks, setRemarks] = useState<Record<string, string>>({})
  const TABLE_PAGE_SIZE = 15
  const [printOpen, setPrintOpen] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<HTMLDivElement>(null)

  const [printConfig, setPrintConfig] = useState<PrintConfig>({
    title: '계측 모니터링 현황 보고서', range: '계측센서',
    dateFrom: dateFrom, dateTo: dateTo,
    printedAt: new Date().toISOString().slice(0, 16),
    outputScope: '모든 센서', interval: '모든데이터',
    imgMargin: '0.10', footer: '',
  })

  // 날짜/범위 바뀌면 테이블 첫 페이지로
  const isValidRange = !!sensor && dateFrom <= dateTo && dateTo <= today
  const dayCount = isValidRange ? dateDiffDays(dateFrom, dateTo) + 1 : 0
  const isToday  = dateFrom === today && dateTo === today

  const readings = measurements

  // 일별 데이터 (하루 마지막 측정값)
  const dailyReadings = useMemo(() => {
    const map = new Map<string, any>()
    measurements.forEach(m => {
      const date = new Date(m.timestamp).toLocaleDateString('ko-KR', {
        year: 'numeric', month: '2-digit', day: '2-digit'
      })
      if (!map.has(date)) map.set(date, m)
    })
    return Array.from(map.values())
  }, [measurements])

  // 일별 표 데이터 (경과일, 전측정대비, 초기치대비 계산)
  const dailyTableData = useMemo(() => {
    if (dailyReadings.length === 0) return []
    const firstValue = dailyReadings[0].value
    const firstDate = new Date(dailyReadings[0].timestamp)
    return dailyReadings.map((r, i) => {
      const currentDate = new Date(r.timestamp)
      const elapsed = Math.round((currentDate.getTime() - firstDate.getTime()) / 86400000)
      const prevValue = i > 0 ? dailyReadings[i - 1].value : r.value
      const dateKey = currentDate.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
      return {
        ...r,
        elapsed,
        prevDiff: parseFloat((r.value - prevValue).toFixed(2)),
        initDiff: parseFloat((r.value - firstValue).toFixed(2)),
        dateKey,
      }
    })
  }, [dailyReadings])

  const { thresholdWarning, thresholdDanger } = sensor ? getThresholds(sensor) : { thresholdWarning: 0, thresholdDanger: 0 }
  const overThreshold = sensor ? sensor.currentValue > thresholdDanger : false
  const nearThreshold = sensor ? sensor.currentValue > thresholdWarning : false
  const maxScale      = thresholdDanger * 1.5 || 100

  const valueColorClass =
    sensor?.status === 'danger'  ? 'text-sensor-danger'  :
    sensor?.status === 'warning' ? 'text-sensor-warning' :
    sensor?.status === 'offline' ? 'text-ink-muted'      :
    'text-sensor-normal'

  const handlePrint = () => { setPrintOpen(false); setTimeout(() => window.print(), 300) }

  const handleExcelDownload = () => {
    const data = dailyTableData.map(r => ({
      '측정일': new Date(r.timestamp).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }),
      '경과일': r.elapsed,
      [`지하수위 G.L(${sensor.unit})`]: r.value,
      '전측정대비': r.prevDiff,
      '초기치대비': r.initDiff,
      '비고': remarks[r.dateKey] || '',
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '측정데이터')
    XLSX.writeFile(wb, `${sensor.manageNo || sensor.name}_${dateFrom}_${dateTo}.xlsx`)
  }

  const handlePdfDownload = async () => {
    const doc = new jsPDF('p', 'mm', 'a4')
    const pageWidth = doc.internal.pageSize.getWidth()
  
    // 한글 폰트 로드
    const fontRes = await fetch('/NanumGothic.ttf')
    const fontBuffer = await fontRes.arrayBuffer()
    const uint8Array = new Uint8Array(fontBuffer)
    let binary = ''
    for (let i = 0; i < uint8Array.byteLength; i++) {
      binary += String.fromCharCode(uint8Array[i])
    }
    const fontBase64 = btoa(binary)
    doc.addFileToVFS('NanumGothic.ttf', fontBase64)
    doc.addFont('NanumGothic.ttf', 'NanumGothic', 'normal')
    doc.addFont('NanumGothic.ttf', 'NanumGothic', 'bold')
    doc.setFont('NanumGothic', 'normal')

    const managers = (() => {
      try {
        return JSON.parse((sensor as any).site_managers || '[]')
      } catch { return [] }
    })()

    let managerText = '—'
    if (managers.length > 0) {
      try {
        const users = await userApi.getList()
        managerText = managers.map((username: string) => {
          const user = users.find((u: any) => u.username === username)
          return user ? `${user.username} (${user.role})` : username
        }).join(', ')
      } catch {
        managerText = managers.join(', ')
      }
    }
  
    // 헤더
    doc.setFontSize(16)
    doc.text('Water Level Meter Report', pageWidth / 2, 20, { align: 'center' })
  
    // 센서 정보 테이블
    autoTable(doc, {
      startY: 28,
      head: [],
      body: [
        ['현장명', sensor.siteName || '—', '계측기 No.', sensor.manageNo || '—'],
        ['설치현황', sensor.installDate ? `설치일자 (${sensor.installDate.slice(0, 10)})` : '—', '초기측정일', dateFrom],
        ['관리자', managerText, '설치위치', sensor.location?.description || '—'],
      ],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2, font: 'NanumGothic' },
      columnStyles: {
        0: { fillColor: [240, 240, 240], cellWidth: 25 },
        1: { cellWidth: 65 },
        2: { fillColor: [240, 240, 240], cellWidth: 25 },
        3: { cellWidth: 65 },
      },
    })
  
    // 그래프를 jsPDF로 직접 그리기
    const currentY = (doc as any).lastAutoTable.finalY + 5
    const chartData = chartMode === 'hourly' ? measurements : dailyReadings
    if (chartData.length > 0) {
      const chartX = 15
      const chartY = currentY
      const chartW = pageWidth - 30
      const chartH = 50

      // 테두리
      doc.setDrawColor(180, 180, 180)
      doc.setLineWidth(0.3)
      doc.rect(chartX, chartY, chartW, chartH)

      // 데이터 포인트 계산
      const values = chartData.map((r: any) => parseFloat(r.value))
      const minVal = Math.min(...values)
      const maxVal = Math.max(...values)
      const padding = (maxVal - minVal) * 0.1 || 1
      const yMin = minVal - padding
      const yMax = maxVal + padding
      const range = yMax - yMin

      // 수평 그리드 라인 (4개)
      doc.setDrawColor(220, 220, 220)
      doc.setLineWidth(0.2)
      for (let g = 1; g <= 3; g++) {
        const gy = chartY + (chartH / 4) * g
        doc.line(chartX, gy, chartX + chartW, gy)
        const gVal = yMax - (range / 4) * g
        doc.setFontSize(5)
        doc.setTextColor(120, 120, 120)
        doc.text(gVal.toFixed(1), chartX - 1, gy + 1, { align: 'right' })
      }

      // y축 최대/최솟값
      doc.setFontSize(5)
      doc.setTextColor(120, 120, 120)
      doc.text(yMax.toFixed(1), chartX - 1, chartY + 2, { align: 'right' })
      doc.text(yMin.toFixed(1), chartX - 1, chartY + chartH + 1, { align: 'right' })

      // 1차 관리기준 빨간 점선 (임계값이 있을 때)
      const refVal = sensor.criteria?.level1Lower !== '' ? parseFloat(sensor.criteria.level1Lower)
        : sensor.criteria?.level1Upper !== '' ? parseFloat(sensor.criteria.level1Upper)
        : sensor.threshold?.dangerMin !== '' ? parseFloat(sensor.threshold.dangerMin)
        : null
      if (refVal !== null && refVal >= yMin && refVal <= yMax) {
        const refY = chartY + chartH - ((refVal - yMin) / range) * chartH
        doc.setDrawColor(255, 0, 0)
        doc.setLineWidth(0.4)
        const dashLen = 3
        const gapLen = 2
        let x = chartX
        while (x < chartX + chartW) {
          doc.line(x, refY, Math.min(x + dashLen, chartX + chartW), refY)
          x += dashLen + gapLen
        }
        doc.setFontSize(5)
        doc.setTextColor(255, 0, 0)
        doc.text('1차 관리기준', chartX + chartW - 1, refY - 1, { align: 'right' })
      }

      // 데이터 선 그래프
      doc.setDrawColor(34, 150, 100)
      doc.setLineWidth(0.5)
      doc.setTextColor(0, 0, 0)
      for (let i = 1; i < chartData.length; i++) {
        const x1 = chartX + ((i - 1) / (chartData.length - 1)) * chartW
        const x2 = chartX + (i / (chartData.length - 1)) * chartW
        const y1 = chartY + chartH - ((parseFloat(chartData[i-1].value) - yMin) / range) * chartH
        const y2 = chartY + chartH - ((parseFloat(chartData[i].value) - yMin) / range) * chartH
        doc.line(x1, y1, x2, y2)
      }

      // x축 날짜 라벨 (5개)
      doc.setFontSize(5)
      doc.setTextColor(120, 120, 120)
      const labelCount = Math.min(5, chartData.length)
      for (let l = 0; l < labelCount; l++) {
        const idx = Math.round((l / (labelCount - 1)) * (chartData.length - 1))
        const x = chartX + (idx / (chartData.length - 1)) * chartW
        const dateStr = new Date(chartData[idx].timestamp).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
        doc.text(dateStr, x, chartY + chartH + 4, { align: 'center' })
      }
      doc.setTextColor(0, 0, 0)
    }
  
    // 측정 데이터 테이블
    const tableStartY = currentY + 60
    autoTable(doc, {
      startY: tableStartY,
      head: [['측정일', '경과일', `지하수위 G.L(${sensor.unit})`, '전측정대비', '초기치대비', '비고']],
      body: dailyTableData.map(r => [
        new Date(r.timestamp).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }),
        r.elapsed,
        r.value,
        r.prevDiff > 0 ? `+${r.prevDiff}` : r.prevDiff,
        r.initDiff > 0 ? `+${r.initDiff}` : r.initDiff,
        remarks[r.dateKey] || '',
      ]),
      theme: 'grid',
      headStyles: { fillColor: [60, 80, 120], textColor: 255, fontSize: 8, font: 'NanumGothic', fontStyle: 'normal' },
      styles: { fontSize: 8, cellPadding: 2, font: 'NanumGothic' },
    })
  
    doc.save(`${sensor.manageNo || sensor.name}_${dateFrom}_${dateTo}.pdf`)
  }

  // 빠른 기간 선택
  const setPreset = (days: number) => {
    const from = new Date()
    from.setDate(from.getDate() - (days - 1))
    setDateFrom(from.toISOString().slice(0, 10))
    setDateTo(today)
    setTablePage(1)
  }

  if (loading) return (
    <div className="flex h-full items-center justify-center bg-surface-page">
      <p className="font-mono text-sm text-ink-muted">센서 정보 불러오는 중...</p>
    </div>
  )
  
  if (!sensor) return (
    <div className="flex h-full items-center justify-center bg-surface-page">
      <p className="font-mono text-sm text-ink-muted">센서를 찾을 수 없습니다.</p>
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto bg-surface-page">

      {/* 헤더 */}
      <div className="sticky top-0 z-10 border-b border-line bg-surface-card/90 px-6 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link href="/sensors" className="text-sm text-ink-muted transition-colors hover:text-ink">← 센서 목록</Link>
          <span className="text-line-strong">/</span>
          <h1 className="font-mono text-[15px] font-semibold text-ink">{sensor.manageNo || sensor.id}</h1>
          <span className="font-mono text-xs text-ink-muted">{sensor.name}</span>
          <StatusBadge status={sensor.status} />
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => { setPrintConfig(c => ({ ...c, dateFrom, dateTo })); setPrintOpen(true) }}
              className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-card px-3 py-1.5 font-mono text-xs text-ink-sub shadow-card transition-colors hover:border-brand/40 hover:bg-brand/10 hover:text-brand">
              🖨 출력
            </button>
            <button onClick={() => setQrOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-card px-3 py-1.5 font-mono text-xs text-ink-sub shadow-card transition-colors hover:border-brand/40 hover:bg-brand/10 hover:text-brand">
              ⊞ QR
            </button>
          </div>
        </div>

        {/* 날짜 범위 선택 바 */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {/* 빠른 선택 */}
          <div className="flex gap-1">
            {[
              { label: '오늘',  days: 1  },
              { label: '7일',   days: 7  },
              { label: '30일',  days: 30 },
              { label: '90일',  days: 90 },
            ].map(p => (
              <button key={p.label} onClick={() => setPreset(p.days)}
                className={[
                  'rounded-md px-2.5 py-1 font-mono text-[11px] font-medium transition-all border',
                  dateFrom === new Date(new Date().setDate(new Date().getDate() - p.days + 1)).toISOString().slice(0,10) && dateTo === today
                    ? 'border-brand/40 bg-brand/10 text-brand'
                    : 'border-line text-ink-muted hover:border-line-strong hover:text-ink-sub',
                ].join(' ')}>
                {p.label}
              </button>
            ))}
          </div>

          <span className="text-ink-muted">|</span>

          {/* 직접 날짜 입력 */}
          <div className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-card px-3 py-1 shadow-card">
            <span className="font-mono text-[10px] text-ink-muted">시작</span>
            <input type="date" value={dateFrom} max={today}
              onChange={e => { setDateFrom(e.target.value); setTablePage(1) }}
              className="font-mono text-xs text-ink outline-none bg-transparent" />
          </div>
          <span className="font-mono text-xs text-ink-muted">~</span>
          <div className={[
            'flex items-center gap-1.5 rounded-lg border px-3 py-1 shadow-card',
            !isValidRange ? 'border-sensor-dangerborder bg-sensor-dangerbg' : 'border-line bg-surface-card',
          ].join(' ')}>
            <span className="font-mono text-[10px] text-ink-muted">종료</span>
            <input type="date" value={dateTo} min={dateFrom} max={today}
              onChange={e => { setDateTo(e.target.value); setTablePage(1) }}
              className="font-mono text-xs text-ink outline-none bg-transparent" />
          </div>

          {/* 범위 요약 */}
          {isValidRange && (
            <span className="rounded-full border border-line bg-surface-subtle px-2.5 py-1 font-mono text-[11px] text-ink-muted">
              {dayCount}일 · {readings.length}개 포인트
            </span>
          )}
          {!isValidRange && (
            <span className="font-mono text-[11px] text-sensor-dangertext">종료일이 시작일보다 앞설 수 없습니다.</span>
          )}
        </div>
      </div>

      <div ref={printRef} style={{ display: 'none' }} />

      <div className="space-y-5 p-6">

        {/* 상태 배너 */}
        {sensor.status === 'danger' && (
          <div className="rounded-xl border border-sensor-dangerborder bg-sensor-dangerbg px-5 py-4 danger-flash">
            <p className="flex items-center gap-2 font-semibold text-sensor-dangertext">
              <span className="pulse-danger" />위험 — 임계값 초과 감지
            </p>
            <p className="mt-1 text-sm text-sensor-dangertext/80">
              현재값 <strong>{sensor.currentValue} {sensor.unit}</strong>이(가) 위험 임계값
              <strong> {thresholdDanger} {sensor.unit}</strong>을 초과하였습니다. 즉시 현장 점검을 실시하세요.
            </p>
          </div>
        )}
        {sensor.status === 'warning' && (
          <div className="rounded-xl border border-sensor-warningborder bg-sensor-warningbg px-5 py-4">
            <p className="flex items-center gap-2 font-semibold text-sensor-warningtext">⚠ 주의 — 모니터링 강화 필요</p>
            <p className="mt-1 text-sm text-sensor-warningtext/80">
              현재값 <strong>{sensor.currentValue} {sensor.unit}</strong>이(가) 주의 임계값에 도달했습니다.
            </p>
          </div>
        )}

        {/* 정보 그리드 */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* 센서 정보 */}
          <div className="geo-card p-5">
            <h2 className="mb-4 text-sm font-semibold text-ink">센서 정보</h2>
            <dl className="space-y-3 text-sm">
              {[
                { label: '관리번호',     value: sensor.manageNo    || '—' },
                { label: '센서명',       value: sensor.name },
                { label: '영문명',       value: sensor.nameEn      || '—' },
                { label: '약어',         value: sensor.nameAbbr    || '—' },
                { label: '관련분야',     value: sensor.field },
                { label: '구간-그룹',    value: sensor.group       || '없음' },
                { label: '측정방법',     value: sensor.measureMethod },
                { label: '계산식',       value: sensor.formula },
                { label: '현장',         value: sensor.siteName },
                { label: '설치 위치',    value: sensor.location.description || '—' },
                { label: '설치일',       value: sensor.installDate || '—' },
                { label: '측정단위',     value: sensor.unit ? `${sensor.unit} (${sensor.unitName || '—'})` : '—' },
                { label: '측정주기',     value: sensor.operation?.measureCycle || '—' },
                { label: '측정 후 동작', value: sensor.operation?.actionAfterMeasure || '—' },
                { label: '측정 전 동작', value: sensor.operation?.actionBeforeMeasure || '—' },
                { label: '1차 상한',     value: sensor.criteria?.level1Upper ? `${sensor.criteria.level1Upper} ${sensor.criteria.criteriaUnit}` : '—' },
                { label: '1차 하한',     value: sensor.criteria?.level1Lower ? `${sensor.criteria.level1Lower} ${sensor.criteria.criteriaUnit}` : '—' },
                { label: '2차 상한',     value: sensor.criteria?.level2Upper ? `${sensor.criteria.level2Upper} ${sensor.criteria.criteriaUnit}` : '—' },
                { label: '2차 하한',     value: sensor.criteria?.level2Lower ? `${sensor.criteria.level2Lower} ${sensor.criteria.criteriaUnit}` : '—' },
                { label: '마지막 수신',  value: `${formatTimestamp(sensor.lastUpdated)} (${getRelativeTime(sensor.lastUpdated)})` },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-3">
                  <dt className="w-28 shrink-0 font-mono text-xs text-ink-muted">{item.label}</dt>
                  <dd className="font-medium text-ink break-all">{item.value}</dd>
                </div>
              ))}
              {(sensor.criteria?.noAlarm || sensor.criteria?.noSms) && (
                <div className="flex gap-2 pt-1">
                  {sensor.criteria.noAlarm && <span className="rounded-full border border-sensor-warningborder bg-sensor-warningbg px-2.5 py-0.5 font-mono text-[11px] text-sensor-warningtext">알람 미적용</span>}
                  {sensor.criteria.noSms   && <span className="rounded-full border border-alarm-infoborder   bg-alarm-infobg   px-2.5 py-0.5 font-mono text-[11px] text-alarm-infotext">No SMS</span>}
                </div>
              )}
            </dl>
          </div>

          {/* 계측 현황 */}
          <div className="geo-card p-5">
            <h2 className="mb-4 text-sm font-semibold text-ink">계측 현황</h2>
            <div className="mb-5 rounded-xl border border-line bg-surface-subtle py-5 text-center">
              <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">
                {isToday ? '현재 측정값' : `${dateFrom} ~ ${dateTo} 기준`}
              </p>
              <p className={`mt-1 font-mono text-5xl font-light leading-none tracking-tight ${valueColorClass}`}>
                {sensor.status === 'offline' ? '—' : sensor.currentValue}
                <span className="ml-2 text-xl font-normal text-ink-muted">{sensor.unit}</span>
              </p>
            </div>
            {sensor.status !== 'offline' && (
              <div className="space-y-2">
                <div className="flex justify-between font-mono text-[10px] text-ink-muted">
                  <span>0 {sensor.unit}</span><span>{maxScale} {sensor.unit}</span>
                </div>
                <div className="relative h-4 overflow-hidden rounded-full bg-surface-muted">
                  <div className="absolute top-0 h-full bg-sensor-warning/20"
                    style={{ left: `${(thresholdWarning/maxScale)*100}%`, width: `${((thresholdDanger-thresholdWarning)/maxScale)*100}%` }} />
                  <div className="absolute top-0 h-full bg-sensor-danger/20"
                    style={{ left: `${(thresholdDanger/maxScale)*100}%`, right: 0 }} />
                  <div className={['absolute top-0 h-full w-1 rounded-full shadow-sm transition-all duration-500',
                    overThreshold ? 'bg-sensor-danger' : nearThreshold ? 'bg-sensor-warning' : 'bg-sensor-normal'].join(' ')}
                    style={{ left: `${Math.min((sensor.currentValue/maxScale)*100, 97)}%` }} />
                </div>
                <div className="flex justify-between font-mono text-[10px]">
                  <span className="text-sensor-warningtext">주의: {thresholdWarning} {sensor.unit}</span>
                  <span className="text-sensor-dangertext">위험: {thresholdDanger} {sensor.unit}</span>
                </div>
              </div>
            )}

            {/* 기간 통계 */}
            {measurements.length > 0 && sensor.status !== 'offline' && (
              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4">
                {[
                  { label: '최솟값', value: Math.min(...measurements.map((r: any) => parseFloat(r.value))).toFixed(1), color: 'text-sensor-normal' },
                  { label: '평균값', value: (measurements.reduce((s: number, r: any) => s + parseFloat(r.value), 0) / measurements.length).toFixed(1), color: 'text-ink' },
                  { label: '최댓값', value: Math.max(...measurements.map((r: any) => parseFloat(r.value))).toFixed(1),
                    color: sensor.status === 'danger' ? 'text-sensor-danger' : sensor.status === 'warning' ? 'text-sensor-warning' : 'text-ink' },
                ].map(stat => (
                  <div key={stat.label} className="rounded-lg bg-surface-subtle px-3 py-2.5 text-center">
                    <p className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">{stat.label}</p>
                    <p className={`mt-1 font-mono text-lg font-medium ${stat.color}`}>
                      {stat.value}<span className="ml-1 text-xs font-normal text-ink-muted">{sensor.unit}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 트렌드 차트 */}
        <div className="geo-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-ink">
                {chartMode === 'hourly' ? '시간별' : '일별'} 트렌드
                {isToday ? ' — 오늘' : ` — ${dateFrom} ~ ${dateTo}`}
              </h2>
              <p className="mt-0.5 font-mono text-[10px] text-ink-muted">
                {isValidRange
                  ? `${dayCount}일 · ${chartMode === 'hourly' ? readings.length : dailyReadings.length}개 포인트`
                  : '날짜 범위를 확인해 주세요.'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-1 rounded-lg border border-line bg-surface-subtle p-1">
                {(['hourly', 'daily'] as const).map(mode => (
                  <button key={mode} onClick={() => setChartMode(mode)}
                    className={['rounded-md px-3 py-1 font-mono text-[11px] font-medium transition-all',
                      chartMode === mode ? 'bg-surface-card text-brand shadow-card' : 'text-ink-muted hover:text-ink-sub'].join(' ')}>
                    {mode === 'hourly' ? '시간별' : '일별'}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const diff = dateDiffDays(dateFrom, dateTo)
                    const newTo   = new Date(dateFrom); newTo.setDate(newTo.getDate() - 1)
                    const newFrom = new Date(newTo);    newFrom.setDate(newFrom.getDate() - diff)
                    setDateFrom(newFrom.toISOString().slice(0, 10))
                    setDateTo(newTo.toISOString().slice(0, 10))
                  }}
                  className="rounded-md px-2.5 py-1.5 font-mono text-xs text-ink-muted border border-line transition-colors hover:bg-surface-subtle hover:text-ink">
                  ← 이전
                </button>
                <button
                  disabled={dateTo >= today}
                  onClick={() => {
                    const diff = dateDiffDays(dateFrom, dateTo)
                    const newFrom = new Date(dateTo); newFrom.setDate(newFrom.getDate() + 1)
                    const newTo   = new Date(newFrom); newTo.setDate(newTo.getDate() + diff)
                    const capTo = newTo.toISOString().slice(0, 10) > today ? today : newTo.toISOString().slice(0, 10)
                    setDateFrom(newFrom.toISOString().slice(0, 10))
                    setDateTo(capTo)
                  }}
                  className="rounded-md px-2.5 py-1.5 font-mono text-xs text-ink-muted border border-line transition-colors hover:bg-surface-subtle hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed">
                  다음 →
                </button>
              </div>
            </div>
          </div>

          {(chartMode === 'hourly' ? measurements : dailyReadings).length > 0 ? (
            <div key={`${dateFrom}-${dateTo}-${chartMode}`} className="animate-fade-in-up" ref={chartRef}>
              {/* depth_label 각주 - 80053 센서만 */}
              {sensor.nameAbbr === '80053' && (
                <p className="mb-2 font-mono text-[10px] text-ink-muted">
                  ※ depth_label 1번 기준 데이터입니다.
                </p>
              )}
              <SensorTrendChart sensor={sensor} readings={chartMode === 'hourly' ? measurements : dailyReadings} />
            </div>
          ) : (
            <div className="flex h-[220px] items-center justify-center rounded-xl bg-surface-subtle">
              <p className="font-mono text-sm text-ink-muted">
                {!isValidRange ? '날짜 범위가 올바르지 않습니다.' : '데이터가 없습니다.'}
              </p>
            </div>
          )}
        </div>

        {/* 측정 데이터 테이블 (페이지네이션) */}
        {(() => {
          const tableData = chartMode === 'hourly' ? measurements : dailyTableData
          const totalPages = Math.max(1, Math.ceil(tableData.length / TABLE_PAGE_SIZE))
          const safePage = Math.min(tablePage, totalPages)
          const pageData = tableData.slice((safePage - 1) * TABLE_PAGE_SIZE, safePage * TABLE_PAGE_SIZE)
          return (
            <div className="geo-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <div>
                  <h2 className="text-sm font-semibold text-ink">측정 데이터</h2>
                  <p className="font-mono text-[10px] text-ink-muted">
                    {isValidRange
                      ? `${dateFrom} ~ ${dateTo} · 전체 ${tableData.length}건 · ${TABLE_PAGE_SIZE}건씩 표시`
                      : '날짜 범위를 확인해 주세요.'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1 rounded-lg border border-line bg-surface-subtle p-1">
                    {(['hourly', 'daily'] as const).map(mode => (
                      <button key={mode} onClick={() => { setChartMode(mode); setTablePage(1) }}
                        className={['rounded-md px-3 py-1 font-mono text-[11px] font-medium transition-all',
                          chartMode === mode ? 'bg-surface-card text-brand shadow-card' : 'text-ink-muted hover:text-ink-sub'].join(' ')}>
                        {mode === 'hourly' ? '시간별' : '일별'}
                      </button>
                    ))}
                  </div>
                  {tableData.length > TABLE_PAGE_SIZE && (
                    <div className="flex items-center gap-2">
                      <button
                        disabled={safePage <= 1}
                        onClick={() => setTablePage(p => Math.max(1, p - 1))}
                        className="rounded-md border border-line px-2.5 py-1 font-mono text-xs text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed">
                        ←
                      </button>
                      <span className="font-mono text-xs text-ink-muted">
                        <span className="font-semibold text-ink">{safePage}</span> / {totalPages}
                      </span>
                      <button
                        disabled={safePage >= totalPages}
                        onClick={() => setTablePage(p => Math.min(totalPages, p + 1))}
                        className="rounded-md border border-line px-2.5 py-1 font-mono text-xs text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed">
                        →
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* 초기값 각주 - 일별 모드일 때만 */}
              {chartMode === 'daily' && (
                <p className="px-5 pt-3 font-mono text-[10px] text-ink-muted">
                  ※ 초기값은 첫 번째 측정값 기준입니다.
                </p>
              )}

              <div className="overflow-x-auto">
                {tableData.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line bg-surface-subtle">
                      {chartMode === 'hourly'
                        ? ['날짜', '시각', '측정값', '상태'].map(h => (
                            <th key={h} className="px-4 py-2.5 text-left font-mono text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{h}</th>
                          ))
                        : ['측정일', '경과일', `지하수위 G.L(${sensor.unit})`, '전측정대비', '초기치대비', '비고'].map(h => (
                            <th key={h} className="px-4 py-2.5 text-left font-mono text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{h}</th>
                          ))
                      }
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {pageData.map((r, i) => {
                        const dt = new Date(r.timestamp)
                        const rowCls =
                          r.status === 'danger'  ? 'bg-sensor-dangerbg/30'  :
                          r.status === 'warning' ? 'bg-sensor-warningbg/30' : ''
                          return (
                            <tr key={i} className={`transition-colors hover:bg-surface-subtle ${rowCls}`}>
                              {chartMode === 'hourly' ? (
                                <>
                                  <td className="px-4 py-2 font-mono text-xs text-ink-muted">
                                    {dt.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}
                                  </td>
                                  <td className="px-4 py-2 font-mono text-xs text-ink-muted">
                                    {dt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                                  </td>
                                  <td className={`px-4 py-2 font-mono text-sm font-medium ${
                                    r.status === 'danger' ? 'text-sensor-danger' :
                                    r.status === 'warning' ? 'text-sensor-warning' : 'text-ink'}`}>
                                    {r.value} {sensor.unit}
                                  </td>
                                  <td className="px-4 py-2">
                                    <StatusBadge status={r.status} size="sm" />
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-4 py-2 font-mono text-xs text-ink-muted">
                                    {dt.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                                  </td>
                                  <td className="px-4 py-2 font-mono text-xs text-ink-muted text-center">
                                    {r.elapsed}
                                  </td>
                                  <td className={`px-4 py-2 font-mono text-sm font-medium ${
                                    r.status === 'danger' ? 'text-sensor-danger' :
                                    r.status === 'warning' ? 'text-sensor-warning' : 'text-ink'}`}>
                                    {r.value}
                                  </td>
                                  <td className={`px-4 py-2 font-mono text-xs ${r.prevDiff > 0 ? 'text-sensor-danger' : r.prevDiff < 0 ? 'text-sensor-normal' : 'text-ink-muted'}`}>
                                    {r.prevDiff > 0 ? '+' : ''}{r.prevDiff}
                                  </td>
                                  <td className={`px-4 py-2 font-mono text-xs ${r.initDiff > 0 ? 'text-sensor-danger' : r.initDiff < 0 ? 'text-sensor-normal' : 'text-ink-muted'}`}>
                                    {r.initDiff > 0 ? '+' : ''}{r.initDiff}
                                  </td>
                                  <td className="px-4 py-2">
                                    <input
                                      type="text"
                                      value={remarks[r.dateKey] || ''}
                                      onChange={e => setRemarks(prev => ({ ...prev, [r.dateKey]: e.target.value }))}
                                      placeholder="비고 입력"
                                      className="w-full rounded border border-line bg-transparent px-2 py-1 font-mono text-xs text-ink outline-none focus:border-brand/50"
                                    />
                                  </td>
                                </>
                              )}
                            </tr>
                          )
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-10 text-center font-mono text-sm text-ink-muted">
                    {!isValidRange ? '날짜 범위가 올바르지 않습니다.' : '데이터가 없습니다.'}
                  </div>
                )}
              </div>

              {isValidRange && totalPages > 1 && totalPages <= 10 && (
                <div className="flex items-center justify-center gap-1.5 border-t border-line py-3">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => setTablePage(p)}
                      className={[
                        'h-2 rounded-full transition-all duration-200',
                        p === safePage ? 'w-5 bg-brand' : 'w-2 bg-line-strong hover:bg-ink-muted',
                      ].join(' ')} />
                  ))}
                </div>
              )}
            </div>
          )
        })()}
      </div>

      {printOpen && (
        <PrintModal sensor={sensor} config={printConfig} onChange={setPrintConfig}
          onPrint={handlePrint} onExcel={() => { setPrintOpen(false); handleExcelDownload() }}
          onPdf={() => { setPrintOpen(false); handlePdfDownload() }}
          onClose={() => setPrintOpen(false)} />
      )}
      {qrOpen && <QRModal sensorId={sensor.id} onClose={() => setQrOpen(false)} />}
    </div>
  )
}
